const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

console.log("TOKEN:", process.env.FLAXXA_TOKEN);
const { sendReceiptWhatsapp } = require("./whatsapp.service");

const phone = "918688487669"; 
const filePath = path.join(__dirname, "../receipts/664aa23f7b2d1c4a6b5f1234.pdf");
const donorName = "Test Donor";
const amount = 5000;

sendReceiptWhatsapp(phone, filePath, donorName, amount)
  .then((res) => {
    console.log("WhatsApp Sent:", res);
  })
  .catch((err) => {
    console.error("Error:", err.response?.data || err.message);
  });