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

  form.append("components[]", JSON.stringify([
    {
      type: "body",
        parameters: [
          { type: "text", text: donorName },
          { type: "text", text: String(amount) }
        ]
      }
    ])
  );

  
  const dir = path.dirname(filePath);
  const namedFilePath = path.join(dir, `Donation_Receipt_${Date.now()}.pdf`);
  fs.copyFileSync(filePath, namedFilePath);

  form.append(
    "header_attachment",
    fs.createReadStream(namedFilePath),
    {
      filename: `Donation_Receipt_${donorName.replace(/\s+/g, "_")}.pdf`,
      contentType: "application/pdf",
      knownLength: fs.statSync(namedFilePath).size  
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
        maxContentLength: Infinity
      }
    );

    console.log("WhatsApp API response:", response.data);
    return response.data;

  } finally {
    
    if (fs.existsSync(namedFilePath)) {
      fs.unlinkSync(namedFilePath);
    }
  }
};

module.exports = { sendReceiptWhatsapp };