const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const phone = "918688487669"; 
const filePath = path.join(__dirname, "../receipts/664aa23f7b2d1c4a6b5f1234.pdf");
const donorName = "Test Donor";
const amount = 5000;

console.log("=== Debug Information ===");
console.log("TOKEN:", process.env.FLAXXA_TOKEN);
console.log("Phone:", phone);
console.log("File Path:", filePath);
console.log("File exists:", fs.existsSync(filePath));
console.log("Donor Name:", donorName);
console.log("Amount:", amount);
console.log("========================\n");

// Test 1: Send without attachment (simple template message)
async function testSimpleMessage() {
  console.log("Test 1: Trying simple template message WITHOUT attachment...\n");
  
  try {
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
            {
              type: "text",
              text: donorName
            },
            {
              type: "text",
              text: String(amount)
            }
          ]
        }
      ])
    );

    const response = await axios.post(
      "https://wapi.flaxxa.com/api/v1/sendtemplatemessage",
      form,
      {
        headers: form.getHeaders()
      }
    );

    console.log("✅ Simple Message Result:", response.data);
  } catch (err) {
    console.error("❌ Simple Message Error:", err.response?.data || err.message);
  }
}

// Test 2: Check available templates
async function checkTemplates() {
  console.log("\nTest 2: Checking available templates...\n");
  
  try {
    const form = new FormData();
    form.append("token", process.env.FLAXXA_TOKEN);

    const response = await axios.post(
      "https://wapi.flaxxa.com/api/v1/gettemplates",
      form,
      {
        headers: form.getHeaders()
      }
    );

    console.log("✅ Available Templates:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error("❌ Template List Error:", err.response?.data || err.message);
  }
}

// Test 3: Send with attachment
async function testWithAttachment() {
  console.log("\nTest 3: Trying template message WITH attachment...\n");
  
  try {
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
            {
              type: "text",
              text: donorName
            },
            {
              type: "text",
              text: String(amount)
            }
          ]
        }
      ])
    );

    form.append(
      "header_attachment",
      fs.createReadStream(filePath)
    );

    const response = await axios.post(
      "https://wapi.flaxxa.com/api/v1/sendtemplatemessage_withattachment",
      form,
      {
        headers: form.getHeaders()
      }
    );

    console.log("✅ With Attachment Result:", response.data);
  } catch (err) {
    console.error("❌ With Attachment Error:", err.response?.data || err.message);
  }
}

// Run all tests
async function runTests() {
  await checkTemplates();
  await testSimpleMessage();
  await testWithAttachment();
}

runTests();
