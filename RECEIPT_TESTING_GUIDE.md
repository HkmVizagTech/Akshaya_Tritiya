# Receipt Flow Testing Guide

## Prerequisites Checklist

Before running the test, ensure you have:

### 1. Environment Variables (.env file)
```
MONGO_URI=your_mongodb_connection_string
FLAXXA_TOKEN=your_flaxxa_whatsapp_token
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Required Files
- ✅ `/server/src/public/hkmi-logo.jpg` - Organization logo
- ✅ `/server/src/public/hkmi-stamp-removebg-preview.png` - Stamp image
- ✅ `/server/src/templates/receipt.ejs` - Receipt template

### 3. Database
- MongoDB connection is active
- Database name matches your MONGO_URI

---

## How to Run the Test

### Option 1: Comprehensive Test (Recommended)

This tests the complete flow: Settings → Receipt Generation → WhatsApp Sending

```bash
cd /Users/saikiran/Desktop/saikiran/projects/hkm/Subhojanam-sk/server
node src/services/testReceiptFlow.js
```

**What it does:**
1. ✅ Connects to MongoDB
2. ✅ Checks/Creates settings with receipt counter
3. ✅ Creates a test donation with:
   - Name: "Test Donor - Receipt Flow"
   - Amount: ₹5000
   - Certificate: Yes
   - PAN: ABCDE1234F
   - Mobile: 8688487669
4. ✅ Generates PDF receipt with dynamic receipt number
5. ✅ Updates donation with receipt number
6. ✅ Increments settings counter for next receipt
7. ✅ Sends WhatsApp with PDF attachment
8. ✅ Shows complete summary

---

## Expected Output

```
🚀 Starting Receipt Flow Test...

🔄 Connecting to MongoDB...
✅ Connected to MongoDB

📋 Step 1: Checking settings...
✅ Settings found. Current receipt number: 5000

📋 Step 2: Creating test donation...
✅ Test donation created with ID: 65f1a2b3c4d5e6f7g8h9i0j1
   Name: Test Donor - Receipt Flow
   Amount: ₹5000
   Certificate: true
   PAN: ABCDE1234F

📋 Step 3: Generating receipt PDF...
✅ Receipt generated at: /Users/.../server/receipts/65f1a2b3c4d5e6f7g8h9i0j1.pdf

📋 Step 4: Checking updated donation...
✅ Receipt Number assigned: 5000
✅ Receipt Generated At: 2026-03-09T10:30:00.000Z

📋 Step 5: Checking settings after receipt generation...
✅ Next receipt number will be: 5001

📋 Step 6: Sending receipt via WhatsApp...
   Sending to: +918688487669
   Donor Name: Test Donor - Receipt Flow
   Amount: ₹5000
✅ WhatsApp sent successfully!

✅ ========== TEST COMPLETED SUCCESSFULLY ==========

📊 Summary:
   - Donation ID: 65f1a2b3c4d5e6f7g8h9i0j1
   - Receipt Number: 5000
   - Receipt Format: HKMI|2026|D/VSP|05000
   - PDF Location: /Users/.../receipts/65f1a2b3c4d5e6f7g8h9i0j1.pdf
   - Next Receipt Number: 5001

🔌 Disconnected from MongoDB
```

---

## What to Verify

### 1. Database Verification
Check MongoDB after test:

**Settings Collection:**
```javascript
{
  receiptSettings: {
    startNumber: 5000,
    currentReceiptNumber: 5001  // Should be incremented
  }
}
```

**Donations Collection:**
```javascript
{
  name: "Test Donor - Receipt Flow",
  amount: 5000,
  receiptNumber: 5000,  // Should be assigned
  receiptGeneratedAt: "2026-03-09T..."  // Should have timestamp
}
```

### 2. File System Verification
Check if PDF was created:
```bash
ls -la /Users/saikiran/Desktop/saikiran/projects/hkm/Subhojanam-sk/server/receipts/
```

Should show a PDF file named with the donation ID.

### 3. WhatsApp Verification
- Check your WhatsApp (number: 8688487669)
- Should receive message with:
  - Template: "thank_you_page"
  - Body parameters: Name and Amount
  - PDF attachment

---

## Troubleshooting

### Error: "Cannot connect to MongoDB"
- Check MONGO_URI in .env file
- Ensure MongoDB is running

### Error: "Logo file not found"
- Ensure `/server/src/public/hkmi-logo.jpg` exists
- Check file permissions

### Error: "WhatsApp sending failed"
- Verify FLAXXA_TOKEN in .env
- Check Flaxxa API quota
- Verify template "thank_you_page" exists in Flaxxa dashboard
- Ensure template has 2 body parameters and accepts header attachment

### Error: "Settings not found"
- The script will auto-create settings
- If manual creation needed, run in MongoDB:
```javascript
db.settings.insertOne({
  receiptSettings: {
    startNumber: 5000,
    currentReceiptNumber: 5000
  }
})
```

---

## Next Steps After Successful Test

1. ✅ Test with real payment flow using Razorpay test mode
2. ✅ Update starting receipt number in Admin Settings page
3. ✅ Verify webhook integration with Razorpay
4. ✅ Monitor receipts folder for generated PDFs
5. ✅ Check WhatsApp delivery rates

---

## Clean Up Test Data (Optional)

To remove test donation:
```javascript
// In MongoDB or use Mongoose
db.donations.deleteOne({ name: "Test Donor - Receipt Flow" })
```

To reset receipt counter:
```javascript
db.settings.updateOne(
  {},
  { $set: { "receiptSettings.currentReceiptNumber": 5000 } }
)
```
