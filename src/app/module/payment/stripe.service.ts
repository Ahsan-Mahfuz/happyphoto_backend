import Stripe from "stripe";
import config from "../../../config";
import ApiError from "../../../error/ApiError";
const { status } = require("http-status");

const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// --- PaymentIntent Operations ---

const createPaymentIntent = async (
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  captureMethod: "automatic" | "manual" = "automatic",
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents
      currency,
      metadata,
      capture_method: captureMethod,
    });
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(status.BAD_REQUEST, `Stripe error: ${error.message}`);
  }
};

const capturePaymentIntent = async (
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe capture error: ${error.message}`,
    );
  }
};

const cancelPaymentIntent = async (
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe cancel error: ${error.message}`,
    );
  }
};

const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string,
): Promise<Stripe.Refund> => {
  try {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };
    if (amount) refundData.amount = amount; // partial refund in cents
    if (reason) refundData.reason = reason as Stripe.RefundCreateParams.Reason;

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe refund error: ${error.message}`,
    );
  }
};

// --- Stripe Connect Operations ---

const createConnectAccount = async (
  email: string,
  country: string = "US",
): Promise<Stripe.Account> => {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe Connect error: ${error.message}`,
    );
  }
};

const createAccountLink = async (
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return accountLink;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe account link error: ${error.message}`,
    );
  }
};

const createTransfer = async (
  amount: number,
  destination: string,
  transferGroup: string,
  currency: string = "usd",
): Promise<Stripe.Transfer> => {
  try {
    const transfer = await stripe.transfers.create({
      amount, // in cents
      currency,
      destination,
      transfer_group: transferGroup,
    });
    return transfer;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe transfer error: ${error.message}`,
    );
  }
};

const createTransferReversal = async (
  transferId: string,
  amount?: number,
): Promise<Stripe.TransferReversal> => {
  try {
    const reversalData: Stripe.TransferCreateReversalParams = {};
    if (amount) reversalData.amount = amount;

    const reversal = await stripe.transfers.createReversal(
      transferId,
      reversalData,
    );
    return reversal;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe reversal error: ${error.message}`,
    );
  }
};

const getAccountStatus = async (
  accountId: string,
): Promise<{
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}> => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe account status error: ${error.message}`,
    );
  }
};

// Webhook signature verification
const constructWebhookEvent = (
  body: Buffer,
  signature: string,
  webhookSecret: string,
): Stripe.Event => {
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
};

const StripeService = {
  createPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  createRefund,
  createConnectAccount,
  createAccountLink,
  createTransfer,
  createTransferReversal,
  getAccountStatus,
  constructWebhookEvent,
};

export { StripeService };
