const { status } = require("http-status");
import ApiError from "../../../error/ApiError";
import validateFields from "../../../util/validateFields";
import Address from "./Address";

const addAddress = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["label", "street", "city"]);

  const existingCount = await Address.countDocuments({
    userId: userData.userId,
  });
  const makeDefault = existingCount === 0 || !!payload.isDefault;

  if (makeDefault) {
    await Address.updateMany(
      { userId: userData.userId },
      { isDefault: false },
    );
  }

  const addressData: Record<string, any> = {
    userId: userData.userId,
    label: payload.label,
    street: payload.street,
    city: payload.city,
    state: payload.state,
    postalCode: payload.postalCode,
    country: payload.country,
    isDefault: makeDefault,
  };

  if (payload.lat && payload.long) {
    addressData.coordinates = {
      type: "Point",
      coordinates: [parseFloat(payload.long), parseFloat(payload.lat)],
    };
  }

  return Address.create(addressData);
};

const getAddresses = async (userData: any) => {
  return Address.find({ userId: userData.userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });
};

const updateAddress = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["addressId"]);

  const address = await Address.findOne({
    _id: payload.addressId,
    userId: userData.userId,
  });
  if (!address) {
    throw new ApiError(status.NOT_FOUND, "Address not found");
  }

  const editable = ["label", "street", "city", "state", "postalCode", "country"];
  for (const field of editable) {
    if (payload[field] !== undefined) (address as any)[field] = payload[field];
  }

  if (payload.lat && payload.long) {
    address.coordinates = {
      type: { type: "Point" },
      coordinates: [parseFloat(payload.long), parseFloat(payload.lat)],
    };
  }

  if (payload.isDefault) {
    await Address.updateMany(
      { userId: userData.userId },
      { isDefault: false },
    );
    address.isDefault = true;
  }

  await address.save();
  return address;
};

const deleteAddress = async (userData: any, payload: Record<string, any>) => {
  validateFields(payload, ["addressId"]);

  const address = await Address.findOneAndDelete({
    _id: payload.addressId,
    userId: userData.userId,
  });
  if (!address) {
    throw new ApiError(status.NOT_FOUND, "Address not found");
  }

  // Promote another address to default if the deleted one was it.
  if (address.isDefault) {
    const next = await Address.findOne({ userId: userData.userId }).sort({
      createdAt: -1,
    });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  return address;
};

const setDefaultAddress = async (
  userData: any,
  payload: Record<string, any>,
) => {
  validateFields(payload, ["addressId"]);

  const address = await Address.findOne({
    _id: payload.addressId,
    userId: userData.userId,
  });
  if (!address) {
    throw new ApiError(status.NOT_FOUND, "Address not found");
  }

  await Address.updateMany({ userId: userData.userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  return address;
};

const AddressService = {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

export { AddressService };
