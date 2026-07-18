const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import QueryBuilder, { QueryParams } from "../../../builder/queryBuilder";
import validateFields from "../../../util/validateFields";
import { EnumUserRole } from "../../../util/enum";
import Review from "./Review";

interface UserData {
  userId: string;
  role: string;
}

import mongoose from "mongoose";
import User from "../user/User";

const postReview = async (
  userData: UserData,
  payload: Record<string, unknown>,
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const review = await Review.create(
      [{ ...payload, user: userData.userId }],
      { session },
    );

    const targetUserId =
      payload.reviewType === "merchant" ? payload.merchantId : payload.driverId;
    if (!targetUserId)
      throw new ApiError(status.BAD_REQUEST, "Target user ID is missing");

    const targetUser = await User.findById(targetUserId).session(session);
    if (!targetUser)
      throw new ApiError(status.NOT_FOUND, "Target user not found");

    const total = targetUser.totalReviews || 0;
    const currentAvg = targetUser.averageRating || 0;

    targetUser.averageRating =
      (currentAvg * total + Number(payload.rating)) / (total + 1);
    targetUser.totalReviews = total + 1;

    await targetUser.save({ session });
    await session.commitTransaction();

    return review[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const getAllReviews = async (userData: UserData, query: QueryParams) => {
  const queryObj =
    userData.role === EnumUserRole.ADMIN ? {} : { user: userData.userId };

  const reviewQuery = new QueryBuilder(
    Review.find(queryObj)
      .populate([{ path: "user", select: "-createdAt -updatedAt -__v" }])
      .lean(),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    reviewQuery.modelQuery,
    reviewQuery.countTotal(),
  ]);

  return { meta, result };
};

const getReview = async (userData: UserData, query: { reviewId?: string }) => {
  validateFields(query, ["reviewId"]);

  const review = await Review.findById(query.reviewId).lean();
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  return review;
};

/**
 * Reviews are addressed by id alone, so without an ownership check any
 * authenticated caller could edit or delete anyone else's review.
 */
const assertOwnsReview = async (userData: UserData, reviewId: string) => {
  const review = await Review.findById(reviewId).select("user");
  if (!review) throw new ApiError(status.NOT_FOUND, "Review not found");

  if (
    userData.role !== EnumUserRole.ADMIN &&
    review.user.toString() !== userData.userId
  )
    throw new ApiError(status.FORBIDDEN, "This is not your review");

  return review;
};

const updateReview = async (
  userData: UserData,
  payload: Record<string, unknown>,
) => {
  validateFields(payload, ["reviewId"]);

  const updateData = {
    ...(payload.rating && { rating: payload.rating }),
    ...(payload.review && { review: payload.review }),
  };

  await assertOwnsReview(userData, payload.reviewId as string);

  const result = await Review.findByIdAndUpdate(
    payload.reviewId,
    { $set: updateData },
    { returnDocument: "after", runValidators: true },
  );

  if (!result) throw new ApiError(status.NOT_FOUND, "Review not found");

  return result;
};

const deleteReview = async (
  userData: UserData,
  payload: { reviewId?: string },
) => {
  validateFields(payload, ["reviewId"]);

  await assertOwnsReview(userData, payload.reviewId as string);

  const result = await Review.deleteOne({ _id: payload.reviewId });

  if (!result.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Review not found");

  return result;
};

const ReviewService = {
  postReview,
  getAllReviews,
  getReview,
  updateReview,
  deleteReview,
};

export { ReviewService };
