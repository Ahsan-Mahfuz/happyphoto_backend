import Auth from "../app/module/auth/Auth";
import Admin from "../app/module/admin/Admin";
import User from "../app/module/user/User";
import { Product } from "../app/module/product/Product";
import Order from "../app/module/order/Order";
import Property from "../app/module/property/Property";
import Review from "../app/module/review/Review";
import { SupportTicket, EnumTicketCategory, EnumTicketStatus } from "../app/module/support/SupportTicket";
import Feedback from "../app/module/feedback/Feedback";
import Payment from "../app/module/payment/Payment";
import Payout from "../app/module/payment/Payout";
import { Coupon, EnumDiscountType } from "../app/module/coupon/Coupon";
import Notification from "../app/module/notification/Notification";
import AdminNotification from "../app/module/notification/AdminNotification";
import { TermsConditions, PrivacyPolicy, FAQ, AboutUs, ContactUs } from "../app/module/manage/Manage";
import config from "../config";
import {
  EnumUserRole,
  EnumVehicleType,
  EnumApplicationStatus,
  EnumOrderStatus,
  EnumPropertyType,
  EnumReviewType,
  EnumPaymentStatus,
  EnumPayoutStatus,
  EnumPayoutType,
} from "../util/enum";
import { logger, errorLogger } from "../util/logger";

