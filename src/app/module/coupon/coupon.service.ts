const { default: status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import { AuthUserPayload } from "../../../types/auth.types";
import { Coupon, EnumDiscountType } from "./Coupon";

/**
 * `expires` is what the dashboard's date picker produces; `expiresAt` is the
 * stored field. Accept either so the client can send its own field name.
 */
const parseExpiry = (payload: Record<string, any>) => {
  const raw = payload.expiresAt ?? payload.expires;
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const assertValidDiscount = (discountType: string, discountValue: number) => {
  if (!Object.values(EnumDiscountType).includes(discountType)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `discountType must be one of: ${Object.values(EnumDiscountType).join(", ")}`,
    );
  }
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new ApiError(status.BAD_REQUEST, "discountValue must be greater than 0");
  }
  if (discountType === EnumDiscountType.PERCENT && discountValue > 100) {
    throw new ApiError(status.BAD_REQUEST, "A percentage discount cannot exceed 100");
  }
};

const createCoupon = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["code", "discountType", "discountValue"]);

  const discountValue = Number(payload.discountValue);
  assertValidDiscount(payload.discountType, discountValue);

  const expiresAt = parseExpiry(payload);
  if (!expiresAt) {
    throw new ApiError(status.BAD_REQUEST, "A valid expiry date is required");
  }

  const code = String(payload.code).trim().toUpperCase();

  const exists = await Coupon.findOne({ merchant: userData.userId, code });
  if (exists) {
    throw new ApiError(status.CONFLICT, "You already have a coupon with that code");
  }

  return await Coupon.create({
    merchant: userData.userId,
    code,
    discountType: payload.discountType,
    discountValue,
    minOrder: Number(payload.minOrder) || 0,
    expiresAt,
    isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    ...(payload.usageLimit && { usageLimit: Number(payload.usageLimit) }),
  });
};

const getMyCoupons = async (userData: AuthUserPayload, query: QueryParams) => {
  const couponQuery = new QueryBuilder(
    Coupon.find({ merchant: userData.userId }),
    query,
  )
    .search(["code"])
    .filter()
    .sort()
    .paginate();

  const [coupons, meta] = await Promise.all([
    couponQuery.modelQuery,
    couponQuery.countTotal(),
  ]);

  return { meta, coupons };
};

const updateCoupon = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["couponId"]);

  const coupon = await Coupon.findById(payload.couponId);
  if (!coupon) throw new ApiError(status.NOT_FOUND, "Coupon not found");
  if (coupon.merchant.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This coupon does not belong to your store");
  }

  if (payload.discountType !== undefined || payload.discountValue !== undefined) {
    const discountType = payload.discountType ?? coupon.discountType;
    const discountValue =
      payload.discountValue !== undefined
        ? Number(payload.discountValue)
        : coupon.discountValue;
    assertValidDiscount(discountType, discountValue);
    coupon.discountType = discountType;
    coupon.discountValue = discountValue;
  }

  if (payload.code !== undefined) {
    const code = String(payload.code).trim().toUpperCase();
    const clash = await Coupon.findOne({
      merchant: userData.userId,
      code,
      _id: { $ne: coupon._id },
    });
    if (clash) {
      throw new ApiError(status.CONFLICT, "You already have a coupon with that code");
    }
    coupon.code = code;
  }

  if (payload.minOrder !== undefined) coupon.minOrder = Number(payload.minOrder) || 0;
  if (payload.isActive !== undefined) coupon.isActive = Boolean(payload.isActive);
  if (payload.usageLimit !== undefined) {
    coupon.usageLimit = payload.usageLimit ? Number(payload.usageLimit) : undefined;
  }

  const expiresAt = parseExpiry(payload);
  if (expiresAt) coupon.expiresAt = expiresAt;

  await coupon.save();
  return coupon;
};

const deleteCoupon = async (
  userData: AuthUserPayload,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["couponId"]);

  const coupon = await Coupon.findById(payload.couponId);
  if (!coupon) throw new ApiError(status.NOT_FOUND, "Coupon not found");
  if (coupon.merchant.toString() !== userData.userId) {
    throw new ApiError(status.FORBIDDEN, "This coupon does not belong to your store");
  }

  await Coupon.deleteOne({ _id: coupon._id });
  return { message: "Coupon deleted successfully" };
};

/**
 * Checks a code for a given store and returns what it is worth on a subtotal.
 * Read-only: it does not reserve or increment the redemption count.
 */
const validateCoupon = async (query: QueryParams & Record<string, any>) => {
  validateFields(query, ["code", "merchantId"]);

  const coupon = await Coupon.findOne({
    merchant: query.merchantId,
    code: String(query.code).trim().toUpperCase(),
  });

  if (!coupon) throw new ApiError(status.NOT_FOUND, "Coupon not found");
  if (!coupon.isActive) throw new ApiError(status.BAD_REQUEST, "This coupon is inactive");
  if (coupon.expiresAt.getTime() < Date.now()) {
    throw new ApiError(status.BAD_REQUEST, "This coupon has expired");
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(status.BAD_REQUEST, "This coupon has reached its usage limit");
  }

  // Without a subtotal we can only confirm the code exists and is usable.
  const subtotal = Number(query.subtotal);
  if (!Number.isFinite(subtotal)) {
    return { coupon, discount: null as number | null };
  }

  if (subtotal < coupon.minOrder) {
    throw new ApiError(
      status.BAD_REQUEST,
      `This coupon needs a minimum order of ${coupon.minOrder}`,
    );
  }

  const rawDiscount =
    coupon.discountType === EnumDiscountType.PERCENT
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  // Never discount below zero.
  const discount = Number(Math.min(rawDiscount, subtotal).toFixed(2));

  return { coupon, discount, subtotalAfterDiscount: Number((subtotal - discount).toFixed(2)) };
};

const CouponService = {
  createCoupon,
  getMyCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};

export { CouponService };
