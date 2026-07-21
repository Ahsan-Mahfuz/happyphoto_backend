const EnumUserRole = {
  USER: "USER",
  PROPERTY_HOST: "PROPERTY_HOST",
  DRIVER: "DRIVER",
  MERCHANT: "MERCHANT",
  ADMIN: "ADMIN",
};

const EnumPaymentStatus = {
  SUCCEEDED: "succeeded",
  UNPAID: "unpaid",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  FAILED: "failed",
};

const EnumSocketEvent = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  SOCKET_ERROR: "socket_error",
  ONLINE_STATUS: "online_status",
  UPDATE_LOCATION: "update_location",

  START_CHAT: "start_chat",
  SEND_MESSAGE: "send_message",

  SUBSCRIBE_DRIVER_LOCATION: "subscribe_driver_location",
  UNSUBSCRIBE_DRIVER_LOCATION: "unsubscribe_driver_location",
};

const EnumLoginProvider = {
  LOCAL: "local",
  GOOGLE: "google",
  APPLE: "apple",
};

const EnumUserAccountStatus = {
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
};

const EnumOrderStatus = {
  PENDING_PAYMENT: "pending_payment",
  PENDING: "pending",
  PENDING_HOST_APPROVAL: "pending_host_approval",
  APPROVED: "approved",
  ACCEPTED_BY_MERCHANT: "accepted_by_merchant",
  PREPARING: "preparing",
  READY_FOR_PICKUP: "ready_for_pickup",
  DRIVER_ASSIGNED: "driver_assigned",
  PICKED_UP: "picked_up",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const EnumDeliveryRequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  FORCE_APPROVED: "force_approved",
};

const EnumPayoutStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  COMPLETED: "completed",
  REJECTED: "rejected",
};

const EnumPayoutType = {
  WEEKLY_PAYOUT: "weekly_payout",
  MANUAL_WITHDRAWAL: "manual_withdrawal",
};

const EnumVehicleType = {
  BICYCLE: "bicycle",
  SCOOTER: "scooter",
  CAR: "car",
};

const EnumPropertyType = {
  APARTMENT: "apartment",
  VACATION_RENTAL: "vacation_rental",
  HOUSE: "house",
  CONDO: "condo",
  OTHER: "other",
};

const EnumApplicationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const EnumProductStatus = {
  ACTIVE: "active",
  OUT_OF_STOCK: "out_of_stock",
  DISABLED: "disabled",
};

const EnumReviewType = {
  MERCHANT: "merchant",
  DRIVER: "driver",
};

export {
  EnumUserRole,
  EnumPaymentStatus,
  EnumSocketEvent,
  EnumLoginProvider,
  EnumUserAccountStatus,
  EnumOrderStatus,
  EnumDeliveryRequestStatus,
  EnumPayoutStatus,
  EnumPayoutType,
  EnumVehicleType,
  EnumPropertyType,
  EnumApplicationStatus,
  EnumProductStatus,
  EnumReviewType,
};
