import ApiError from "../error/ApiError";
const { status } = require("http-status");

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["pending", "pending_host_approval", "cancelled"],
  pending: ["accepted_by_merchant", "cancelled"],
  pending_host_approval: ["approved", "cancelled"],
  approved: ["accepted_by_merchant", "cancelled"],
  accepted_by_merchant: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["driver_assigned", "cancelled"],
  driver_assigned: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

const validateTransition = (currentStatus: string, newStatus: string): void => {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Order with status "${currentStatus}" cannot be transitioned`,
    );
  }

  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Cannot transition order from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(", ")}`,
    );
  }
};

export { validateTransition, VALID_TRANSITIONS };
