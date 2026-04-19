const express = require("express");
const { paymentController } = require("../controllers/payment.controller");

const paymentRouter = express.Router();


paymentRouter.post("/create-order", paymentController.createOrder)
paymentRouter.post("/create-subscription", paymentController.createSubscription)
paymentRouter.get("/download-receipt/:donationId", paymentController.downloadReceipt)
paymentRouter.post("/reconcile-captured", paymentController.reconcileCapturedPayments)

module.exports = {paymentRouter}