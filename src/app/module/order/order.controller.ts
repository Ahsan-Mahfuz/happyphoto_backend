const { default: status } = require("http-status");
import { OrderService } from "./order.service";
import sendResponse from "../../../util/sendResponse";
import catchAsync from "../../../util/catchAsync";
import type { Request, Response } from "express";
import ApiError from "../../../error/ApiError";
import { QueryParams } from "../../../builder/queryBuilder";

const placeOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.placeOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const getOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getOrder(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order retrieved",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getMyOrders(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Orders retrieved",
    data: result.orders,
    meta: result.meta,
  });
});

const acceptOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.acceptOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order accepted",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.updateOrderStatus(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order status updated",
    data: result,
  });
});

const getActiveOrders = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.getActiveOrders(
    req.user,
    req.query as QueryParams,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Active orders retrieved",
    data: result.orders,
    meta: result.meta,
  });
});

const getPendingDeliveryRequests = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
    const result = await OrderService.getPendingDeliveryRequests(
      req.user,
      req.query as QueryParams,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Pending delivery requests retrieved",
      data: result.orders,
      meta: result.meta,
    });
  },
);

const trackOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.trackOrder(req.user, req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order tracking data retrieved",
    data: result,
  });
});

const assignDriver = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.assignDriver(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver assigned",
    data: result,
  });
});

const acceptDelivery = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.acceptDelivery(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Delivery accepted",
    data: result,
  });
});

const pickedUp = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.pickedUp(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order picked up",
    data: result,
  });
});

const outForDelivery = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.outForDelivery(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order is out for delivery",
    data: result,
  });
});

const deliver = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.deliver(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order delivered successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(status.UNAUTHORIZED, "Unauthorized");
  const result = await OrderService.cancelOrder(req.user, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Order cancelled",
    data: result,
  });
});

const OrderController = {
  placeOrder,
  getOrder,
  getMyOrders,
  acceptOrder,
  updateOrderStatus,
  getActiveOrders,
  getPendingDeliveryRequests,
  trackOrder,
  assignDriver,
  acceptDelivery,
  pickedUp,
  outForDelivery,
  deliver,
  cancelOrder,
};

export { OrderController };
