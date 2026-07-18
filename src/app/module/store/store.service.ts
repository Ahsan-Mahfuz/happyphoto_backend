const { status } = require("http-status");

import User from "../user/User";
import { Product } from "../product/Product";
import ApiError from "../../../error/ApiError";
import QueryBuilder from "../../../builder/queryBuilder";
import { EnumUserRole } from "../../../util/enum";

const EARTH_RADIUS_METERS = 6378137;

const getNearbyStores = async (query: any) => {
  const {
    longitude,
    latitude,
    maxDistance = 10000,
    searchTerm,
    sort,
    limit,
    page,
    fields,
    ...filterFields
  } = query;

  if (!longitude || !latitude) {
    throw new ApiError(
      status.BAD_REQUEST,
      "Longitude and latitude are required",
    );
  }

  const coordinates = [parseFloat(longitude), parseFloat(latitude)];
  const distance = parseFloat(maxDistance);

  const locationQuery = {
    role: EnumUserRole.MERCHANT,
    storeLocationCoordinates: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates,
        },
        $maxDistance: distance,
      },
    },
  };

  const restQuery = { searchTerm, sort, limit, page, fields, ...filterFields };

  const storeQuery = new QueryBuilder(User.find(locationQuery), restQuery)
    .search(["storeName", "storeDescription"])
    .filter()
    .paginate()
    .fields();

  const result = await storeQuery.modelQuery;

  // $nearSphere is not allowed inside countDocuments()'s aggregation, so the
  // total is computed separately using $geoWithin/$centerSphere instead.
  const countFilter: Record<string, unknown> = {
    role: EnumUserRole.MERCHANT,
    storeLocationCoordinates: {
      $geoWithin: {
        $centerSphere: [coordinates, distance / EARTH_RADIUS_METERS],
      },
    },
    ...filterFields,
  };

  if (searchTerm) {
    countFilter.$or = ["storeName", "storeDescription"].map((field) => ({
      [field]: { $regex: searchTerm, $options: "i" },
    }));
  }

  const total = await User.countDocuments(countFilter);
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const meta = {
    page: pageNum,
    limit: limitNum,
    total,
    totalPage: Math.ceil(total / limitNum),
  };

  return { meta, result };
};

const getStoreDetails = async (storeId: string) => {
  const store = await User.findOne({
    _id: storeId,
    role: EnumUserRole.MERCHANT,
  });
  if (!store) {
    throw new ApiError(status.NOT_FOUND, "Store not found");
  }
  return store;
};

const getStoreProducts = async (storeId: string, query: any) => {
  // ensure store exists
  const store = await User.findOne({
    _id: storeId,
    role: EnumUserRole.MERCHANT,
  });
  if (!store) {
    throw new ApiError(status.NOT_FOUND, "Store not found");
  }

  const productQuery = new QueryBuilder(
    Product.find({ merchant: storeId }),
    query,
  )
    .search(["name", "description", "category"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await productQuery.modelQuery;
  const meta = await productQuery.countTotal();

  return { meta, result };
};

export const StoreService = {
  getNearbyStores,
  getStoreDetails,
  getStoreProducts,
};
