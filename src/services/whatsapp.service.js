const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const sendReceiptWhatsapp = async (phone, filePath, donorName, amount) => {
  console.log("=== WHATSAPP SEND START ===");
  console.log("Phone:", phone);
  console.log("FilePath:", filePath);
  console.log("File exists:", fs.existsSync(filePath));
  console.log("DonorName:", donorName);
  console.log("Amount:", amount);
  console.log("Token:", process.env.FLAXXA_TOKEN ? "SET" : "NOT SET");

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found at path: ${filePath}`);
  }

  const fileStats = fs.statSync(filePath);
  console.log("File size:", fileStats.size, "bytes");

  if (fileStats.size === 0) {
    throw new Error("PDF file is empty (0 bytes)");
  }

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
  ]));

  form.append(
    "header_attachment",
    fs.createReadStream(filePath),
    {
      filename: "Donation_Receipt.pdf",
      contentType: "application/pdf",
      knownLength: fileStats.size
    }
  );

  console.log("Form headers:", form.getHeaders());

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

    console.log("=== WHATSAPP SUCCESS ===");
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(response.data, null, 2));
    return response.data;

  } catch (error) {
    console.error("=== WHATSAPP ERROR ===");
    console.error("Error message:", error.message);

    if (error.response) {
      // API responded with error
      console.error("HTTP Status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      // Request was made but no response
      console.error("No response received - possible network/timeout issue");
      console.error("Request details:", error.request._header);
    } else {
      // Something else
      console.error("Setup error:", error.message);
    }

    throw error;
  }
};

module.exports = { sendReceiptWhatsapp };