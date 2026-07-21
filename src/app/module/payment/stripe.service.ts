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
  customerId?: string,
): Promise<Stripe.PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // in cents
      currency,
      metadata,
      capture_method: captureMethod,
      // Passing the customer (without forcing setup_future_usage) lets
      // Stripe's Payment Sheet show their saved cards and offer its own
      // "save this card" checkbox for next time.
      ...(customerId && { customer: customerId }),
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

// --- Payer-side Customer / saved payment methods ---

const createCustomer = async (
  email: string,
  name?: string,
): Promise<Stripe.Customer> => {
  try {
    return await stripe.customers.create({ email, name });
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe customer error: ${error.message}`,
    );
  }
};

const createEphemeralKey = async (
  customerId: string,
): Promise<Stripe.EphemeralKey> => {
  try {
    return await stripe.ephemeralKeys.create({ customer: customerId });
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe ephemeral key error: ${error.message}`,
    );
  }
};

const createSetupIntent = async (
  customerId: string,
): Promise<Stripe.SetupIntent> => {
  try {
    return await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
    });
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe setup intent error: ${error.message}`,
    );
  }
};

const listPaymentMethods = async (
  customerId: string,
): Promise<Stripe.PaymentMethod[]> => {
  try {
    const [methods, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: "card" }),
      stripe.customers.retrieve(customerId),
    ]);

    let defaultId: string | undefined;
    if (!customer.deleted) {
      const activeCustomer = customer as Stripe.Customer;
      const defaultMethod =
        activeCustomer.invoice_settings?.default_payment_method;
      defaultId =
        typeof defaultMethod === "string" ? defaultMethod : defaultMethod?.id;
    }

    return methods.data.map((m) => ({
      ...m,
      metadata: { ...m.metadata, isDefault: String(m.id === defaultId) },
    })) as Stripe.PaymentMethod[];
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe list payment methods error: ${error.message}`,
    );
  }
};

const detachPaymentMethod = async (
  paymentMethodId: string,
): Promise<Stripe.PaymentMethod> => {
  try {
    return await stripe.paymentMethods.detach(paymentMethodId);
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe detach payment method error: ${error.message}`,
    );
  }
};

const setDefaultPaymentMethod = async (
  customerId: string,
  paymentMethodId: string,
): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return customer;
  } catch (error: any) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Stripe set default payment method error: ${error.message}`,
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
  createCustomer,
  createEphemeralKey,
  createSetupIntent,
  listPaymentMethods,
  detachPaymentMethod,
  setDefaultPaymentMethod,
  constructWebhookEvent,
};

export { StripeService };
