import type { Types, Document } from "mongoose";

export interface IBusinessHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface IUser extends Document {
  authId: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  isOnline?: boolean;

  // property_host specific fields
  businessName?: string;
  taxId?: string;
  businessAddress?: string;

  // driver specific fields
  isApproved?: boolean;
  applicationStatus?: string;
  vehicleType?: string;
  licenseNumber?: string;
  plateNumber?: string;
  drivingLicense_image?: string;
  idCard_image?: string;
  vehicleRegistration_image?: string;
  locationCoordinates?: {
    type: {
      type: string;
      enum: ["Point"];
    };
    coordinates: [number, number];
  };

  // shared driver + merchant fields
  averageRating?: number;
  totalReviews?: number;
  totalDeliveries?: number;
  stripeConnectAccountId?: string;
  stripeConnectOnboarded?: boolean;

  // merchant specific fields
  storeName?: string;
  businessType?: string;
  businessRegistrationNumber?: string;
  vatNumber?: string;
  storeLocationCoordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storePostalCode?: string;
  storeCountry?: string;
  storeDescription?: string;
  storeOpeningTime?: string;
  storeClosingTime?: string;
  storeAveragePrepTime?: number;
  storePhoneNumber?: string;
  storeSupportEmail?: string;
  storeDeliveryRadius?: number;
  storeMinimumOrder?: number;
  storeIsOpen?: boolean;
  store_logo?: string;
  store_banner_image?: string;
  store_front_image?: string;
  trade_license_document?: string;
  merchant_id_card_image?: string;
  businessHours?: IBusinessHours;
}
