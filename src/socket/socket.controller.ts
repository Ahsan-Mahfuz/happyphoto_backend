import User from "../app/module/user/User";
import emitError from "./emitError";
import emitResult from "./emitResult";
import socketCatchAsync from "../util/socketCatchAsync";
import { EnumSocketEvent } from "../util/enum";
import validateSocketFields from "../util/validateSocketFields";
import { Server, Socket } from "socket.io";

const { default: status } = require("http-status");

const validateUser = socketCatchAsync(
  async (
    socket: Socket,
    io: Server,
    payload: Record<string, unknown>,
  ): Promise<any> => {
    if (!payload.userId) {
      emitError(
        socket,
        status.BAD_REQUEST,
        "userId is required to connect",
        "disconnect",
      );
      return null;
    }

    const user = await User.findById(payload.userId);

    if (!user) {
      emitError(socket, status.NOT_FOUND, "User not found", "disconnect");
      return null;
    }

    return user;
  },
);

const updateOnlineStatus = socketCatchAsync(
  async (
    socket: Socket,
    io: Server,
    payload: Record<string, unknown>,
  ): Promise<any> => {
    validateSocketFields(socket, payload, ["userId", "isOnline"]);
    const { userId, isOnline } = payload;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isOnline },
      { returnDocument: "after" },
    );

    socket.emit(
      EnumSocketEvent.ONLINE_STATUS,
      emitResult({
        statusCode: status.OK,
        success: true,
        message: `You are ${updatedUser.isOnline ? "online" : "offline"}`,
        data: { isOnline: updatedUser.isOnline },
      }),
    );
  },
);

const updateLocation = socketCatchAsync(
  async (
    socket: Socket,
    io: Server,
    payload: Record<string, unknown>,
  ): Promise<any> => {
    validateSocketFields(socket, payload, ["userId", "orderId", "lat", "long"]);

    const { userId, orderId, lat, long } = payload;

    const longitude = Number(long);
    const latitude = Number(lat);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return emitError(
        socket,
        status.BAD_REQUEST,
        "lat and long must be numbers",
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        // `type: "Point"` is required — locationCoordinates carries a 2dsphere
        // index, which rejects the whole document without it.
        locationCoordinates: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      { returnDocument: "after", runValidators: true },
    );

    // Broadcast only to clients in the specific order room
    io.to(`order_${orderId}`).emit(
      EnumSocketEvent.UPDATE_LOCATION,
      emitResult({
        statusCode: status.OK,
        success: true,
        message: "Location updated",
        data: updatedUser.locationCoordinates,
      }),
    );
  },
);

const SocketController = {
  validateUser,
  updateOnlineStatus,
  updateLocation,
};

export = SocketController;