const seedDatabase = async () => {
  try {
    logger.info("Starting database seeding process...");

    // -------------------------------------------------------------
    // 1. SEED ADMIN
    // -------------------------------------------------------------
    const adminAccounts = [
      {
        email: config.admin.email || "happyphotto.admin@yopmail.com",
        password: config.admin.password || "Admin@1234",
        name: config.admin.name || "Super Admin",
      },
      {
        email: "admin@happyphoto.com",
        password: "Password123!",
        name: "Admin User",
      },
    ];

    for (const a of adminAccounts) {
      let adminAuth = await Auth.findOne({ email: a.email });
      if (!adminAuth) {
        adminAuth = await Auth.create({
          name: a.name,
          email: a.email,
          password: a.password,
          role: EnumUserRole.ADMIN,
          isVerified: true,
          isActive: true,
          isBlocked: false,
        });
      }

      let adminProfile = await Admin.findOne({ email: a.email });
      if (!adminProfile) {
        await Admin.create({
          authId: adminAuth._id,
          name: a.name,
          email: a.email,
          phoneNumber: "+1 555-0100",
          profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300",
        });
      }
    }

    // -------------------------------------------------------------
    // 2. SEED MERCHANTS
    // -------------------------------------------------------------
    const merchantsData = [
      {
        name: "Fresh Organic Market",
        email: "merchant1@happyphoto.com",
        storeName: "Fresh Organic Market",
        businessType: "Grocery & Produce",
        storeAddress: "123 Green St, New York, NY",
        storeCity: "New York",
        storeState: "NY",
        storePostalCode: "10001",
        storeCountry: "USA",
        storeDescription: "Fresh organic produce, dairy, bakery, and farm fresh items delivered to your door.",
        storeOpeningTime: "08:00 AM",
        storeClosingTime: "10:00 PM",
        storeAveragePrepTime: 20,
        storePhoneNumber: "+1 555-0192",
        storeSupportEmail: "support@freshorganic.com",
        storeDeliveryRadius: 15,
        storeMinimumOrder: 10,
        storeIsOpen: true,
        store_logo: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500",
        store_banner_image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000",
      },
      {
        name: "Gourmet Bistro & Cafe",
        email: "merchant2@happyphoto.com",
        storeName: "Gourmet Bistro & Cafe",
        businessType: "Restaurant & Bakery",
        storeAddress: "456 Artisan Way, Brooklyn, NY",
        storeCity: "New York",
        storeState: "NY",
        storePostalCode: "11201",
        storeCountry: "USA",
        storeDescription: "Artisanal coffee, handcrafted sandwiches, pastries, and gourmet lunch boxes.",
        storeOpeningTime: "07:00 AM",
        storeClosingTime: "09:00 PM",
        storeAveragePrepTime: 15,
        storePhoneNumber: "+1 555-0193",
        storeSupportEmail: "hello@gourmetbistro.com",
        storeDeliveryRadius: 10,
        storeMinimumOrder: 12,
        storeIsOpen: true,
        store_logo: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500",
        store_banner_image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000",
      },
      {
        name: "The Daily Grocery Hub",
        email: "merchant3@happyphoto.com",
        storeName: "The Daily Grocery Hub",
        businessType: "Supermarket",
        storeAddress: "789 Main Ave, Queens, NY",
        storeCity: "New York",
        storeState: "NY",
        storePostalCode: "11101",
        storeCountry: "USA",
        storeDescription: "Your one-stop shop for fresh fruits, vegetables, beverages, and pantry essentials.",
        storeOpeningTime: "06:00 AM",
        storeClosingTime: "11:00 PM",
        storeAveragePrepTime: 25,
        storePhoneNumber: "+1 555-0194",
        storeSupportEmail: "info@dailygrocery.com",
        storeDeliveryRadius: 20,
        storeMinimumOrder: 15,
        storeIsOpen: true,
        store_logo: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500",
        store_banner_image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000",
      },
    ];

    for (const m of merchantsData) {
      let auth = await Auth.findOne({ email: m.email });
      if (!auth) {
        auth = await Auth.create({
          name: m.name,
          email: m.email,
          password: "Password123!",
          role: EnumUserRole.MERCHANT,
          isVerified: true,
          isActive: true,
          isBlocked: false,
        });
      }
      let user = await User.findOne({ email: m.email });
      if (!user) {
        await User.create({
          authId: auth._id,
          name: m.name,
          email: m.email,
          role: EnumUserRole.MERCHANT,
          profile_image: m.store_logo,
          phoneNumber: m.storePhoneNumber,
          address: m.storeAddress,
          isOnline: true,
          isApproved: true,
          applicationStatus: EnumApplicationStatus.APPROVED,
          averageRating: 4.8,
          totalReviews: 24,
          totalDeliveries: 150,
          ...m,
        });
      }
    }
    const merchantUsers = await User.find({ role: EnumUserRole.MERCHANT });

    // -------------------------------------------------------------
    // 3. SEED DRIVERS
    // -------------------------------------------------------------
    const driversData = [
      {
        name: "David Miller",
        email: "driver1@happyphoto.com",
        phoneNumber: "+1 555-0181",
        vehicleType: EnumVehicleType.CAR,
        licenseNumber: "DL-987654321",
        plateNumber: "NY-789-XYZ",
        isApproved: true,
        applicationStatus: EnumApplicationStatus.APPROVED,
        totalDeliveries: 142,
        averageRating: 4.9,
        totalReviews: 38,
        isOnline: true,
      },
      {
        name: "Robert Johnson",
        email: "driver2@happyphoto.com",
        phoneNumber: "+1 555-0182",
        vehicleType: EnumVehicleType.SCOOTER,
        licenseNumber: "DL-456789123",
        plateNumber: "NY-456-ABC",
        isApproved: true,
        applicationStatus: EnumApplicationStatus.APPROVED,
        totalDeliveries: 89,
        averageRating: 4.8,
        totalReviews: 24,
        isOnline: true,
      },
      {
        name: "Sam Wilson",
        email: "driver3@happyphoto.com",
        phoneNumber: "+1 555-0183",
        vehicleType: EnumVehicleType.BICYCLE,
        licenseNumber: "DL-123456789",
        plateNumber: "NY-123-DEF",
        isApproved: false,
        applicationStatus: EnumApplicationStatus.PENDING,
        totalDeliveries: 0,
        averageRating: 0,
        totalReviews: 0,
        isOnline: false,
      },
    ];

    for (const d of driversData) {
      let auth = await Auth.findOne({ email: d.email });
      if (!auth) {
        auth = await Auth.create({
          name: d.name,
          email: d.email,
          password: "Password123!",
          role: EnumUserRole.DRIVER,
          isVerified: true,
          isActive: true,
          isBlocked: false,
        });
      }
      let user = await User.findOne({ email: d.email });
      if (!user) {
        await User.create({
          authId: auth._id,
          name: d.name,
          email: d.email,
          role: EnumUserRole.DRIVER,
          profile_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
          address: "New York, NY",
          ...d,
        });
      }
    }
    const driverUsers = await User.find({ role: EnumUserRole.DRIVER });

    // -------------------------------------------------------------
    // 4. SEED PROPERTY HOSTS & PROPERTIES
    // -------------------------------------------------------------
    const hostEmail = "host1@happyphoto.com";
    let hostAuth = await Auth.findOne({ email: hostEmail });
    if (!hostAuth) {
      hostAuth = await Auth.create({
        name: "Sarah Jenkins",
        email: hostEmail,
        password: "Password123!",
        role: EnumUserRole.PROPERTY_HOST,
        isVerified: true,
        isActive: true,
        isBlocked: false,
      });
    }
    let hostUser = await User.findOne({ email: hostEmail });
    if (!hostUser) {
      hostUser = await User.create({
        authId: hostAuth._id,
        name: "Sarah Jenkins",
        email: hostEmail,
        role: EnumUserRole.PROPERTY_HOST,
        profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300",
        phoneNumber: "+1 555-0171",
        address: "100 Ocean Drive, Miami, FL",
        businessName: "Seaside Vacation Rentals",
        taxId: "TAX-998877",
        businessAddress: "100 Ocean Drive, Miami, FL",
      });
    }

    const propertiesData = [
      {
        propertyName: "Ocean Breeze Vacation Villa",
        propertyType: EnumPropertyType.VACATION_RENTAL,
        physicalAddress: "100 Ocean Drive, Miami, FL",
        city: "Miami",
        state: "FL",
        postalCode: "33139",
        country: "USA",
        propertyCode: "PROP-101",
        isActive: true,
        propertyImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600",
      },
      {
        propertyName: "Skyline Luxury Penthouse",
        propertyType: EnumPropertyType.APARTMENT,
        physicalAddress: "200 Sky Tower, New York, NY",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        propertyCode: "PROP-102",
        isActive: true,
        propertyImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600",
      },
    ];

    if (hostUser) {
      for (const p of propertiesData) {
        let prop = await Property.findOne({ propertyCode: p.propertyCode });
        if (!prop) {
          await Property.create({
            hostId: hostUser._id,
            ...p,
          });
        }
      }
    }
    const properties = await Property.find();

    // -------------------------------------------------------------
    // 5. SEED CUSTOMERS / USERS
    // -------------------------------------------------------------
    const usersData = [
      { name: "Emily Watson", email: "user1@happyphoto.com", phone: "+1 555-0111" },
      { name: "Michael Brown", email: "user2@happyphoto.com", phone: "+1 555-0112" },
      { name: "Jessica Davis", email: "user3@happyphoto.com", phone: "+1 555-0113" },
    ];

    for (const u of usersData) {
      let auth = await Auth.findOne({ email: u.email });
      if (!auth) {
        auth = await Auth.create({
          name: u.name,
          email: u.email,
          password: "Password123!",
          role: EnumUserRole.USER,
          isVerified: true,
          isActive: true,
          isBlocked: false,
        });
      }
      let user = await User.findOne({ email: u.email });
      if (!user) {
        await User.create({
          authId: auth._id,
          name: u.name,
          email: u.email,
          role: EnumUserRole.USER,
          profile_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300",
          phoneNumber: u.phone,
          address: "55 Fifth Ave, New York, NY",
        });
      }
    }
    const customerUsers = await User.find({ role: EnumUserRole.USER });

    // -------------------------------------------------------------
    // 6. SEED PRODUCTS
    // -------------------------------------------------------------
    const existingProductsCount = await Product.countDocuments();

    if (existingProductsCount === 0 && merchantUsers.length > 0) {
      const productsData = [
        // Merchant 1 (Fresh Organic Market)
        {
          merchant: merchantUsers[0]._id,
          name: "Organic Farm Fresh Milk 1L",
          category: "Dairy & Eggs",
          price: 4.99,
          quantity: 50,
          description: "Pasteurized 100% pure organic whole milk from local pasture-raised cows.",
          product_image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: merchantUsers[0]._id,
          name: "Free Range Organic Eggs (12pk)",
          category: "Dairy & Eggs",
          price: 6.49,
          quantity: 40,
          description: "Grade A organic large brown eggs from pasture-raised free-range hens.",
          product_image: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: merchantUsers[0]._id,
          name: "Fresh Organic Hass Avocados (4pk)",
          category: "Fruits & Vegetables",
          price: 5.99,
          quantity: 35,
          description: "Ripe, creamy organic Hass avocados packed with healthy fats and rich flavor.",
          product_image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: merchantUsers[0]._id,
          name: "Organic Strawberries 400g",
          category: "Fruits & Vegetables",
          price: 4.49,
          quantity: 25,
          description: "Sweet, juicy organic strawberries picked at peak ripeness.",
          product_image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=500",
          isAvailable: true,
          status: "active",
        },
        // Merchant 2 (Gourmet Bistro & Cafe)
        {
          merchant: (merchantUsers[1] || merchantUsers[0])._id,
          name: "Artisan Sourdough Bread Loaf",
          category: "Bakery",
          price: 7.50,
          quantity: 20,
          description: "Traditional slow-fermented sourdough bread with a crispy crust and soft airy crumb.",
          product_image: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: (merchantUsers[1] || merchantUsers[0])._id,
          name: "Italian Espresso Dark Roast 500g",
          category: "Beverages",
          price: 14.99,
          quantity: 15,
          description: "Premium single-origin dark roast Arabica espresso coffee beans.",
          product_image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: (merchantUsers[1] || merchantUsers[0])._id,
          name: "Gourmet Grilled Chicken Sandwich",
          category: "Prepared Meals",
          price: 12.99,
          quantity: 30,
          description: "Marinated grilled chicken breast, herb aioli, fresh arugula on warm sourdough.",
          product_image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: (merchantUsers[1] || merchantUsers[0])._id,
          name: "Fresh Triple Berry Smoothie 500ml",
          category: "Beverages",
          price: 6.99,
          quantity: 40,
          description: "Blended organic blueberries, raspberries, strawberries, and almond milk.",
          product_image: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=500",
          isAvailable: true,
          status: "active",
        },
        // Merchant 3 (The Daily Grocery Hub)
        {
          merchant: (merchantUsers[2] || merchantUsers[0])._id,
          name: "Organic Extra Virgin Olive Oil 750ml",
          category: "Pantry",
          price: 16.49,
          quantity: 25,
          description: "Cold-pressed extra virgin olive oil from estate-grown Italian olives.",
          product_image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500",
          isAvailable: true,
          status: "active",
        },
        {
          merchant: (merchantUsers[2] || merchantUsers[0])._id,
          name: "Premium Italian Sparkling Water 6pk",
          category: "Beverages",
          price: 8.99,
          quantity: 60,
          description: "Naturally carbonated mineral water sourced from Italian Alpine springs.",
          product_image: "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=500",
          isAvailable: true,
          status: "active",
        },
      ];

      await Product.insertMany(productsData);
    }
    const seededProducts = await Product.find();

    const getProd = (idx: number) => seededProducts[idx] || seededProducts[0];
    const getMerchant = (idx: number) => merchantUsers[idx] || merchantUsers[0];
    const getDriver = (idx: number) => driverUsers[idx] || driverUsers[0];
    const getCustomer = (idx: number) => customerUsers[idx] || customerUsers[0];

    // -------------------------------------------------------------
    // 7. SEED ORDERS & PAYMENTS
    // -------------------------------------------------------------
    const existingOrdersCount = await Order.countDocuments();
    if (existingOrdersCount === 0 && customerUsers.length > 0 && merchantUsers.length > 0 && seededProducts.length > 0) {
      const ordersToCreate = [
        {
          userId: getCustomer(0)._id,
          merchantId: getMerchant(0)._id,
          driverId: getDriver(0)._id,
          propertyId: properties[0]?._id,
          propertyHostId: hostUser?._id,
          items: [
            {
              productId: getProd(0)._id,
              name: getProd(0).name,
              price: getProd(0).price,
              quantity: 2,
              product_image: getProd(0).product_image,
            },
            {
              productId: getProd(1)._id,
              name: getProd(1).name,
              price: getProd(1).price,
              quantity: 1,
              product_image: getProd(1).product_image,
            },
          ],
          status: EnumOrderStatus.DELIVERED,
          subtotal: 16.47,
          deliveryFee: 3.99,
          serviceFee: 2.00,
          tax: 1.45,
          tipAmount: 3.00,
          total: 26.91,
          platformCommission: 3.50,
          driverPayout: 5.49,
          propertyHostPayout: 2.00,
          merchantNetEarnings: 15.92,
          deliveryAddress: "100 Ocean Drive, Villa 4, Miami, FL",
        },
        {
          userId: getCustomer(1)._id,
          merchantId: getMerchant(1)._id,
          driverId: getDriver(1)._id,
          items: [
            {
              productId: getProd(4)._id,
              name: getProd(4).name,
              price: getProd(4).price,
              quantity: 1,
              product_image: getProd(4).product_image,
            },
            {
              productId: getProd(6)._id,
              name: getProd(6).name,
              price: getProd(6).price,
              quantity: 2,
              product_image: getProd(6).product_image,
            },
          ],
          status: EnumOrderStatus.OUT_FOR_DELIVERY,
          subtotal: 33.48,
          deliveryFee: 4.99,
          serviceFee: 2.50,
          tax: 2.95,
          tipAmount: 4.00,
          total: 47.92,
          platformCommission: 5.00,
          driverPayout: 6.99,
          merchantNetEarnings: 31.93,
          deliveryAddress: "45 Sixth Ave, Apt 12B, New York, NY",
        },
        {
          userId: getCustomer(2)._id,
          merchantId: getMerchant(0)._id,
          items: [
            {
              productId: getProd(2)._id,
              name: getProd(2).name,
              price: getProd(2).price,
              quantity: 2,
              product_image: getProd(2).product_image,
            },
            {
              productId: getProd(3)._id,
              name: getProd(3).name,
              price: getProd(3).price,
              quantity: 1,
              product_image: getProd(3).product_image,
            },
          ],
          status: EnumOrderStatus.PREPARING,
          subtotal: 16.47,
          deliveryFee: 3.99,
          serviceFee: 1.50,
          tax: 1.40,
          tipAmount: 2.50,
          total: 25.86,
          platformCommission: 2.50,
          merchantNetEarnings: 15.86,
          deliveryAddress: "88 Broadway, New York, NY",
        },
        {
          userId: getCustomer(0)._id,
          merchantId: getMerchant(2)._id,
          items: [
            {
              productId: getProd(8)._id,
              name: getProd(8).name,
              price: getProd(8).price,
              quantity: 1,
              product_image: getProd(8).product_image,
            },
            {
              productId: getProd(9)._id,
              name: getProd(9).name,
              price: getProd(9).price,
              quantity: 2,
              product_image: getProd(9).product_image,
            },
          ],
          status: EnumOrderStatus.PENDING,
          subtotal: 34.47,
          deliveryFee: 4.50,
          serviceFee: 2.50,
          tax: 3.00,
          tipAmount: 0,
          total: 44.47,
          platformCommission: 4.50,
          merchantNetEarnings: 32.47,
          deliveryAddress: "12 Wall St, New York, NY",
        },
        {
          userId: getCustomer(1)._id,
          merchantId: getMerchant(1)._id,
          driverId: getDriver(0)._id,
          items: [
            {
              productId: getProd(5)._id,
              name: getProd(5).name,
              price: getProd(5).price,
              quantity: 2,
              product_image: getProd(5).product_image,
            },
          ],
          status: EnumOrderStatus.DELIVERED,
          subtotal: 29.98,
          deliveryFee: 3.99,
          serviceFee: 2.00,
          tax: 2.50,
          tipAmount: 5.00,
          total: 43.47,
          platformCommission: 4.00,
          driverPayout: 6.99,
          merchantNetEarnings: 28.48,
          deliveryAddress: "220 Madison Ave, New York, NY",
        },
      ];

      for (const orderData of ordersToCreate) {
        const createdOrder = await Order.create(orderData);
        // Seed corresponding payment
        await Payment.create({
          orderId: createdOrder._id,
          userId: createdOrder.userId,
          stripePaymentIntentId: `pi_mock_${Math.floor(100000 + Math.random() * 900000)}`,
          amount: createdOrder.total,
          currency: "usd",
          status: EnumPaymentStatus.SUCCEEDED,
          paymentMethod: "card",
        });
      }
      logger.info(`Seeded ${ordersToCreate.length} orders & payments`);
    }

    // -------------------------------------------------------------
    // 8. SEED PAYOUTS
    // -------------------------------------------------------------
    const existingPayoutsCount = await Payout.countDocuments();
    if (existingPayoutsCount === 0 && merchantUsers.length > 0 && driverUsers.length > 0) {
      const payoutsData = [
        {
          userId: getMerchant(0)._id,
          amount: 185.50,
          status: EnumPayoutStatus.COMPLETED,
          type: EnumPayoutType.WEEKLY_PAYOUT,
          bankAccountLast4: "4321",
          orderCount: 8,
          note: "Weekly merchant payout",
        },
        {
          userId: getMerchant(1)._id,
          amount: 245.00,
          status: EnumPayoutStatus.PENDING,
          type: EnumPayoutType.MANUAL_WITHDRAWAL,
          bankAccountLast4: "8765",
          orderCount: 12,
          note: "Pending merchant payout request",
        },
        {
          userId: getDriver(0)._id,
          amount: 95.00,
          status: EnumPayoutStatus.COMPLETED,
          type: EnumPayoutType.WEEKLY_PAYOUT,
          bankAccountLast4: "1122",
          orderCount: 14,
          note: "Weekly driver delivery payout",
        },
        {
          userId: getDriver(1)._id,
          amount: 62.50,
          status: EnumPayoutStatus.PENDING,
          type: EnumPayoutType.MANUAL_WITHDRAWAL,
          bankAccountLast4: "3344",
          orderCount: 9,
          note: "Pending driver payout request",
        },
      ];
      await Payout.insertMany(payoutsData);
      logger.info(`Seeded ${payoutsData.length} payouts`);
    }

    // -------------------------------------------------------------
    // 9. SEED COUPONS / PROMOTIONS
    // -------------------------------------------------------------
    const existingCouponsCount = await Coupon.countDocuments();
    if (existingCouponsCount === 0 && merchantUsers.length > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60);

      const couponsData = [
        {
          merchant: getMerchant(0)._id,
          code: "FRESH10",
          discountType: EnumDiscountType.PERCENT,
          discountValue: 10,
          minOrder: 20,
          expiresAt: expiryDate,
          isActive: true,
          usedCount: 5,
        },
        {
          merchant: getMerchant(1)._id,
          code: "GOURMET20",
          discountType: EnumDiscountType.PERCENT,
          discountValue: 20,
          minOrder: 30,
          expiresAt: expiryDate,
          isActive: true,
          usedCount: 8,
        },
        {
          merchant: getMerchant(2)._id,
          code: "WELCOME5",
          discountType: EnumDiscountType.FLAT,
          discountValue: 5,
          minOrder: 15,
          expiresAt: expiryDate,
          isActive: true,
          usedCount: 12,
        },
      ];
      await Coupon.insertMany(couponsData);
      logger.info(`Seeded ${couponsData.length} coupons`);
    }

    // -------------------------------------------------------------
    // 10. SEED REVIEWS & FEEDBACK
    // -------------------------------------------------------------
    const existingReviewsCount = await Review.countDocuments();
    if (existingReviewsCount === 0 && customerUsers.length > 0 && merchantUsers.length > 0) {
      const sampleOrders = await Order.find().limit(2);
      if (sampleOrders.length > 0) {
        const reviewsData = [
          {
            user: getCustomer(0)._id,
            orderId: sampleOrders[0]._id,
            merchantId: getMerchant(0)._id,
            reviewType: EnumReviewType.MERCHANT,
            rating: 5,
            review: "Sublime quality fresh organic milk and veggies! The delivery arrived super fast.",
          },
          {
            user: getCustomer(1)._id,
            orderId: sampleOrders[0]._id,
            merchantId: getMerchant(1)._id,
            reviewType: EnumReviewType.MERCHANT,
            rating: 5,
            review: "The sourdough bread and espresso beans were phenomenal. Highly recommended!",
          },
        ];
        await Review.insertMany(reviewsData);
        logger.info(`Seeded ${reviewsData.length} reviews`);
      }
    }

    const existingFeedbackCount = await Feedback.countDocuments();
    if (existingFeedbackCount === 0) {
      await Feedback.create({
        name: "Alex Reed",
        email: "alex.reed@example.com",
        feedback: "Love the app interface! Would be fantastic to add recurring scheduled deliveries.",
        reply: "Thank you for the wonderful feedback! We are actively building scheduled recurring deliveries.",
      });
    }

    // -------------------------------------------------------------
    // 11. SEED SUPPORT TICKETS
    // -------------------------------------------------------------
    const existingTicketsCount = await SupportTicket.countDocuments();
    if (existingTicketsCount === 0 && merchantUsers.length > 0 && customerUsers.length > 0) {
      const ticketsData = [
        {
          ticketId: "TICK-101",
          user: getMerchant(0)._id,
          role: EnumUserRole.MERCHANT,
          subject: "Payout Bank Account Update Request",
          category: EnumTicketCategory.PAYMENTS,
          description: "Hi team, I would like to update my primary bank account for weekly automatic payouts.",
          status: EnumTicketStatus.OPEN,
        },
        {
          ticketId: "TICK-102",
          user: getCustomer(1)._id,
          role: EnumUserRole.USER,
          subject: "Inquiry about delivery window modification",
          category: EnumTicketCategory.ORDERS,
          description: "Can I adjust the guest check-in delivery window for my villa booking next week?",
          status: EnumTicketStatus.RESOLVED,
          adminReply: "Yes, you can modify delivery windows up to 2 hours before dispatch from your order page.",
        },
        {
          ticketId: "TICK-103",
          user: getDriver(0)._id,
          role: EnumUserRole.DRIVER,
          subject: "Driver app map location sync inquiry",
          category: EnumTicketCategory.TECHNICAL,
          description: "GPS coordinates occasionally take a few seconds to update during high traffic hours.",
          status: EnumTicketStatus.IN_PROGRESS,
        },
      ];
      await SupportTicket.insertMany(ticketsData);
      logger.info(`Seeded ${ticketsData.length} support tickets`);
    }

    // -------------------------------------------------------------
    // 12. SEED NOTIFICATIONS
    // -------------------------------------------------------------
    const existingAdminNotifCount = await AdminNotification.countDocuments();
    if (existingAdminNotifCount === 0) {
      await AdminNotification.create([
        {
          title: "New Merchant Registration",
          message: "Merchant 'The Daily Grocery Hub' registered and submitted verification documents.",
          isRead: false,
        },
        {
          title: "Payout Request Pending",
          message: "Merchant 'Gourmet Bistro & Cafe' requested a payout of $245.00.",
          isRead: false,
        },
      ]);
    }

    const existingNotifCount = await Notification.countDocuments();
    if (existingNotifCount === 0 && merchantUsers.length > 0) {
      await Notification.create([
        {
          toId: getMerchant(0)._id,
          title: "New Order Received!",
          message: "Order ORD-1003 has been placed and is ready for preparation.",
          isRead: false,
        },
        {
          toId: getDriver(0)._id,
          title: "Delivery Task Assigned",
          message: "You have been assigned to deliver order ORD-1001.",
          isRead: true,
        },
      ]);
    }

    // -------------------------------------------------------------
    // 13. SEED CMS CONTENT (Terms, Privacy, FAQ, About, Contact)
    // -------------------------------------------------------------
    const tcCount = await TermsConditions.countDocuments();
    if (tcCount === 0) {
      await TermsConditions.create({
        description: "<p>Welcome to HappyPhoto & Fridge Fillers. By using our platform, you agree to comply with our delivery, privacy, and service terms.</p>",
      });
    }

    const ppCount = await PrivacyPolicy.countDocuments();
    if (ppCount === 0) {
      await PrivacyPolicy.create({
        description: "<p>We value your privacy. We collect only necessary user, location, and payment data to process fridge filler deliveries securely.</p>",
      });
    }

    const faqCount = await FAQ.countDocuments();
    if (faqCount === 0) {
      await FAQ.create({
        description: "<p><strong>Q: How does fridge filling work?</strong><br>A: Select your villa or home address, pick items from local merchants, and our drivers deliver right to your fridge before you arrive!</p>",
      });
    }

    const aboutCount = await AboutUs.countDocuments();
    if (aboutCount === 0) {
      await AboutUs.create({
        description: "<p>HappyPhoto & Fridge Fillers connects vacation hosts, guests, and local merchants for seamless pre-stocked grocery delivery.</p>",
      });
    }

    const contactCount = await ContactUs.countDocuments();
    if (contactCount === 0) {
      await ContactUs.create({
        description: "<p>Contact Support: support@happyphoto.com | Phone: +1 800-555-0199 | Hours: 24/7</p>",
      });
    }

    logger.info("Database seeding completed successfully! All pages are now populated with rich data.");
  } catch (error: any) {
    console.error("Error seeding database stack:", error?.stack || error);
    errorLogger.error("Error seeding database:", error);
  }
};

export default seedDatabase;
