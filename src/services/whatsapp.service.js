
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

const normalizeSevaName = (rawSevaName) => {
  const seva = String(rawSevaName || "").trim();
  if (!seva) return "Annadana Seva";
  if (/^Feed\s+\d+/i.test(seva)) return "Annadana Seva";
  return seva;
};

const sendPendingWhatsapp = async (phone, donorName, amount) => {
  const response = await axios.post(
    "https://wapi.flaxxa.com/api/v1/sendtemplatemessage",
    {
      token: process.env.FLAXXA_TOKEN,
      phone: phone,
      template_name: "subhojanam_seva_pending",
      template_language: "en",
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: "https://storage.googleapis.com/subhojanam/Avail%2080G%20Exemption%20(1).jpg"
              }
            }
          ]
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: String(donorName) },
            { type: "text", text: String(amount) },
            { type: "text", text: "Annadana Seva" },
            { type: "text", text: "Once completed, the amount will be allocated towards providing meals" }
          ]
        }
      ]
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return response.data;
};



const sendReceiptWhatsapp = async (phone, filePath, donorName, amount, sevaName, paymentType = "normal") => {
  if (!process.env.FLAXXA_TOKEN) {
    throw new Error("FLAXXA_TOKEN is not configured");
  }

  const finalSevaName = normalizeSevaName(sevaName);
  const templateAttempts = [
    { name: process.env.WHATSAPP_TEMPLATE_PRIMARY || "common_donation_success_reciept", includeSeva: true },
    {
      name:
        process.env.WHATSAPP_TEMPLATE_SUBSCRIPTION ||
        (paymentType === "subscription" ? "andseva_monthly_success_reciept" : "annadana_acknowledgement_receipt"),
      includeSeva: false,
    },
    { name: process.env.WHATSAPP_TEMPLATE_FALLBACK || "annadana_acknowledgement_receipt", includeSeva: false },
  ];

  let lastError = null;

  for (const attempt of templateAttempts) {
    const form = new FormData();
    form.append("token", process.env.FLAXXA_TOKEN);
    form.append("phone", phone);
    form.append("template_name", attempt.name);
    form.append("template_language", "en");

    const params = [
      { type: "text", text: donorName },
      { type: "text", text: String(amount) },
    ];
    if (attempt.includeSeva) {
      params.push({ type: "text", text: finalSevaName });
    }

    form.append(
      "components",
      JSON.stringify([
        {
          type: "body",
          parameters: params,
        },
      ]),
    );

    form.append("header_attachment", fs.createReadStream(filePath), {
      filename: "Donation_Acknowledgment_Receipt.pdf",
      contentType: "application/pdf",
    });

    try {
      console.log("WhatsApp template payload:", {
        phone,
        templateName: attempt.name,
        donorName,
        amount,
        sevaName: attempt.includeSeva ? finalSevaName : "(not sent)",
        paymentType,
      });

      const response = await axios.post(
        "https://wapi.flaxxa.com/api/v1/sendtemplatemessage_withattachment",
        form,
        {
          headers: form.getHeaders(),
        },
      );

      return response.data;
    } catch (error) {
      lastError = error;
      console.error("WhatsApp send attempt failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        templateName: attempt.name,
        includeSeva: attempt.includeSeva,
        phone,
      });
    }
  }

  throw lastError || new Error("All WhatsApp template attempts failed");
};

module.exports = { sendReceiptWhatsapp, sendPendingWhatsapp };
