import type { Request, Response } from "express";
import config from "../../../config";
import { StripeService } from "./stripe.service";
import Payment from "./Payment";
import { OrderService } from "../order/order.service";
import { logger } from "../../../util/logger";

const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event;
  try {
    event = StripeService.constructWebhookEvent(
      req.body, // raw body (Buffer)
      sig,
      config.stripe.stripe_webhook_secret as string,
    );
  } catch (error: any) {
    logger.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle events
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;
      const payment = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: "succeeded",
          paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
        },
      );
      if (payment) {
        await OrderService.activateOrderAfterPayment(
          payment.orderId.toString(),
        );
      }
      logger.info(`Payment succeeded: ${paymentIntent.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as any;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: "failed" },
      );
      logger.warn(`Payment failed: ${paymentIntent.id}`);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as any;
      const paymentIntentId = charge.payment_intent;
      if (paymentIntentId) {
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntentId },
          {
            status: "refunded",
            refundId: charge.refunds?.data?.[0]?.id,
            refundAmount: (charge.amount_refunded || 0) / 100,
          },
        );
      }
      logger.info(`Charge refunded: ${charge.id}`);
      break;
    }

    default:
      logger.info(`Unhandled webhook event: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

export { handleWebhook };
