const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sendReceiptWhatsapp = async (phone, filePath, donorName, amount) => {
  const form = new FormData();

  form.append("token", process.env.FLAXXA_TOKEN);
  form.append("phone", phone);
  form.append("template_name", "thank_you_page");
  form.append("template_language", "en_GB");

  form.append(
    "components",
    JSON.stringify([
      {
        type: "body",
        parameters: [
          { type: "text", text: donorName },
          { type: "text", text: String(amount) }
        ]
      }
    ])
  );

  // ✅ Filename explicitly set here
  form.append(
    "header_attachment",
    fs.createReadStream(filePath),
    {
      filename: "Donation_Receipt.pdf",   // 👈 This sets the PDF title in WhatsApp
      contentType: "application/pdf"
    }
  );

  const response = await axios.post(
    "https://wapi.flaxxa.com/api/v1/sendtemplatemessage_withattachment",
    form,
    {
      headers: form.getHeaders()
    }
  );

  return response.data;
};

module.exports = { sendReceiptWhatsapp };