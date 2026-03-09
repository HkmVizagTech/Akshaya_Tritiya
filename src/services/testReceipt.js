const { generateReceipt } = require("./receipt.service")

const donation = {
name: "Test Donor",
mobile: "9876543210",
email: "test@test.com",
panNumber: "ABCDE1234F",
amount: 1700,
certificate: true,
address: "Seethammadhara",
city: "Visakhapatnam",
state: "Andhra Pradesh",
pincode: "530017",
razorpayPaymentId: "TEST123456",
_id: "664aa23f7b2d1c4a6b5f1234"
}

generateReceipt(donation)
.then((file)=>{
console.log("PDF created:",file)
})
.catch(console.error)