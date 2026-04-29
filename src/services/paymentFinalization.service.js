const fs = require("fs");
const path = require("path");
const { donationModle } = require("../models/donation.model");
const receiptService = require("./receipt.service");
const whatsappService = require("./whatsapp.service");
const externalDonationService = require("./externalDonation.service");
const metaConversionService = require("./metaConversion.service");

function getReceiptFilePath(donation) {
  const safeName = String(donation.name || "Donor").replace(/\s+/g, "_");
  return path.join(__dirname, "../../receipts", `Donation_Receipt_${safeName}.pdf`);
}

function normalizePhone(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("91") ? digits : `91${digits}`;
}

function normalizeSevaName(donation) {
  const raw = String(donation.type || donation.sevaName || "").trim();
  const normalized = raw.toLowerCase();

  if (normalized.includes("gau") || normalized.includes("go seva") || normalized.includes("cow")) {
    return "Gau Seva";
  }

  if (
    normalized.includes("annadaan") ||
    normalized.includes("annadan") ||
    normalized.includes("annadana") ||
    normalized.includes("annadanam") ||
    normalized.includes("meal") ||
    normalized.includes("feed")
  ) {
    return "Annadaan Seva";
  }

  return raw || "Donation";
}

function paymentAmountMatchesDonation(payment, donation) {
  const paymentAmount = Number(payment?.amount || 0);
  const donationAmount = Number(donation?.amount || 0) * 100;

  return paymentAmount > 0 && donationAmount > 0 && paymentAmount === donationAmount;
}

async function processMetaPurchase(donation, payment, summary) {
  if (donation.metaPurchaseSentAt) {
    summary.metaSkipped = true;
    return;
  }

  try {
    const metaResponse = await metaConversionService.sendPurchaseEvent(donation, payment);
    const metaUpdate = metaResponse?.skipped
      ? {
          metaPurchaseResponse: metaResponse,
          metaPurchaseLastError: metaResponse.reason || "Meta Purchase event skipped"
        }
      : {
          metaPurchaseResponse: metaResponse,
          metaPurchaseSentAt: new Date(),
          metaPurchaseLastError: null
        };

    await donationModle.findByIdAndUpdate(donation._id, { $set: metaUpdate });
    summary.metaProcessed = true;
  } catch (error) {
    await donationModle.findByIdAndUpdate(donation._id, {
      $set: {
        metaPurchaseLastError: String(error.response?.data?.error?.message || error.message || error)
      }
    });
    summary.nonFatalErrors.push(`Meta: ${error.message || error}`);
  }
}

async function processExternalDonation(donation, payment, summary) {
  if (donation.externalApiSentAt) {
    summary.externalSkipped = true;
    return donation.externalApiResponse || null;
  }

  try {
    const apiResponse = await externalDonationService.sendToExternalApi(donation, payment);
    await donationModle.findByIdAndUpdate(donation._id, {
      $set: {
        externalApiResponse: apiResponse,
        externalApiSentAt: new Date()
      }
    });
    summary.externalProcessed = true;
    return apiResponse;
  } catch (error) {
    summary.nonFatalErrors.push(`External API: ${error.message || error}`);
    return donation.externalApiResponse || null;
  }
}

async function processReceiptAndWhatsapp(donation, apiResponse, summary) {
  if (Number(donation.amount || 0) < 1) {
    summary.receiptSkipped = true;
    return;
  }

  try {
    let latestDonation = await donationModle.findById(donation._id);
    let receiptPath = getReceiptFilePath(latestDonation);

    if (!latestDonation.receiptNumber || !fs.existsSync(receiptPath)) {
      receiptPath = await receiptService.generateReceipt(latestDonation, apiResponse);
      latestDonation = await donationModle.findById(donation._id);
      summary.receiptGenerated = true;
    } else {
      summary.receiptSkipped = true;
    }

    if (latestDonation.whatsappSentAt) {
      summary.whatsappSkipped = true;
      return;
    }

    const phone = normalizePhone(latestDonation.mobile);
    if (!phone) {
      throw new Error("Mobile number missing for WhatsApp receipt");
    }

    const paymentType =
      latestDonation.subscriptionId || latestDonation.isRecurring ? "subscription" : "normal";
    const whatsappResponse = await whatsappService.sendReceiptWhatsapp(
      phone,
      receiptPath,
      latestDonation.name,
      latestDonation.amount,
      normalizeSevaName(latestDonation),
      paymentType
    );

    await donationModle.findByIdAndUpdate(latestDonation._id, {
      $set: {
        whatsappSentAt: new Date(),
        whatsappResponse,
        whatsappLastError: null
      }
    });
    summary.whatsappSent = true;
  } catch (error) {
    await donationModle.findByIdAndUpdate(donation._id, {
      $inc: { receiptGenerationAttempts: 1 },
      $set: {
        receiptGenerationLastError: String(error.message || error),
        whatsappLastError: String(error.message || error)
      }
    });
    summary.nonFatalErrors.push(`Receipt/WhatsApp: ${error.message || error}`);
  }
}

async function finalizeCapturedPayment(payment, options = {}) {
  const summary = {
    orderId: payment?.order_id || null,
    paymentId: payment?.id || null,
    donationId: null,
    found: false,
    alreadyPaid: false,
    markedPaid: false,
    metaProcessed: false,
    metaSkipped: false,
    externalProcessed: false,
    externalSkipped: false,
    receiptGenerated: false,
    receiptSkipped: false,
    whatsappSent: false,
    whatsappSkipped: false,
    nonFatalErrors: []
  };

  if (!payment?.id || !payment?.order_id) {
    throw new Error("Payment id and order id are required for finalization");
  }

  if (payment.status !== "captured") {
    throw new Error(`Payment is not captured. Current status: ${payment.status || "unknown"}`);
  }

  const existingDonation = await donationModle.findOne({ razorpayOrderId: payment.order_id });

  if (!existingDonation) {
    return summary;
  }

  summary.found = true;
  summary.donationId = existingDonation._id;

  if (!paymentAmountMatchesDonation(payment, existingDonation)) {
    throw new Error(
      `Payment amount mismatch for order ${payment.order_id}: payment=${payment.amount}, donation=${existingDonation.amount}`
    );
  }

  if (String(payment.currency || "").toUpperCase() !== "INR") {
    throw new Error(`Unexpected payment currency: ${payment.currency}`);
  }

  const donation = await donationModle.findOneAndUpdate(
    { razorpayOrderId: payment.order_id },
    {
      $set: {
        status: "paid",
        razorpayPaymentId: payment.id,
        lastPaymentDate: payment.created_at ? new Date(payment.created_at * 1000) : new Date()
      }
    },
    { new: true }
  );

  summary.alreadyPaid = existingDonation.status === "paid";
  summary.markedPaid = existingDonation.status !== "paid";

  await processMetaPurchase(donation, payment, summary);
  const apiResponse = await processExternalDonation(donation, payment, summary);
  await processReceiptAndWhatsapp(donation, apiResponse, summary);

  if (options.logPrefix) {
    console.log(options.logPrefix, JSON.stringify(summary));
  }

  return summary;
}

module.exports = {
  finalizeCapturedPayment
};
