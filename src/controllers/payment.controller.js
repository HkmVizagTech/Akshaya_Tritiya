const { razorpay } = require("../config/razorpay");
const {donationModle} = require("../models/donation.model");
const {planModel} = require("../models/plan.model");
const path = require("path");
const fs = require("fs");
const { generateReceipt } = require("../services/receipt.service");
const whatsappService = require("../services/whatsapp.service");
const { finalizeCapturedPayment } = require("../services/paymentFinalization.service");
require("dotenv").config()

function normalizeSevaName(type, sevaName) {
  const raw = String(type || sevaName || "").trim();
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

  return raw;
}

const getReceiptFilePath = (donation) => {
  const safeName = String(donation.name || "Donor").replace(/\s+/g, "_");
  return path.join(__dirname, "../../receipts", `Donation_Receipt_${safeName}.pdf`);
};

const paymentController = {
  createOrder : async(req,res)=>{
    try {
        const {  name, email, mobile, Akshaya_tritiya, type, sevaName, occasion, sevaDate, dob, amount, certificate, panNumber, address, city, state, pincode, mahaprasadam, prasadamAddressOption, prasadamAddress } = req.body;
        const resolvedSevaName = normalizeSevaName(type, sevaName);

      if (!name || !mobile || !resolvedSevaName || !amount || amount < 1) {
        return res.status(400).json({ message: "name, mobile, sevaName, and a valid amount are required" });
      }


    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    const donation = await donationModle.create({
      name,
      email,
      mobile,
      Akshaya_tritiya,
      type: resolvedSevaName,
      sevaName: resolvedSevaName,
      occasion,
      sevaDate,
      dob,
      amount,
      certificate,
      panNumber,
      address,
      city,
      state,
      pincode,
      mahaprasadam,
      prasadamAddressOption,
      prasadamAddress,
      razorpayOrderId:order.id,
      ...(req.body.utm ? { utm: req.body.utm } : {})
    })

    return res.status(200).send({
      orderId: order.id,
      key: process.env.RAZORPAY_KEY_ID,
      donationId: donation._id
    })

    } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order creation failed" });
    }
  },


 createSubscription: async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      Akshaya_tritiya,
      type,
      sevaName,
      occasion,
      sevaDate,
      dob,
      amount,
      certificate,
      panNumber,
      address,
      city,
      state,
      pincode,
      mahaprasadam,
      prasadamAddressOption,
      prasadamAddress
    } = req.body;

    const resolvedSevaName = normalizeSevaName(type, sevaName);

    if (!name || !mobile || !resolvedSevaName || !amount || amount < 1) {
      return res.status(400).json({ message: "name, mobile, sevaName, and a valid amount are required" });
    }

    let planId;

console.log("Using KEY:", process.env.RAZORPAY_KEY_ID);
console.log("Using PLAN ID:", planId);

    if (amount == 500) {
      planId = process.env.RAZORPAY_PLAN_500;
    } else if (amount == 1000) {
      planId = process.env.RAZORPAY_PLAN_1000;
    } else if (amount == 2500) {
      planId = process.env.RAZORPAY_PLAN_2500;
    } else if (amount == 5000) {
      planId = process.env.RAZORPAY_PLAN_5000;
    } else {

     

      
      const existingPlan = await planModel.findOne({ amount });

      if (existingPlan) {
        planId = existingPlan.planId;
      } else {

        const newPlan = await razorpay.plans.create({
          period: "monthly",
          interval: 1,
          item: {
            name: `Monthly Donation ₹${amount}`,
            amount: amount * 100,
            currency: "INR"
          }
        });

        planId = newPlan.id;


        await planModel.create({
          amount,
          planId
        });
      }
    }

    if (!planId) {
      return res.status(500).send("Plan creation failed");
    }


    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 0,
      total_count: 12,
      quantity: 1
    });

    await donationModle.create({
      name,
      email,
      mobile,
      Akshaya_tritiya,
      type: resolvedSevaName,
      sevaName: resolvedSevaName,
      occasion,
      sevaDate,
      dob,
      amount,
      certificate,
      panNumber,
      address,
      city,
      state,
      pincode,
      mahaprasadam,
      prasadamAddressOption,
      prasadamAddress,
      subscriptionId: subscription.id,
      isRecurring: true,
      status: "created",
      failureCount: 0,
      reviewAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      ...(req.body.utm ? { utm: req.body.utm } : {})
    });

    return res.status(200).send({
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
  return res.status(500).json({
    message: "Subscription creation failed",
    error: error.error?.description || error.message
  });
}
},

