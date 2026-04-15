
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

  const form = new FormData();

  form.append("token", process.env.FLAXXA_TOKEN);
  form.append("phone", phone);

  let templateName = "common_donation_success_reciept";
  if (paymentType === "subscription") {
    templateName = "common_donation_success_reciept";
  }

  const finalSevaName = normalizeSevaName(sevaName);
  form.append("template_name", templateName);
  form.append("template_language", "en");


  form.append(
    "components",
    JSON.stringify([
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: donorName
          },
          {
            type: "text",
            text: String(amount)
          },
          {
            type: "text",
            text: finalSevaName
          }
        ]
      }
    ])
  );

  form.append(
    "header_attachment",
    fs.createReadStream(filePath),
      {
        filename: "Donation_Acknowledgment_Receipt.pdf",
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

module.exports = { sendReceiptWhatsapp, sendPendingWhatsapp };
