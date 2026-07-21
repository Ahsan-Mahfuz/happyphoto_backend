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

    const existingUser = await User.findById(userId);
    if (!existingUser) return;

    const update: Record<string, any> = { isOnline };

    if (isOnline && !existingUser.isOnline) {
      // Was offline, going online — start a new session.
      update.onlineSince = new Date();
    } else if (!isOnline && existingUser.isOnline) {
      // Was online, going offline — accumulate this session's duration.
      const since = existingUser.onlineSince
        ? new Date(existingUser.onlineSince)
        : new Date();
      const seconds = Math.max(
        0,
        Math.round((Date.now() - since.getTime()) / 1000),
      );
      update.totalOnlineSeconds = (existingUser.totalOnlineSeconds || 0) + seconds;
      update.onlineSince = null;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      returnDocument: "after",
    });

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
