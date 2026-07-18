const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Payment from "./Payment";
import Order from "../order/Order";
import User from "../user/User";
import { StripeService } from "./stripe.service";
import { logger } from "../../../util/logger";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import config from "../../../config";

// Stripe requires absolute http(s) URLs and sends the merchant back to their
// browser, so these point at the dashboard — not at the API's bind address.
const CONNECT_REFRESH_URL = `${config.merchant_dashboard_url}/revenue?stripe=refresh`;
const CONNECT_RETURN_URL = `${config.merchant_dashboard_url}/revenue?stripe=return`;

const createIntent = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["orderId"]);

  const order = await Order.findById(payload.orderId);
  if (!order) {
    throw new ApiError(status.NOT_FOUND, "Order not found");
  }

  if (order.userId.toString() !== userData.userId) {
    throw new ApiError(
      status.FORBIDDEN,
      "You can only pay for your own orders",
    );
  }

  // Check not already paid
  const existingPayment = await Payment.findOne({
    orderId: order._id,
    status: "succeeded",
  });
  if (existingPayment) {
    throw new ApiError(status.BAD_REQUEST, "Order is already paid");
  }

  // Determine capture method
  const captureMethod = order.propertyId ? "manual" : "automatic";

  // Amount in cents
  const amountInCents = Math.round(order.total * 100);

  const paymentIntent = await StripeService.createPaymentIntent(
    amountInCents,
    payload.currency || "usd",
    {
      orderId: order._id.toString(),
      orderHumanId: order.orderId,
      userId: userData.userId,
    },
    captureMethod,
  );

  // Create payment record
  const payment = await Payment.create({
    orderId: order._id,
    userId: userData.userId,
    stripePaymentIntentId: paymentIntent.id,
    amount: amountInCents,
    currency: payload.currency || "usd",
    status: "unpaid",
  });

  // Link payment to order
  await Order.findByIdAndUpdate(order._id, { paymentId: payment._id });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentId: payment._id,
  };
};

const getPayment = async (userData: any, query: Record<string, any>) => {
  let payment;

  if (query.paymentId) {
    payment = await Payment.findById(query.paymentId)
      .populate({ path: "orderId", select: "orderId status total" })
      .lean();
  } else if (query.orderId) {
    payment = await Payment.findOne({ orderId: query.orderId })
      .populate({ path: "orderId", select: "orderId status total" })
      .lean();
  } else {
    throw new ApiError(status.BAD_REQUEST, "paymentId or orderId is required");
  }

  if (!payment) {
    throw new ApiError(status.NOT_FOUND, "Payment not found");
  }

  return payment;
};

const refund = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["paymentId"]);

  const payment = await Payment.findById(payload.paymentId);
  if (!payment) {
    throw new ApiError(status.NOT_FOUND, "Payment not found");
  }

  if (payment.status !== "succeeded") {
    throw new ApiError(
      status.BAD_REQUEST,
      "Can only refund succeeded payments",
    );
  }

  const refundAmountCents = payload.amount
    ? Math.round(payload.amount * 100)
    : undefined;

  const stripeRefund = await StripeService.createRefund(
    payment.stripePaymentIntentId,
    refundAmountCents,
    payload.reason,
  );

  payment.refundId = stripeRefund.id;
  payment.refundAmount = stripeRefund.amount / 100;
  payment.refundReason = payload.reason || "requested_by_admin";
  payment.status =
    refundAmountCents && refundAmountCents < payment.amount
      ? "partially_refunded"
      : "refunded";
  await payment.save();

  return payment;
};

// --- Stripe Connect Methods ---

const createConnectAccount = async (userData: any) => {
  const user = await User.findById(userData.userId);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (!["MERCHANT", "DRIVER"].includes(userData.role)) {
    throw new ApiError(
      status.FORBIDDEN,
      "Only merchants and drivers can create Connect accounts",
    );
  }

  if (user.stripeConnectAccountId) {
    // Already has account — just generate new link
    const accountLink = await StripeService.createAccountLink(
      user.stripeConnectAccountId,
      CONNECT_REFRESH_URL,
      CONNECT_RETURN_URL,
    );
    return { accountLink: accountLink.url };
  }

  const account = await StripeService.createConnectAccount(user.email);

  user.stripeConnectAccountId = account.id;
  await user.save();

  const accountLink = await StripeService.createAccountLink(
    account.id,
    CONNECT_REFRESH_URL,
    CONNECT_RETURN_URL,
  );

  return { accountLink: accountLink.url };
};

