# Admin Module — API Documentation

> **Base Path:** `/admin`
> **Source:** [`src/app/module/admin`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/admin)

---

## Table of Contents

- [Overview](#overview)
- [Personal Account Management](#personal-account-management)
  - [GET /admin/profile](#1-get-adminprofile)
  - [PATCH /admin/edit-profile](#2-patch-adminedit-profile)
  - [DELETE /admin/delete-account](#3-delete-admindelete-account)
- [User Management](#user-management)
  - [GET /admin/get-all-users](#4-get-adminget-all-users)
  - [PATCH /admin/block-user](#5-patch-adminblock-user)
  - [PATCH /admin/approve-driver](#6-patch-adminapprove-driver)
  - [PATCH /admin/reject-driver](#7-patch-adminreject-driver)
  - [PATCH /admin/approve-merchant](#8-patch-adminapprove-merchant)
  - [PATCH /admin/approve-property-host](#9-patch-adminapprove-property-host)
- [Order & Logistics Oversight](#order--logistics-oversight)
  - [GET /admin/get-all-orders](#10-get-adminget-all-orders)
  - [GET /admin/get-all-delivery-requests](#11-get-adminget-all-delivery-requests)
  - [PATCH /admin/force-approve-request](#12-patch-adminforce-approve-request)
- [Platform & Property Oversight](#platform--property-oversight)
  - [GET /admin/get-all-stores](#13-get-adminget-all-stores)
  - [GET /admin/get-all-properties](#14-get-adminget-all-properties)
  - [PATCH /admin/flag-property](#15-patch-adminflag-property)
- [Financial Oversight](#financial-oversight)
  - [GET /admin/get-all-payments](#16-get-adminget-all-payments)
  - [PATCH /admin/approve-payout](#17-patch-adminapprove-payout)
  - [PATCH /admin/reject-payout](#18-patch-adminreject-payout)
- [Dashboard & Reports](#dashboard--reports)
  - [GET /admin/dashboard](#19-get-admindashboard)

---

## Overview

The Admin module provides endpoints for platform oversight, user management, order logistics, payout approvals, and the admin's personal profile management.

**All routes in this module require `ADMIN` authentication.**

---

## Personal Account Management

### 1. GET `/admin/profile`

Retrieves the authenticated admin's profile and authentication details.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Admin retrieved successfully",
  "data": {
    "_id": "ObjectId",
    "authId": {
      "email": "admin@example.com",
      "name": "Super Admin",
      "role": "ADMIN"
    },
    "name": "Super Admin"
  }
}
```

---

### 2. PATCH `/admin/edit-profile`

Updates the authenticated admin's profile information. Supports multipart/form-data for file uploads.

| Property         | Value                 |
| ---------------- | --------------------- |
| **Auth**         | ✅ `ADMIN`            |
| **Content-Type** | `multipart/form-data` |

#### Request Body

| Field           | Type   | Required | Description                                  |
| --------------- | ------ | -------- | -------------------------------------------- |
| `name`          | string | ❌       | Admin's name                                 |
| `phoneNumber`   | string | ❌       | Admin's phone number                         |
| `address`       | string | ❌       | Admin's address                              |
| `profile_image` | file   | ❌       | Image file to upload as the new profile icon |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": { ... }
}
```

---

### 3. DELETE `/admin/delete-account`

Deletes the authenticated admin's account permanently, including their `Auth` and `Admin` records.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "email": "admin@example.com",
  "password": "SecureP@ss1"
}
```

| Field      | Type   | Required | Description              |
| ---------- | ------ | -------- | ------------------------ |
| `email`    | string | ✅       | Admin's email            |
| `password` | string | ✅       | Admin's current password |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Account deleted!"
}
```

---

## User Management

### 4. GET `/admin/get-all-users`

Retrieves a paginated list of all users across the platform. Supports query builder options (filtering, sorting, pagination).

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved",
  "meta": { "page": 1, "limit": 10, "total": 150 },
  "data": [ { ... } ]
}
```

---

### 5. PATCH `/admin/block-user`

Blocks or unblocks a user based on their `authId`.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "authId": "ObjectId",
  "isBlocked": true
}
```

| Field       | Type    | Required | Description                         |
| ----------- | ------- | -------- | ----------------------------------- |
| `authId`    | string  | ✅       | User's Auth ID                      |
| `isBlocked` | boolean | ✅       | Block (`true`) or unblock (`false`) |

---

### 6. PATCH `/admin/approve-driver`

Approves a pending driver application.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "userId": "ObjectId"
}
```

---

### 7. PATCH `/admin/reject-driver`

Rejects a pending driver application.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "userId": "ObjectId",
  "reason": "Invalid documents provided."
}
```

---

### 8. PATCH `/admin/approve-merchant`

Approves a pending merchant account.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "userId": "ObjectId"
}
```

---

### 9. PATCH `/admin/approve-property-host`

Approves a pending property host account.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "userId": "ObjectId"
}
```

---

## Order & Logistics Oversight

### 10. GET `/admin/get-all-orders`

Retrieves a paginated list of all orders. Supports query builder options.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

---

### 11. GET `/admin/get-all-delivery-requests`

Retrieves a paginated list of all delivery requests. Supports query builder options.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

---

### 12. PATCH `/admin/force-approve-request`

Forces the approval of a delivery request and transitions the associated order to `preparing`.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "requestId": "ObjectId"
}
```

---

## Platform & Property Oversight

### 13. GET `/admin/get-all-stores`

Retrieves a paginated list of all merchants (stores). Supports query builder options.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

---

### 14. GET `/admin/get-all-properties`

Retrieves a paginated list of all properties. Supports query builder options.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

---

### 15. PATCH `/admin/flag-property`

Flags a property, indicating a policy violation or issue.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "propertyId": "ObjectId",
  "reason": "Violates safety guidelines"
}
```

---

## Financial Oversight

### 16. GET `/admin/get-all-payments`

Retrieves a paginated list of all payouts and transactions. Supports query builder options.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

---

### 17. PATCH `/admin/approve-payout`

Approves a pending payout request and initiates a transfer.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "payoutId": "ObjectId"
}
```

---

### 18. PATCH `/admin/reject-payout`

Rejects a pending payout request.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "payoutId": "ObjectId",
  "reason": "Suspicious account activity"
}
```

---

## Dashboard & Reports

### 19. GET `/admin/dashboard`

Retrieves real-time aggregate statistics for the admin dashboard.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "users": {
      "customers": 1500,
      "merchants": 45,
      "drivers": 120
    },
    "logistics": {
      "totalOrders": 3400
    }
  }
}
```
