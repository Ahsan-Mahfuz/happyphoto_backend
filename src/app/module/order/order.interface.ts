import type { Types, Document } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  product_image?: string;
}

export interface IDeliveryWindow {
  start: Date;
  end: Date;
}

export interface IStayDates {
  checkIn: Date;
  checkOut: Date;
}

export interface IOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  merchantId: Types.ObjectId;
  driverId?: Types.ObjectId;
  propertyId?: Types.ObjectId;
  propertyHostId?: Types.ObjectId;
  items: IOrderItem[];
  status: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tipAmount: number;
  total: number;
  platformCommission?: number;
  driverPayout?: number;
  merchantNetEarnings?: number;
  deliveryAddress?: string;
  deliveryCoordinates?: {
    type: { type: string };
    coordinates: [number, number];
  };
  deliveryWindow?: IDeliveryWindow;
  stayDates?: IStayDates;
  specialInstructions?: string;
  promoCode?: string;
  proofOfDelivery?: string;
  cancelReason?: string;
  cancelledBy?: string;
  paymentId?: Types.ObjectId;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  pickedUpAt?: Date;
  approvedAt?: Date;
  acceptedByMerchantAt?: Date;
  acceptedByDriverAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
