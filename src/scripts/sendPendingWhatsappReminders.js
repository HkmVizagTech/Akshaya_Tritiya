// Script to send WhatsApp reminders for pending (created, not paid) donations
const mongoose = require('mongoose');
const { donationModle } = require('../models/donation.model');
const { sendPendingWhatsapp } = require('../services/whatsapp.service');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const cutoff = new Date(Date.now() - 6 * 60 * 1000); 
  const pendingDonations = await donationModle.find({ status: 'created', createdAt: { $lte: cutoff }, whatsappPendingReminderSent: { $ne: true } });
  for (const donation of pendingDonations) {
    try {
      const phone = donation.mobile.startsWith('91') ? donation.mobile : `91${donation.mobile}`;
      await sendPendingWhatsapp(phone, donation.name, donation.amount);
      donation.whatsappPendingReminderSent = true;
      await donation.save();
      console.log(`Reminder sent to ${phone} for donation ${donation._id}`);
    } catch (err) {
      console.error('Failed to send reminder for donation', donation._id, err);
    }
  }
  await mongoose.disconnect();
}

main().then(() => process.exit(0));