downloadReceipt: async (req, res) => {
  try {
    const { donationId } = req.params;
    
    console.log("=== GET RECEIPT DATA REQUEST ===");
    console.log("Donation ID:", donationId);
    
    const donation = await donationModle.findById(donationId);
    
    if (!donation) {
      console.log("ERROR: Donation not found in database");
      return res.status(404).json({ message: "Donation not found" });
    }
    
    console.log("Donation found:", {
      id: donation._id,
      name: donation.name,
      amount: donation.amount,
      status: donation.status,
      receiptNumber: donation.receiptNumber
    });
  
    if (!donation.receiptNumber) {
      console.log("ERROR: Receipt number not set - not eligible for receipt");
      return res.status(404).json({ message: "This donation does not have a receipt number assigned." });
    }
    
    const receiptData = {
      receiptNumber: donation.receiptNumber,
      name: donation.name,
      email: donation.email,
      mobile: donation.mobile,
      amount: donation.amount,
      address: donation.address,
      city: donation.city,
      state: donation.state,
      pincode: donation.pincode,
      panNumber: donation.panNumber,
      certificate: donation.certificate,
      razorpayPaymentId: donation.razorpayPaymentId,
      receiptGeneratedAt: donation.receiptGeneratedAt,
      createdAt: donation.createdAt
    };
    
    console.log("SUCCESS: Sending receipt data");
    return res.status(200).json({
      success: true,
      data: receiptData
    });
    
  } catch (error) {
    console.error("Get receipt data error:", error);
    res.status(500).json({ message: "Failed to fetch receipt data" });
  }
}
,

reconcileCapturedPayments: async (req, res) => {
  try {
    if (!req.admin && req.headers["x-internal-secret"] !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requestedLimit = Number(req.body?.limit || req.query?.limit || 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(200, requestedLimit))
      : 50;

    const candidates = await donationModle
      .find({ status: { $in: ["created", "pending"] } })
      .sort({ createdAt: -1 })
      .limit(limit);

    const summary = {
      scanned: candidates.length,
      capturedFound: 0,
      reconciledToPaid: 0,
      whatsappSent: 0,
      errors: [],
    };

    for (const donation of candidates) {
      try {
        if (!donation.razorpayOrderId) {
          continue;
        }

        const paymentCollection = await razorpay.orders.fetchPayments(donation.razorpayOrderId);
        const capturedPayment = (paymentCollection.items || []).find(
          (item) => item.status === "captured",
        );

        if (!capturedPayment) {
          continue;
        }

        summary.capturedFound += 1;

        const finalized = await finalizeCapturedPayment(capturedPayment, {
          logPrefix: "Manual reconciliation finalized"
        });

        if (finalized.markedPaid || finalized.alreadyPaid) summary.reconciledToPaid += 1;
        if (finalized.whatsappSent) summary.whatsappSent += 1;
        if (finalized.nonFatalErrors?.length) {
          summary.errors.push({
            donationId: donation._id,
            orderId: donation.razorpayOrderId,
            error: finalized.nonFatalErrors.join("; "),
          });
        }
      } catch (error) {
        summary.errors.push({
          donationId: donation._id,
          orderId: donation.razorpayOrderId,
          error: String(error.message || error),
        });
      }
    }

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("reconcileCapturedPayments error:", error);
    return res.status(500).json({ message: "Reconciliation failed", error: String(error.message || error) });
  }
}


}


module.exports = { paymentController}
