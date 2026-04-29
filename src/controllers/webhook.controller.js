const crypto = require("crypto");
const { donationModle } = require("../models/donation.model");
const { razorpay } = require("../config/razorpay");
const { finalizeCapturedPayment } = require("../services/paymentFinalization.service");

function verifyWebhookSignature(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Webhook secret not configured");
  }

  if (!signature) {
    throw new Error("Signature missing");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function finalizeOrderPaid(orderId) {
  const paymentCollection = await razorpay.orders.fetchPayments(orderId);
  const capturedPayment = (paymentCollection.items || []).find(
    (payment) => payment.status === "captured"
  );

  if (!capturedPayment) {
    return {
      orderId,
      foundCapturedPayment: false
    };
  }

  return finalizeCapturedPayment(capturedPayment, {
    logPrefix: "Razorpay order.paid finalized"
  });
}

const webHookControler = {
  webhook: async (req, res) => {
    try {
      const rawBody = req.body.toString();
      const signature = req.headers["x-razorpay-signature"];

      if (!verifyWebhookSignature(rawBody, signature)) {
        console.log("Razorpay webhook signature mismatch");
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(rawBody);
      console.log("Razorpay webhook event:", event.event);

      switch (event.event) {
        case "payment.captured": {
          const payment = event.payload.payment.entity;
          const summary = await finalizeCapturedPayment(payment, {
            logPrefix: "Razorpay payment.captured finalized"
          });
          console.log("Payment captured summary:", JSON.stringify(summary));
          break;
        }

        case "order.paid": {
          const order = event.payload.order.entity;
          const summary = await finalizeOrderPaid(order.id);
          console.log("Order paid summary:", JSON.stringify(summary));
          break;
        }

        case "payment.failed": {
          const payment = event.payload.payment.entity;
          if (payment.order_id) {
            await donationModle.findOneAndUpdate(
              {
                razorpayOrderId: payment.order_id,
                status: { $ne: "paid" }
              },
              {
                $set: {
                  status: "pending",
                  razorpayPaymentId: payment.id,
                  receiptGenerationLastError:
                    payment.error_description || payment.error_reason || "Payment failed"
                },
                $inc: { failureCount: 1 }
              }
            );
          }
          break;
        }

        case "subscription.activated": {
          const subscription = event.payload.subscription.entity;
          await donationModle.findOneAndUpdate(
            { subscriptionId: subscription.id },
            { status: "active" }
          );
          break;
        }

        case "subscription.charged": {
          const payment = event.payload.payment.entity;
          if (payment.order_id) {
            const summary = await finalizeCapturedPayment(payment, {
              logPrefix: "Razorpay subscription.charged finalized"
            });
            console.log("Subscription charged summary:", JSON.stringify(summary));
          } else if (payment.subscription_id) {
            await donationModle.findOneAndUpdate(
              { subscriptionId: payment.subscription_id, status: { $ne: "paid" } },
              {
                status: "paid",
                razorpayPaymentId: payment.id,
                lastPaymentDate: payment.created_at ? new Date(payment.created_at * 1000) : new Date()
              }
            );
          }
          break;
        }

        case "subscription.cancelled": {
          const subscription = event.payload.subscription.entity;
          await donationModle.findOneAndUpdate(
            { subscriptionId: subscription.id },
            { status: "cancelled" }
          );
          break;
        }

        case "subscription.completed": {
          const subscription = event.payload.subscription.entity;
          await donationModle.findOneAndUpdate(
            { subscriptionId: subscription.id },
            { status: "completed" }
          );
          break;
        }

        default:
          console.log("Unhandled Razorpay webhook event:", event.event);
      }

      return res.status(200).send("Webhook processed");
    } catch (error) {
      console.error("Webhook Error:", error);
      const status = /signature|secret/i.test(error.message) ? 400 : 500;
      return res.status(status).send(error.message || "Webhook error");
    }
  }
};

module.exports = { webHookControler };
