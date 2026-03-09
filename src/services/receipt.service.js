const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { settingsModel } = require("../models/settings.model");
const { donationModle } = require("../models/donation.model");
const numberToWords = require("number-to-words");

const generateReceipt = async (donation) => {
  // Get settings to fetch current receipt number
  let settings = await settingsModel.findOne();
  
  // If no settings exist, create default
  if (!settings) {
    settings = await settingsModel.create({
      receiptSettings: {
        startNumber: 5000,
        currentReceiptNumber: 5000
      }
    });
  }

  // Get and increment receipt number
  const receiptNumber = settings.receiptSettings.currentReceiptNumber || settings.receiptSettings.startNumber;
  
  // Update current receipt number for next time
  await settingsModel.findByIdAndUpdate(settings._id, {
    $set: { 'receiptSettings.currentReceiptNumber': receiptNumber + 1 }
  });

  // Update donation with receipt number
  await donationModle.findByIdAndUpdate(donation._id, {
    receiptNumber: receiptNumber,
    receiptGeneratedAt: new Date()
  });

  // Format receipt number: HKMI|2024|D/VSP|15740 (last 5 digits dynamic)
  const formattedReceiptNumber = `HKMI|${new Date().getFullYear()}|D/VSP|${String(receiptNumber).padStart(5, '0')}`;
  const receiptDate = new Date().toLocaleDateString("en-GB");
  const address = `${donation.address}, ${donation.city}, ${donation.state} - ${donation.pincode}`;
  
  // Convert amount to words
  const amountWords = numberToWords.toWords(donation.amount).toUpperCase() + " ONLY";

  // Create receipts directory
  const receiptsDir = path.join(__dirname, "../../receipts");
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir);
  }

  const filePath = path.join(receiptsDir, `${donation._id}.pdf`);

  // Create PDF with PDFKit
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).fillColor('#0A97EF').text('Hare Krishna Movement - Visakhapatnam', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#000').text('DONATION RECEIPT', { align: 'center' });
  doc.moveDown(1);

  // Receipt details
  doc.fontSize(12);
  doc.fillColor('#000').text(`Receipt No: ${formattedReceiptNumber}`, { align: 'right' });
  doc.text(`Date: ${receiptDate}`, { align: 'right' });
  doc.moveDown(1.5);

  // Donor Information
  doc.fontSize(14).fillColor('#0A97EF').text('Donor Information', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#000');
  doc.text(`Name: ${donation.name}`);
  doc.text(`Address: ${address}`);
  doc.text(`Mobile: ${donation.mobile}`);
  doc.text(`Email: ${donation.email}`);
  if (donation.panNumber) {
    doc.text(`PAN: ${donation.panNumber}`);
  }
  doc.moveDown(1.5);

  // Donation Details
  doc.fontSize(14).fillColor('#0A97EF').text('Donation Details', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#000');
  doc.text(`Amount: ₹${donation.amount}`);
  doc.text(`Amount in Words: ${amountWords}`);
  doc.text(`Payment Reference: ${donation.razorpayPaymentId}`);
  doc.text(`80G Certificate: ${donation.certificate ? 'YES' : 'NO'}`);
  doc.moveDown(1.5);

  // Footer
  doc.fontSize(10).fillColor('#666');
  doc.text('This is a computer-generated receipt and does not require a signature.', { align: 'center' });
  doc.moveDown(0.5);
  doc.text('Hare Krishna Movement - Visakhapatnam', { align: 'center' });
  doc.text('Thank you for your generous donation!', { align: 'center' });

  doc.end();

  // Wait for PDF to be written
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filePath;
};

module.exports = { generateReceipt };