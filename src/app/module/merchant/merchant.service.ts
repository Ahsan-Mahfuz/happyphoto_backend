const { default: status } = require("http-status");
import mongoose from "mongoose";
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import Order from "../order/Order";
import User from "../user/User";
import { Product } from "../product/Product";
import { Coupon } from "../coupon/Coupon";
import { EnumOrderStatus } from "../../../util/enum";

/** Anything not yet delivered or cancelled is still live for the merchant. */
const OPEN_STATUSES = [
  EnumOrderStatus.PENDING,
  EnumOrderStatus.PENDING_HOST_APPROVAL,
  EnumOrderStatus.APPROVED,
  EnumOrderStatus.ACCEPTED_BY_MERCHANT,
  EnumOrderStatus.PREPARING,
  EnumOrderStatus.READY_FOR_PICKUP,
  EnumOrderStatus.DRIVER_ASSIGNED,
  EnumOrderStatus.PICKED_UP,
  EnumOrderStatus.OUT_FOR_DELIVERY,
];

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

/**
 * Header numbers for the merchant dashboard home.
 * Revenue is taken from Order.merchantNetEarnings (subtotal minus the platform
 * commission), which is what the merchant is actually paid — not order.total,
 * which includes delivery and service fees the merchant never receives.
 */
const getDashboardStats = async (userData: AuthUserPayload) => {
  const merchantId = toObjectId(userData.userId);

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [
    totalOrders,
    openOrders,
    pendingOrders,
    deliveredToday,
    revenueToday,
    revenueAllTime,
    productCount,
    outOfStock,
    merchant,
    statusGroups,
  ] = await Promise.all([
    Order.countDocuments({ merchantId }),
    Order.countDocuments({ merchantId, status: { $in: OPEN_STATUSES } }),
    Order.countDocuments({ merchantId, status: EnumOrderStatus.PENDING }),
    Order.countDocuments({
      merchantId,
      status: EnumOrderStatus.DELIVERED,
      actualDeliveryTime: { $gte: startOfToday },
    }),
    Order.aggregate([
      {
        $match: {
          merchantId,
          status: EnumOrderStatus.DELIVERED,
          actualDeliveryTime: { $gte: startOfToday },
        },
      },
      { $group: { _id: null, total: { $sum: "$merchantNetEarnings" } } },
    ]),
    Order.aggregate([
      { $match: { merchantId, status: EnumOrderStatus.DELIVERED } },
      { $group: { _id: null, total: { $sum: "$merchantNetEarnings" } } },
    ]),
    Product.countDocuments({ merchant: merchantId }),
    Product.countDocuments({ merchant: merchantId, quantity: { $lte: 0 } }),
    User.findById(merchantId).select("averageRating totalReviews storeIsOpen").lean(),
    // Feeds the per-tab badges on the Orders page in one aggregate rather than
    // one count query per tab.
    Order.aggregate([
      { $match: { merchantId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = statusGroups.reduce(
    (acc: Record<string, number>, row: any) => {
      acc[row._id] = row.count;
      return acc;
    },
    {},
  );

  return {
    orders: {
      total: totalOrders,
      open: openOrders,
      pendingAcceptance: pendingOrders,
      deliveredToday,
      statusCounts,
    },
    revenue: {
      today: Number((revenueToday[0]?.total ?? 0).toFixed(2)),
      allTime: Number((revenueAllTime[0]?.total ?? 0).toFixed(2)),
    },
    products: {
      total: productCount,
      outOfStock,
    },
    rating: {
      average: merchant?.averageRating ?? 0,
      totalReviews: merchant?.totalReviews ?? 0,
    },
    storeIsOpen: merchant?.storeIsOpen ?? true,
  };
};

/**
 * Revenue/orders time series plus best sellers, for the Analytics page.
 * Buckets days in UTC to match the $dateToString default.
 */
const getAnalytics = async (
  userData: AuthUserPayload,
  query: QueryParams & { days?: string },
) => {
  const merchantId = toObjectId(userData.userId);
  const days = Math.min(Math.max(Number(query.days) || 7, 1), 365);

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const [series, topProducts, totals] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          merchantId,
          status: EnumOrderStatus.DELIVERED,
          actualDeliveryTime: { $gte: start },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$actualDeliveryTime" },
          },
          revenue: { $sum: "$merchantNetEarnings" },
          grossValue: { $sum: "$subtotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Best sellers by units, unwound from the order line items.
    Order.aggregate([
      {
        $match: {
          merchantId,
          status: EnumOrderStatus.DELIVERED,
          actualDeliveryTime: { $gte: start },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          units: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      {
        $match: {
          merchantId,
          status: EnumOrderStatus.DELIVERED,
          actualDeliveryTime: { $gte: start },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$merchantNetEarnings" },
          orders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byDate = new Map(series.map((s: any) => [s._id, s]));
  const filledSeries = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const key = date.toISOString().slice(0, 10);
    const found: any = byDate.get(key);
    return {
      date: key,
      revenue: Number((found?.revenue ?? 0).toFixed(2)),
      grossValue: Number((found?.grossValue ?? 0).toFixed(2)),
      orders: found?.orders ?? 0,
    };
  });

  const totalOrders = totals[0]?.orders ?? 0;
  const totalRevenue = Number((totals[0]?.revenue ?? 0).toFixed(2));

  return {
    days,
    series: filledSeries,
    totals: {
      revenue: totalRevenue,
      orders: totalOrders,
      averageOrderValue: totalOrders
        ? Number((totalRevenue / totalOrders).toFixed(2))
        : 0,
    },
    topProducts: topProducts.map((p: any) => ({
      productId: p._id,
      name: p.name,
      units: p.units,
      revenue: Number(p.revenue.toFixed(2)),
    })),
  };
};

/**
 * The merchant's customers, derived from their orders — there is no customer
 * relationship stored anywhere, so it is aggregated on read.
 */
const getMyCustomers = async (
  userData: AuthUserPayload,
  query: QueryParams & { searchTerm?: string },
) => {
  const merchantId = toObjectId(userData.userId);
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 10, 1);

  const pipeline: any[] = [
    { $match: { merchantId } },
    {
      $group: {
        _id: "$userId",
        totalOrders: { $sum: 1 },
        totalSpending: {
          // Only delivered orders represent money actually spent.
          $sum: {
            $cond: [
              { $eq: ["$status", EnumOrderStatus.DELIVERED] },
              "$total",
              0,
            ],
          },
        },
        deliveredOrders: {
          $sum: {
            $cond: [{ $eq: ["$status", EnumOrderStatus.DELIVERED] }, 1, 0],
          },
        },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 1,
        name: "$user.name",
        email: "$user.email",
        phoneNumber: "$user.phoneNumber",
        profile_image: "$user.profile_image",
        totalOrders: 1,
        deliveredOrders: 1,
        totalSpending: { $round: ["$totalSpending", 2] },
        lastOrderAt: 1,
      },
    },
  ];

  if (query.searchTerm) {
    const regex = new RegExp(String(query.searchTerm), "i");
    pipeline.push({ $match: { $or: [{ name: regex }, { email: regex }] } });
  }

  const sortField = String(query.sort || "-lastOrderAt");
  const direction = sortField.startsWith("-") ? -1 : 1;
  const sortKey = sortField.replace(/^-/, "");
  pipeline.push({ $sort: { [sortKey]: direction } });

  // $facet keeps the count and the page in a single round trip.
  const [result] = await Order.aggregate([
    ...pipeline,
    {
      $facet: {
        data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.total?.[0]?.count ?? 0;

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    customers: result?.data ?? [],
  };
};

/**
 * Inventory view over the merchant's own products, with a caller-supplied
 * low-stock threshold. The Product schema has no threshold field, so "low
 * stock" is a reporting concept rather than stored state.
 */
const getInventory = async (
  userData: AuthUserPayload,
  query: QueryParams & { lowStockThreshold?: string; stockStatus?: string },
) => {
  const merchantId = toObjectId(userData.userId);
  const threshold = Math.max(Number(query.lowStockThreshold) || 10, 0);

  const { lowStockThreshold, stockStatus, ...restQuery } = query;

  const baseFilter: Record<string, any> = { merchant: merchantId };
  if (stockStatus === "out_of_stock") baseFilter.quantity = { $lte: 0 };
  else if (stockStatus === "low_stock") {
    baseFilter.quantity = { $gt: 0, $lte: threshold };
  } else if (stockStatus === "in_stock") baseFilter.quantity = { $gt: threshold };

  const productQuery = new QueryBuilder(Product.find(baseFilter), restQuery)
    .search(["name", "category"])
    .filter()
    .sort()
    .paginate();

  const [products, meta, counts] = await Promise.all([
    productQuery.modelQuery,
    productQuery.countTotal(),
    Promise.all([
      Product.countDocuments({ merchant: merchantId }),
      Product.countDocuments({ merchant: merchantId, quantity: { $gt: threshold } }),
      Product.countDocuments({
        merchant: merchantId,
        quantity: { $gt: 0, $lte: threshold },
      }),
      Product.countDocuments({ merchant: merchantId, quantity: { $lte: 0 } }),
    ]),
  ]);

  const [total, inStock, lowStock, outOfStock] = counts;

  return {
    meta,
    products,
    summary: { total, inStock, lowStock, outOfStock, threshold },
  };
};

/** Products at or below the threshold — drives the dashboard's low-stock card. */
const getLowStockProducts = async (
  userData: AuthUserPayload,
  query: QueryParams & { lowStockThreshold?: string; limit?: string },
) => {
  const threshold = Math.max(Number(query.lowStockThreshold) || 10, 0);
  const limit = Math.max(Number(query.limit) || 5, 1);

  const products = await Product.find({
    merchant: toObjectId(userData.userId),
    quantity: { $lte: threshold },
  })
    .select("name product_image quantity category price status")
    .sort({ quantity: 1 })
    .limit(limit)
    .lean();

  return { threshold, products };
};

const MerchantService = {
  getDashboardStats,
  getAnalytics,
  getMyCustomers,
  getInventory,
  getLowStockProducts,
};

export { MerchantService };
