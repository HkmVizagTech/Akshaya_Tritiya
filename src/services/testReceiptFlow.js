const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");

const { donationModle } = require("../models/donation.model");
const { settingsModel } = require("../models/settings.model");
const { generateReceipt } = require("./receipt.service");
const { sendReceiptWhatsapp } = require("./whatsapp.service");

async function testReceiptFlow() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGOURL);
    console.log("✅ Connected to MongoDB");

    // Step 1: Check/Create Settings
    console.log("\n📋 Step 1: Checking settings...");
    let settings = await settingsModel.findOne();
    
    if (!settings) {
      console.log("⚠️  No settings found. Creating default settings...");
      settings = await settingsModel.create({
        receiptSettings: {
          startNumber: 5000,
          currentReceiptNumber: 5000
        }
      });
      console.log("✅ Settings created with starting number: 5000");
    } else {
      console.log(`✅ Settings found. Current receipt number: ${settings.receiptSettings.currentReceiptNumber}`);
    }

    // Step 2: Create Test Donation
    console.log("\n📋 Step 2: Creating test donation...");
    const testDonation = await donationModle.create({
      name: "Test Donor - Receipt Flow",
      email: "testdonor@example.com",
      mobile: "8688487669",
      occasion: "Test",
      dob: "1990-01-01",
      amount: 5000,
      certificate: true,
      panNumber: "ABCDE1234F",
      address: "123 Test Street",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      status: "paid",
      razorpayOrderId: "order_TEST123",
      razorpayPaymentId: "pay_TEST123"
    });
    console.log(`✅ Test donation created with ID: ${testDonation._id}`);
    console.log(`   Name: ${testDonation.name}`);
    console.log(`   Amount: ₹${testDonation.amount}`);
    console.log(`   Certificate: ${testDonation.certificate}`);
    console.log(`   PAN: ${testDonation.panNumber}`);

    // Step 3: Generate Receipt
    console.log("\n📋 Step 3: Generating receipt PDF...");
    const receiptPath = await generateReceipt(testDonation);
    console.log(`✅ Receipt generated at: ${receiptPath}`);

    // Step 4: Check updated donation
    console.log("\n📋 Step 4: Checking updated donation...");
    const updatedDonation = await donationModle.findById(testDonation._id);
    console.log(`✅ Receipt Number assigned: ${updatedDonation.receiptNumber}`);
    console.log(`✅ Receipt Generated At: ${updatedDonation.receiptGeneratedAt}`);

    // Step 5: Check updated settings
    console.log("\n📋 Step 5: Checking settings after receipt generation...");
    const updatedSettings = await settingsModel.findOne();
    console.log(`✅ Next receipt number will be: ${updatedSettings.receiptSettings.currentReceiptNumber}`);

    // Step 6: Send WhatsApp
    console.log("\n📋 Step 6: Sending receipt via WhatsApp...");
    const phone = testDonation.mobile.startsWith("91") 
      ? testDonation.mobile 
      : `91${testDonation.mobile}`;
    
    console.log(`   Sending to: +${phone}`);
    console.log(`   Donor Name: ${testDonation.name}`);
    console.log(`   Amount: ₹${testDonation.amount}`);
    
    try {
      const whatsappResponse = await sendReceiptWhatsapp(
        phone, 
        receiptPath, 
        testDonation.name, 
        testDonation.amount
      );
      console.log("✅ WhatsApp sent successfully!");
      console.log("   Response:", JSON.stringify(whatsappResponse, null, 2));
    } catch (whatsappError) {
      console.error("❌ WhatsApp sending failed:");
      console.error("   Error:", whatsappError.response?.data || whatsappError.message);
    }

    // Step 7: Cleanup (optional - comment out if you want to keep test data)
    console.log("\n📋 Step 7: Cleanup...");
    // await donationModle.findByIdAndDelete(testDonation._id);
    // console.log("✅ Test donation deleted");
    console.log("⚠️  Test donation kept for verification (ID: " + testDonation._id + ")");

    console.log("\n✅ ========== TEST COMPLETED SUCCESSFULLY ==========");
    console.log(`\n📊 Summary:`);
    console.log(`   - Donation ID: ${testDonation._id}`);
    console.log(`   - Receipt Number: ${updatedDonation.receiptNumber}`);
    console.log(`   - Receipt Format: HKMI|2026|D/VSP|${String(updatedDonation.receiptNumber).padStart(5, '0')}`);
    console.log(`   - PDF Location: ${receiptPath}`);
    console.log(`   - Next Receipt Number: ${updatedSettings.receiptSettings.currentReceiptNumber}`);

  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the test
console.log("🚀 Starting Receipt Flow Test...\n");
testReceiptFlow();