const getConnectStatus = async (userData: any) => {
  const user = await User.findById(userData.userId)
    .select("stripeConnectAccountId stripeConnectOnboarded")
    .lean();

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  if (!user.stripeConnectAccountId) {
    return { onboarded: false, accountId: null };
  }

  const stripeStatus = await StripeService.getAccountStatus(
    user.stripeConnectAccountId,
  );

  // Update onboarded status if charges are enabled
  if (stripeStatus.chargesEnabled && !user.stripeConnectOnboarded) {
    await User.findByIdAndUpdate(userData.userId, {
      stripeConnectOnboarded: true,
    });
  }

  return {
    onboarded: stripeStatus.chargesEnabled && stripeStatus.detailsSubmitted,
    accountId: user.stripeConnectAccountId,
  };
};

// --- Payout Transfer Logic ---

const processOrderPayouts = async (orderId: string) => {
  const order = await Order.findById(orderId).lean();
  if (!order) {
    logger.error(`processOrderPayouts: Order ${orderId} not found`);
    return;
  }

  const merchant = await User.findById(order.merchantId)
    .select("stripeConnectAccountId stripeConnectOnboarded")
    .lean();

  const driver = order.driverId
    ? await User.findById(order.driverId)
        .select("stripeConnectAccountId stripeConnectOnboarded")
        .lean()
    : null;

  const transferGroup = order.orderId;

  // Transfer to merchant
  if (merchant?.stripeConnectAccountId && merchant.stripeConnectOnboarded) {
    const merchantAmountCents = Math.round(
      (order.merchantNetEarnings || 0) * 100,
    );
    if (merchantAmountCents > 0) {
      try {
        await StripeService.createTransfer(
          merchantAmountCents,
          merchant.stripeConnectAccountId,
          transferGroup,
        );
      } catch (error: any) {
        logger.error(
          `Merchant transfer failed for order ${order.orderId}: ${error.message}`,
        );
      }
    }
  } else {
    logger.warn(
      `Merchant ${order.merchantId} has no onboarded Connect account. Skipping transfer.`,
    );
  }

  // Transfer to driver
  if (driver?.stripeConnectAccountId && driver.stripeConnectOnboarded) {
    const driverAmountCents = Math.round((order.driverPayout || 0) * 100);
    if (driverAmountCents > 0) {
      try {
        await StripeService.createTransfer(
          driverAmountCents,
          driver.stripeConnectAccountId,
          transferGroup,
        );
      } catch (error: any) {
        logger.error(
          `Driver transfer failed for order ${order.orderId}: ${error.message}`,
        );
      }
    }
  } else if (driver) {
    logger.warn(
      `Driver ${order.driverId} has no onboarded Connect account. Skipping transfer.`,
    );
  }
};

const getMyEarnings = async (userData: any, query: Record<string, any>) => {
  const period = query.period || "week";
  const field = userData.role === "MERCHANT" ? "merchantId" : "driverId";
  const earningsField =
    userData.role === "MERCHANT" ? "merchantNetEarnings" : "driverPayout";

  let dateFilter: Record<string, any> = {};
  const now = new Date();

  switch (period) {
    case "today":
      dateFilter = {
        createdAt: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
        },
      };
      break;
    case "week": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
      break;
    }
    case "month": {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
      break;
    }
  }

  const result = await Order.aggregate([
    {
      $match: {
        [field]: new (require("mongoose").Types.ObjectId)(userData.userId),
        status: "delivered",
        ...dateFilter,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: `$${earningsField}` },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  const total = result[0]?.total || 0;
  const orderCount = result[0]?.orderCount || 0;

  return {
    total: Math.round(total * 100) / 100,
    perOrder: orderCount > 0 ? Math.round((total / orderCount) * 100) / 100 : 0,
    orderCount,
  };
};

const getMyTransactions = async (userData: any, query: QueryParams) => {
  const orderQuery = new QueryBuilder(
    Order.find({
      merchantId: userData.userId,
      status: "delivered",
    })
      .select(
        "orderId subtotal platformCommission merchantNetEarnings total deliveryFee createdAt",
      )
      .lean(),
    query,
  )
    .sort()
    .paginate()
    .fields();

  const [transactions, meta] = await Promise.all([
    orderQuery.modelQuery,
    orderQuery.countTotal(),
  ]);

  return { meta, transactions };
};

const PaymentService = {
  createIntent,
  getPayment,
  refund,
  createConnectAccount,
  getConnectStatus,
  processOrderPayouts,
  getMyEarnings,
  getMyTransactions,
};

export { PaymentService };
