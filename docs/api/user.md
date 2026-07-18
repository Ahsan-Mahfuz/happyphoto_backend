# User Module — API Documentation

> **Base Path:** `/user`
> **Source:** [`src/app/module/user`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/user)

---

## Table of Contents

- [Overview](#overview)
- [Routes](#routes)
  - [GET /user/profile](#1-get-userprofile)
  - [PATCH /user/edit-profile](#2-patch-useredit-profile)
  - [DELETE /user/delete-account](#3-delete-userdelete-account)
  - [PATCH /user/update-driver-information](#4-patch-userupdate-driver-information)
  - [PATCH /user/update-merchant-business-information](#5-patch-userupdate-merchant-business-information)
  - [PATCH /user/update-merchant-store-location](#6-patch-userupdate-merchant-store-location)
  - [PATCH /user/update-merchant-store-profile](#7-patch-userupdate-merchant-store-profile)
  - [PATCH /user/update-merchant-documents](#8-patch-userupdate-merchant-documents)
  - [PATCH /user/update-store-settings](#9-patch-userupdate-store-settings)
  - [PATCH /user/submit-driver-application](#10-patch-usersubmit-driver-application)
- [Error Reference](#error-reference)

---

## Overview

The User module handles all profile and role-specific data operations for users, drivers, and merchants. It allows authenticated users to read and update their profiles, upload necessary documents (like driver licenses or merchant trade licenses), and manage role-specific settings (like store locations and operating hours).

**Supported Roles:** `USER`, `PROPERTY_HOST`, `DRIVER`, `MERCHANT`, `ADMIN` (some endpoints are role-specific).

---

## Routes

---

### 1. GET `/user/profile`

Retrieves the profile of the currently authenticated user.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L56-L73 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "_id": "ObjectId",
    "authId": {
      "_id": "ObjectId",
      "email": "john@example.com",
      "role": "USER",
      "name": "John Doe",
      "isVerified": true,
      "isBlocked": false
    },
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "profile_image": "/uploads/profile/img.jpg",
    "phoneNumber": "+1234567890",
    "createdAt": "2023-10-25T10:00:00.000Z",
    "updatedAt": "2023-10-25T10:00:00.000Z"
  }
}
```

#### Errors

| Status | Condition                     |
| ------ | ----------------------------- |
| 401    | Missing or invalid auth token |
| 404    | User not found                |
| 403    | User is blocked by admin      |

---

### 2. PATCH `/user/edit-profile`

Updates the profile of the authenticated user. Supports multipart form data for uploading a profile image.

| Property         | Value                                      |
| ---------------- | ------------------------------------------ |
| **Auth**         | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit**   | No                                         |
| **Content-Type** | `multipart/form-data`                      |

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body (form-data)

| Field           | Type   | Required | Description                |
| --------------- | ------ | -------- | -------------------------- |
| `name`          | string | ❌       | Full name of the user      |
| `phoneNumber`   | string | ❌       | Phone number               |
| `dateOfBirth`   | string | ❌       | Date of birth              |
| `address`       | string | ❌       | Physical address           |
| `profile_image` | file   | ❌       | Profile picture image file |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L13-L54 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "ObjectId",
    "name": "Updated Name",
    "profile_image": "/uploads/profile/new_img.jpg",
    "...": "..."
  }
}
```

#### Errors

| Status | Condition                     |
| ------ | ----------------------------- |
| 401    | Missing or invalid auth token |
| 404    | User not found                |

---

### 3. DELETE `/user/delete-account`

Deletes the currently authenticated user's account and associated `Auth` record. Requires providing the current password for confirmation.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "SecureP@ss1"
}
```

| Field      | Type   | Required | Description                 |
| ---------- | ------ | -------- | --------------------------- |
| `email`    | string | ✅       | Account email               |
| `password` | string | ✅       | Current password to confirm |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L75-L105 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Account deleted!"
}
```

#### Errors

| Status | Condition                     |
| ------ | ----------------------------- |
| 401    | Missing or invalid auth token |
| 404    | User does not exist           |
| 403    | Password is incorrect         |

---

### 4. PATCH `/user/update-driver-information`

Updates driver-specific information and allows uploading required verification documents.

| Property         | Value                                     |
| ---------------- | ----------------------------------------- |
| **Auth**         | ✅ **Required** — Bearer Token (`DRIVER`) |
| **Rate Limit**   | No                                        |
| **Content-Type** | `multipart/form-data`                     |

#### Headers

```
Authorization: Bearer <accessToken>
```

#### Request Body (form-data)

| Field                       | Type   | Required | Description                                |
| --------------------------- | ------ | -------- | ------------------------------------------ |
| `licenseNumber`             | string | ❌       | Driver's license number                    |
| `plateNumber`               | string | ❌       | Vehicle plate number                       |
| `drivingLicense_image`      | file   | ❌       | Image of the driving license               |
| `idCard_image`              | file   | ❌       | Image of the driver's ID card              |
| `vehicleRegistration_image` | file   | ❌       | Image of the vehicle registration document |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L107-L167 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Your documents have been submitted successfully.",
  "data": {
    "licenseNumber": "ABC12345",
    "plateNumber": "XYZ-9876",
    "drivingLicense_image": "/uploads/driver/license.jpg",
    "...": "..."
  }
}
```

#### Errors

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| 401    | Missing or invalid auth token / Unauthorized |
| 404    | User not found                               |

---

### 5. PATCH `/user/update-merchant-business-information`

Updates the primary business information for a merchant.

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Auth**       | ✅ **Required** — Bearer Token (`MERCHANT`) |
| **Rate Limit** | No                                          |

#### Request Body

```json
{
  "storeName": "Awesome Store",
  "businessType": "Retail",
  "businessRegistrationNumber": "REG123456",
  "vatNumber": "VAT987654"
}
```

| Field                        | Type   | Required | Description                              |
| ---------------------------- | ------ | -------- | ---------------------------------------- |
| `storeName`                  | string | ❌       | Name of the store                        |
| `businessType`               | string | ❌       | Type of business (e.g., Grocery, Retail) |
| `businessRegistrationNumber` | string | ❌       | Business registration number             |
| `vatNumber`                  | string | ❌       | Value Added Tax (VAT) number             |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L169-L201 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business information updated successfully",
  "data": {
    "...": "..."
  }
}
```

#### Errors

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| 401    | Missing or invalid auth token / Unauthorized |
| 404    | User not found                               |

---

### 6. PATCH `/user/update-merchant-store-location`

Updates the geographic location and address for a merchant's store.

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Auth**       | ✅ **Required** — Bearer Token (`MERCHANT`) |
| **Rate Limit** | No                                          |

#### Request Body

```json
{
  "storeLocationCoordinatesLat": 40.7128,
  "storeLocationCoordinatesLong": -74.006,
  "storeAddress": "123 Main St",
  "storeCity": "New York",
  "storeState": "NY",
  "storePostalCode": "10001",
  "storeCountry": "USA"
}
```

| Field                          | Type   | Required | Description          |
| ------------------------------ | ------ | -------- | -------------------- |
| `storeLocationCoordinatesLat`  | number | ❌       | Latitude coordinate  |
| `storeLocationCoordinatesLong` | number | ❌       | Longitude coordinate |
| `storeAddress`                 | string | ❌       | Street address       |
| `storeCity`                    | string | ❌       | City                 |
| `storeState`                   | string | ❌       | State/Province       |
| `storePostalCode`              | string | ❌       | Postal/ZIP code      |
| `storeCountry`                 | string | ❌       | Country              |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L203-L252 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Store location updated successfully",
  "data": {
    "...": "..."
  }
}
```

---

### 7. PATCH `/user/update-merchant-store-profile`

Updates the public-facing store profile for a merchant, including images.

| Property         | Value                                       |
| ---------------- | ------------------------------------------- |
| **Auth**         | ✅ **Required** — Bearer Token (`MERCHANT`) |
| **Rate Limit**   | No                                          |
| **Content-Type** | `multipart/form-data`                       |

#### Request Body (form-data)

| Field                  | Type   | Required | Description                              |
| ---------------------- | ------ | -------- | ---------------------------------------- |
| `storeDescription`     | string | ❌       | Description of the store                 |
| `storeOpeningTime`     | string | ❌       | Time the store opens (e.g., "09:00 AM")  |
| `storeClosingTime`     | string | ❌       | Time the store closes (e.g., "10:00 PM") |
| `storeAveragePrepTime` | number | ❌       | Average preparation time in minutes      |
| `store_logo`           | file   | ❌       | Store logo image                         |
| `store_banner_image`   | file   | ❌       | Store banner image                       |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L254-L307 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Store profile updated successfully",
  "data": {
    "...": "..."
  }
}
```

---

### 8. PATCH `/user/update-merchant-documents`

Uploads required official documents for a merchant's store.

| Property         | Value                                       |
| ---------------- | ------------------------------------------- |
| **Auth**         | ✅ **Required** — Bearer Token (`MERCHANT`) |
| **Rate Limit**   | No                                          |
| **Content-Type** | `multipart/form-data`                       |

#### Request Body (form-data)

| Field                    | Type | Required | Description                    |
| ------------------------ | ---- | -------- | ------------------------------ |
| `store_front_image`      | file | ❌       | Image of the store front       |
| `trade_license_document` | file | ❌       | Document proving trade license |
| `merchant_id_card_image` | file | ❌       | ID card of the merchant owner  |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L309-L363 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Merchant documents updated successfully",
  "data": {
    "...": "..."
  }
}
```

---

### 9. PATCH `/user/update-store-settings`

Updates operational settings for a merchant's store.

| Property       | Value                                       |
| -------------- | ------------------------------------------- |
| **Auth**       | ✅ **Required** — Bearer Token (`MERCHANT`) |
| **Rate Limit** | No                                          |

#### Request Body

```json
{
  "storeDeliveryRadius": 5,
  "storeMinimumOrder": 20,
  "storePhoneNumber": "+1234567890",
  "storeSupportEmail": "support@awesomestore.com",
  "storeIsOpen": true,
  "businessHours": {
    "monday": { "open": "09:00", "close": "17:00" },
    "tuesday": { "open": "09:00", "close": "17:00" }
  }
}
```

| Field                 | Type    | Required | Description                                     |
| --------------------- | ------- | -------- | ----------------------------------------------- |
| `businessHours`       | object  | ❌       | Complex object defining business hours          |
| `storeDeliveryRadius` | number  | ❌       | Delivery radius in km/miles                     |
| `storeMinimumOrder`   | number  | ❌       | Minimum order amount                            |
| `storePhoneNumber`    | string  | ❌       | Support phone number for the store              |
| `storeSupportEmail`   | string  | ❌       | Support email for the store                     |
| `storeIsOpen`         | boolean | ❌       | Whether the store is currently accepting orders |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L365-L406 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Store settings updated successfully",
  "data": {
    "...": "..."
  }
}
```

#### Errors

| Status | Condition                     |
| ------ | ----------------------------- |
| 400    | No valid fields to update     |
| 401    | Missing or invalid auth token |
| 403    | User role is not MERCHANT     |

---

### 10. PATCH `/user/submit-driver-application`

Submits the driver's application for admin review. Required documents must be uploaded prior to submission (using `/update-driver-information`).

| Property       | Value                                     |
| -------------- | ----------------------------------------- |
| **Auth**       | ✅ **Required** — Bearer Token (`DRIVER`) |
| **Rate Limit** | No                                        |

#### Request Body

```json
{
  "vehicleType": "car",
  "licenseNumber": "ABC12345",
  "plateNumber": "XYZ-9876"
}
```

| Field           | Type   | Required | Description                           |
| --------------- | ------ | -------- | ------------------------------------- |
| `vehicleType`   | string | ✅       | Type of vehicle (e.g., `car`, `bike`) |
| `licenseNumber` | string | ❌       | Can be updated during submission      |
| `plateNumber`   | string | ❌       | Can be updated during submission      |

#### Response — Success

<!-- source: src/app/module/user/user.service.ts#L408-L459 -->

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Application submitted",
  "data": {
    "message": "Application submitted successfully. Pending admin review."
  }
}
```

#### Errors

| Status | Condition                                                 |
| ------ | --------------------------------------------------------- |
| 400    | Missing `vehicleType`                                     |
| 400    | Missing required documents (license, ID, or registration) |
| 401    | Missing or invalid auth token                             |
| 403    | User role is not DRIVER                                   |
| 404    | User not found                                            |

---

## Error Reference

All error responses follow the standard error envelope. See [Shared API Documentation](_shared.md) for details on common error structures and pagination.

| HTTP Status | Meaning                                            |
| ----------- | -------------------------------------------------- |
| 400         | Bad Request — validation failed or incorrect input |
| 401         | Unauthorized — missing or invalid token            |
| 403         | Forbidden — insufficient role privileges           |
| 404         | Not Found — user or resource doesn't exist         |
