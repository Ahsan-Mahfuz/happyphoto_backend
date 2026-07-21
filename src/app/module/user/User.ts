import { Schema, model } from "mongoose";
import type { IUser } from "./user.interface";
import {
  EnumUserRole,
  EnumVehicleType,
  EnumApplicationStatus,
} from "../../../util/enum";

const UserSchema = new Schema<IUser>(
  {
    authId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Auth",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(EnumUserRole),
      required: true,
    },
    profile_image: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    dateOfBirth: {
      type: String,
    },
    address: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },

    // property_host specific fields
    businessName: {
      type: String,
    },
    taxId: {
      type: String,
    },
    businessAddress: {
      type: String,
    },

    // driver specific fields
    isApproved: {
      type: Boolean,
    },
    applicationStatus: {
      type: String,
      enum: Object.values(EnumApplicationStatus),
      default: "pending",
    },
    vehicleType: {
      type: String,
      enum: Object.values(EnumVehicleType),
    },
    licenseNumber: {
      type: String,
    },
    plateNumber: {
      type: String,
    },
    drivingLicense_image: {
      type: String,
    },
    idCard_image: {
      type: String,
    },
    vehicleRegistration_image: {
      type: String,
    },
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    // shared driver + merchant fields
    averageRating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    // Driver online/offline session tracking — isOnline flips via socket
    // connect/disconnect or the manual toggle; onlineSince/totalOnlineSeconds
    // accumulate actual online duration (see socket/socket.controller.ts).
    onlineSince: {
      type: Date,
    },
    totalOnlineSeconds: {
      type: Number,
      default: 0,
    },
    stripeConnectAccountId: {
      type: String,
    },
    stripeConnectOnboarded: {
      type: Boolean,
      default: false,
    },
    // Payer-side Stripe Customer — separate from stripeConnectAccountId
    // (that one is for receiving payouts as a driver/merchant/host).
    stripeCustomerId: {
      type: String,
    },

    // merchant specific fields
    storeName: {
      type: String,
    },
    businessType: {
      type: String,
    },
    businessRegistrationNumber: {
      type: String,
    },
    vatNumber: {
      type: String,
    },
    storeLocationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    storeAddress: {
      type: String,
    },
    storeCity: {
      type: String,
    },
    storeState: {
      type: String,
    },
    storePostalCode: {
      type: String,
    },
    storeCountry: {
      type: String,
    },
    storeDescription: {
      type: String,
    },
    storeOpeningTime: {
      type: String,
    },
    storeClosingTime: {
      type: String,
    },
    storeAveragePrepTime: {
      type: Number,
    },
    storePhoneNumber: {
      type: String,
    },
    storeSupportEmail: {
      type: String,
    },
    storeDeliveryRadius: {
      type: Number,
    },
    storeMinimumOrder: {
      type: Number,
    },
    storeIsOpen: {
      type: Boolean,
      default: true,
    },
    store_logo: {
      type: String,
    },
    store_banner_image: {
      type: String,
    },
    store_front_image: {
      type: String,
    },
    trade_license_document: {
      type: String,
    },
    merchant_id_card_image: {
      type: String,
    },
    businessHours: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
UserSchema.index({ authId: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ locationCoordinates: "2dsphere" });
UserSchema.index({ storeLocationCoordinates: "2dsphere" });

const User = model<IUser>("User", UserSchema);

export = User;
