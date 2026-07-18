# Property Module — API Documentation

> **Base Path:** `/property`
> **Source:** [`src/app/module/property`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/property)

---

## Table of Contents

- [Overview](#overview)
- [Routes](#routes)
  - [POST /property/add-property](#1-post-propertyadd-property)
  - [GET /property/get-properties](#2-get-propertyget-properties)
  - [GET /property/get-property](#3-get-propertyget-property)
  - [PATCH /property/update-property](#4-patch-propertyupdate-property)
  - [DELETE /property/delete-property](#5-delete-propertydelete-property)
  - [GET /property/resolve-code](#6-get-propertyresolve-code)
  - [PATCH /property/update-delivery-rules](#7-patch-propertyupdate-delivery-rules)
  - [GET /property/dashboard-stats](#8-get-propertydashboard-stats)
  - [PATCH /property/approve-request](#9-patch-propertyapprove-request)
  - [PATCH /property/reject-request](#10-patch-propertyreject-request)
  - [GET /property/pending-requests](#11-get-propertypending-requests)
  - [GET /property/scheduled-requests](#12-get-propertyscheduled-requests)
  - [GET /property/delivered-requests](#13-get-propertydelivered-requests)
- [Error Reference](#error-reference)

---

## Overview

The Property module manages properties for property hosts. Hosts can add, update, retrieve, and delete their properties, configure delivery rules, resolve property codes, and manage delivery requests (approve/reject).

**Supported Roles:** `PROPERTY_HOST` (most routes), `ADMIN`, and all roles for resolving codes.

---

## Routes

---

### 1. POST `/property/add-property`

Creates a new property for the authenticated property host. Generates a unique `propertyCode` automatically.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body (multipart/form-data)

| Field             | Type   | Required | Description                                                       |
| ----------------- | ------ | -------- | ----------------------------------------------------------------- |
| `propertyName`    | string | ✅       | Name of the property                                              |
| `propertyType`    | string | ✅       | One of: `apartment`, `vacation_rental`, `house`, `condo`, `other` |
| `physicalAddress` | string | ✅       | Full physical address                                             |
| `city`            | string | ✅       | City                                                              |
| `state`           | string | ❌       | State/Province                                                    |
| `postalCode`      | string | ✅       | Postal/ZIP code                                                   |
| `country`         | string | ✅       | Country                                                           |
| `lat`             | number | ❌       | Latitude coordinate                                               |
| `long`            | number | ❌       | Longitude coordinate                                              |
| `property_image`  | file   | ❌       | Image of the property                                             |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property added successfully",
  "data": {
    "_id": "ObjectId",
    "hostId": "ObjectId",
    "propertyName": "Beachfront Condo",
    "propertyType": "condo",
    "physicalAddress": "123 Ocean Dr",
    "city": "Miami",
    "state": "FL",
    "postalCode": "33139",
    "country": "USA",
    "propertyCode": "1A2B3C",
    "locationCoordinates": {
      "type": "Point",
      "coordinates": [-80.13, 25.79]
    },
    "propertyImage": "uploads/...jpg",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 2. GET `/property/get-properties`

Retrieves a paginated list of properties owned by the authenticated property host.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Query Parameters

Supports standard `search`, `filter`, `sort`, and `paginate` parameters.
Searchable fields: `propertyName`, `propertyCode`, `city`.

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Properties retrieved successfully",
  "data": [
    {
      "_id": "ObjectId",
      "propertyName": "Beachfront Condo",
      "propertyCode": "1A2B3C"
      // ...other property fields
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 3. GET `/property/get-property`

Retrieves details for a specific property. Hosts can only view their own properties; Admins can view any property.

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`, `ADMIN`) |
| **Rate Limit** | No                                                        |

#### Query Parameters

| Field        | Type   | Required | Description                |
| ------------ | ------ | -------- | -------------------------- |
| `propertyId` | string | ✅       | ID of the property to view |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property retrieved successfully",
  "data": {
    "_id": "ObjectId",
    "propertyName": "Beachfront Condo"
    // ...other property fields
  }
}
```

#### Errors

| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| 404    | Property not found                                |
| 403    | Not authorized to view this property (wrong host) |

<!-- source: src/app/module/property/property.service.ts -->

---

### 4. PATCH `/property/update-property`

Updates details for an existing property. Only the property host can update their own property.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body (multipart/form-data)

| Field            | Type    | Required | Description                                                       |
| ---------------- | ------- | -------- | ----------------------------------------------------------------- |
| `propertyId`     | string  | ✅       | ID of the property to update                                      |
| `propertyName`   | string  | ❌       | New name of the property                                          |
| `propertyType`   | string  | ❌       | One of: `apartment`, `vacation_rental`, `house`, `condo`, `other` |
| `isActive`       | boolean | ❌       | Active status of the property                                     |
| `property_image` | file    | ❌       | New image for the property (replaces the old one)                 |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property updated successfully",
  "data": {
    "_id": "ObjectId"
    // ...updated property fields
  }
}
```

#### Errors

| Status | Condition                                           |
| ------ | --------------------------------------------------- |
| 404    | Property not found                                  |
| 403    | Not authorized to update this property (wrong host) |

<!-- source: src/app/module/property/property.service.ts -->

---

### 5. DELETE `/property/delete-property`

Deletes a property. Only the property host can delete their own property.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body

```json
{
  "propertyId": "ObjectId"
}
```

| Field        | Type   | Required | Description                  |
| ------------ | ------ | -------- | ---------------------------- |
| `propertyId` | string | ✅       | ID of the property to delete |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property deleted successfully"
}
```

#### Errors

| Status | Condition                                           |
| ------ | --------------------------------------------------- |
| 404    | Property not found                                  |
| 403    | Not authorized to delete this property (wrong host) |

<!-- source: src/app/module/property/property.service.ts -->

---

### 6. GET `/property/resolve-code`

Resolves a `propertyCode` to fetch safe details about a property (e.g., for customers before delivery). Does NOT expose physical addresses or coordinates.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (All Roles) |
| **Rate Limit** | No                                         |

#### Query Parameters

| Field          | Type   | Required | Description                     |
| -------------- | ------ | -------- | ------------------------------- |
| `propertyCode` | string | ✅       | The unique code of the property |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Property code resolved successfully",
  "data": {
    "propertyName": "Beachfront Condo",
    "propertyType": "condo",
    "hostCompany": "John Doe LLC",
    "city": "Miami",
    "state": "FL"
  }
}
```

#### Errors

| Status | Condition                         |
| ------ | --------------------------------- |
| 404    | Property not found or is inactive |

<!-- source: src/app/module/property/property.service.ts -->

---

### 7. PATCH `/property/update-delivery-rules`

Updates default delivery rules and guest stay dates for a property.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body

```json
{
  "propertyId": "ObjectId",
  "defaultWindowStart": "14:00",
  "defaultWindowEnd": "16:00",
  "guestStayCheckIn": "2023-11-01T15:00:00Z",
  "guestStayCheckOut": "2023-11-10T11:00:00Z"
}
```

| Field                | Type   | Required | Description                              |
| -------------------- | ------ | -------- | ---------------------------------------- |
| `propertyId`         | string | ✅       | ID of the property to update             |
| `defaultWindowStart` | string | ❌       | Default start time for delivery window   |
| `defaultWindowEnd`   | string | ❌       | Default end time for delivery window     |
| `guestStayCheckIn`   | string | ❌       | ISO date string for guest check-in time  |
| `guestStayCheckOut`  | string | ❌       | ISO date string for guest check-out time |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Delivery rules updated successfully",
  "data": {
    "_id": "ObjectId"
    // ...updated property with delivery rules
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 8. GET `/property/dashboard-stats`

Retrieves basic dashboard statistics for the property host (properties, pending requests, scheduled, and delivered orders).

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "propertiesCount": 5,
    "pendingCount": 2,
    "upcomingCount": 4,
    "deliveredCount": 10
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 9. PATCH `/property/approve-request`

Approves a delivery request. Validates that the delivery window is within the guest stay dates, updates the order, reveals the property address to the order, captures payment, and notifies the customer and merchant.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body

```json
{
  "requestId": "ObjectId",
  "deliveryWindowStart": "2023-11-02T14:00:00Z",
  "deliveryWindowEnd": "2023-11-02T16:00:00Z",
  "guestStayCheckIn": "2023-11-01T15:00:00Z",
  "guestStayCheckOut": "2023-11-10T11:00:00Z"
}
```

| Field                 | Type   | Required | Description                         |
| --------------------- | ------ | -------- | ----------------------------------- |
| `requestId`           | string | ✅       | ID of the pending delivery request  |
| `deliveryWindowStart` | string | ✅       | ISO date string for window start    |
| `deliveryWindowEnd`   | string | ✅       | ISO date string for window end      |
| `guestStayCheckIn`    | string | ✅       | ISO date string for guest check-in  |
| `guestStayCheckOut`   | string | ✅       | ISO date string for guest check-out |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Delivery request approved",
  "data": {
    "_id": "ObjectId",
    "status": "approved",
    "deliveryWindow": {
      "start": "2023-11-02T14:00:00.000Z",
      "end": "2023-11-02T16:00:00.000Z"
    }
    // ...other request fields
  }
}
```

#### Errors

| Status | Condition                                      |
| ------ | ---------------------------------------------- |
| 400    | Delivery window is not within guest stay dates |
| 400    | Request has already been reviewed              |
| 403    | Not authorized to approve this request         |
| 404    | Delivery request not found                     |

<!-- source: src/app/module/property/property.service.ts -->

---

### 10. PATCH `/property/reject-request`

Rejects a delivery request, cancels the associated order, cancels the held payment, and notifies the customer.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Request Body

```json
{
  "requestId": "ObjectId",
  "reason": "Host not available during requested time"
}
```

| Field       | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| `requestId` | string | ✅       | ID of the pending delivery request |
| `reason`    | string | ❌       | Optional reason for rejection      |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Delivery request rejected",
  "data": {
    "_id": "ObjectId",
    "status": "rejected"
    // ...other request fields
  }
}
```

#### Errors

| Status | Condition                             |
| ------ | ------------------------------------- |
| 400    | Request has already been reviewed     |
| 403    | Not authorized to reject this request |
| 404    | Delivery request not found            |

<!-- source: src/app/module/property/property.service.ts -->

---

### 11. GET `/property/pending-requests`

Retrieves a paginated list of `pending` delivery requests for the host's properties.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Query Parameters

Supports standard `search`, `filter`, `sort`, and `paginate` parameters.

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pending requests retrieved",
  "data": [
    {
      "_id": "ObjectId",
      "status": "pending",
      "orderId": { "orderId": "ORD-12345", "subtotal": 100 },
      "customerId": { "name": "John", "email": "john@ex.com" },
      "propertyId": { "propertyName": "Condo", "propertyCode": "123" }
      // ...other fields
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 12. GET `/property/scheduled-requests`

Retrieves a paginated list of `approved` or `force_approved` delivery requests for the host's properties.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Query Parameters

Supports standard `search`, `filter`, `sort`, and `paginate` parameters.

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Scheduled requests retrieved",
  "data": [
    {
      "_id": "ObjectId",
      "status": "approved"
      // ...populated fields
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

### 13. GET `/property/delivered-requests`

Retrieves a list of approved requests where the associated order status is `delivered`.

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (`PROPERTY_HOST`) |
| **Rate Limit** | No                                               |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Delivered requests retrieved",
  "data": [
    {
      "_id": "ObjectId",
      "status": "approved",
      "orderId": {
        "orderId": "ORD-123",
        "status": "delivered",
        "actualDeliveryTime": "2023-11-02T15:30:00Z"
      }
      // ...other fields
    }
  ]
}
```

<!-- source: src/app/module/property/property.service.ts -->

---

## Error Reference

Please refer to [`_shared.md`](file:///C:/Users/thakursaad/projects/happyphoto/docs/api/_shared.md) for standard error formats and global HTTP status codes. All errors returned by this module follow the standard JSON error envelope format.
