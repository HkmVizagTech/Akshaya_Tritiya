const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

const sendReceiptWhatsapp = async (phone, filePath, donorName, amount) => {
  console.log("=== WHATSAPP SEND START ===");

  const fileStats = fs.statSync(filePath);

  const form = new FormData();
  form.append("token", process.env.FLAXXA_TOKEN);
  form.append("phone", phone);
  form.append("template_name", "thank_you_page");
  form.append("template_language", "en_GB");

  // ✅ Send as a plain string, NOT JSON.stringify of an array
  // Each components[] is one object stringified individually
  form.append("components[]", JSON.stringify({
    type: "body",
    parameters: [
      { type: "text", text: String(donorName) },
      { type: "text", text: String(amount) }
    ]
  }));

  form.append(
    "header_attachment",
    fs.createReadStream(filePath),
    {
      filename: "Donation_Receipt.pdf",
      contentType: "application/pdf",
      knownLength: fileStats.size
    }
  );

  try {
    const response = await axios.post(
      "https://wapi.flaxxa.com/api/v1/sendtemplatemessage_withattachment",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Accept: "application/json"
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      }
    );

    console.log("Flaxxa Response:", JSON.stringify(response.data, null, 2));

    if (response.data?.status === "error") {
      throw new Error(`Flaxxa API error: ${response.data.message}`);
    }

    return response.data;

  } catch (error) {
    console.error("WhatsApp send failed:", error.message);
    if (error.response) {
      console.error("HTTP Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
};

module.exports = { sendReceiptWhatsapp };