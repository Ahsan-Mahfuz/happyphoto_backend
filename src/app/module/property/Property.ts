import { Schema, model } from "mongoose";
import type { IProperty } from "./property.interface";
import { EnumPropertyType } from "../../../util/enum";

const PropertySchema = new Schema<IProperty>(
  {
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    propertyName: {
      type: String,
      required: true,
    },
    propertyType: {
      type: String,
      enum: Object.values(EnumPropertyType),
      required: true,
    },
    physicalAddress: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    propertyCode: {
      type: String,
      required: true,
      unique: true,
    },
    locationCoordinates: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    // Set by admin moderation alongside `isFlagged`.
    flaggedReason: {
      type: String,
    },
    flaggedAt: {
      type: Date,
    },
    propertyImage: {
      type: String,
    },
    deliveryRules: {
      type: {
        defaultWindowStart: String,
        defaultWindowEnd: String,
        guestStayCheckIn: Date,
        guestStayCheckOut: Date,
      },
    },
    guestStayDates: {
      type: {
        checkIn: Date,
        checkOut: Date,
      },
    },
  },
  {
    timestamps: true,
  },
);

PropertySchema.index({ hostId: 1 });
PropertySchema.index({ isActive: 1 });
PropertySchema.index({ locationCoordinates: "2dsphere" });

const Property = model<IProperty>("Property", PropertySchema);

export = Property;
