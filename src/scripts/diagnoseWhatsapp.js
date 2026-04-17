const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { sendPendingWhatsapp, sendReceiptWhatsapp } = require("../services/whatsapp.service");

(async () => {
  try {
    const phone = process.env.TEST_WHATSAPP_PHONE;
    const donorName = process.env.TEST_DONOR_NAME || "Test Donor";
    const amount = Number(process.env.TEST_DONATION_AMOUNT || 1);
    const sevaName = process.env.TEST_SEVA_NAME || "Annadana Seva";

    if (!phone) {
      throw new Error("Set TEST_WHATSAPP_PHONE in .env before running diagnoseWhatsapp.js");
    }

    if (!process.env.FLAXXA_TOKEN) {
      throw new Error("FLAXXA_TOKEN is missing. WhatsApp API cannot be called.");
    }

    console.log("[DIAG] Environment status:", {
      hasFlaxxaToken: Boolean(process.env.FLAXXA_TOKEN),
      primaryTemplate: process.env.WHATSAPP_TEMPLATE_PRIMARY || "common_donation_success_reciept",
      fallbackTemplate: process.env.WHATSAPP_TEMPLATE_FALLBACK || "annadana_acknowledgement_receipt",
      phone,
    });

    console.log("[DIAG] Sending pending template test...");
    const pendingResp = await sendPendingWhatsapp(phone, donorName, amount);
    console.log("[DIAG] Pending template response:", pendingResp);

    const receiptsDir = path.join(__dirname, "../../receipts");
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }
    const testPdfPath = path.join(receiptsDir, "diagnostic-receipt.pdf");

    // Minimal placeholder PDF bytes (enough for attachment upload tests)
    if (!fs.existsSync(testPdfPath)) {
      const minimalPdf = Buffer.from(
        "%PDF-1.1\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
        "utf-8",
      );
      fs.writeFileSync(testPdfPath, minimalPdf);
    }

    console.log("[DIAG] Sending receipt template test with attachment...");
    const receiptResp = await sendReceiptWhatsapp(
      phone,
      testPdfPath,
      donorName,
      amount,
      sevaName,
      "normal",
    );
    console.log("[DIAG] Receipt template response:", receiptResp);

    console.log("[DIAG] WhatsApp diagnostics passed.");
    process.exit(0);
  } catch (error) {
    console.error("[DIAG] WhatsApp diagnostics failed:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    process.exit(1);
  }
})();
