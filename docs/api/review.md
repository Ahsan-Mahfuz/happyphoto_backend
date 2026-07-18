# Review Module — API Documentation

> **Base Path:** `/review`
> **Source:** [`src/app/module/review`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/review)

---

## Table of Contents

- [Overview](#overview)
- [Routes](#routes)
  - [POST /review/post-review](#1-post-reviewpost-review)
  - [GET /review/get-all-reviews](#2-get-reviewget-all-reviews)
  - [GET /review/get-review](#3-get-reviewget-review)
  - [PATCH /review/update-review](#4-patch-reviewupdate-review)
  - [DELETE /review/delete-review](#5-delete-reviewdelete-review)
- [Error Reference](#error-reference)

---

## Overview

The Review module handles the creation, retrieval, updating, and deletion of reviews. Reviews can be left by users for either merchants or drivers regarding specific orders. When a review is posted, it also updates the target user's (merchant or driver) overall average rating and total review count.

**Supported Roles:** `USER`, `PROPERTY_HOST`, `DRIVER`, `MERCHANT`, `ADMIN` (All Roles)

---

## Routes

---

### 1. POST `/review/post-review`

Creates a new review for a merchant or driver and updates their overall rating.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Request Body

```json
{
  "orderId": "60d5ec49f8d2e30b8c8b4567",
  "merchantId": "60d5ec49f8d2e30b8c8b4568",
  "driverId": "60d5ec49f8d2e30b8c8b4569",
  "reviewType": "merchant",
  "rating": 5,
  "review": "Excellent service and quick preparation."
}
```

<!-- source: src/app/module/review/Review.ts -->

| Field        | Type   | Required | Description                                           |
| ------------ | ------ | -------- | ----------------------------------------------------- |
| `orderId`    | string | ✅       | ID of the order being reviewed                        |
| `merchantId` | string | ✅       | ID of the merchant involved in the order              |
| `driverId`   | string | ❌       | ID of the driver involved in the order (optional)     |
| `reviewType` | string | ✅       | Type of review. Must be either `merchant` or `driver` |
| `rating`     | number | ✅       | Rating given (1 to 5)                                 |
| `review`     | string | ✅       | Text content of the review                            |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review posted",
  "data": {
    "user": "60d5ec49f8d2e30b8c8b4566",
    "orderId": "60d5ec49f8d2e30b8c8b4567",
    "merchantId": "60d5ec49f8d2e30b8c8b4568",
    "driverId": "60d5ec49f8d2e30b8c8b4569",
    "reviewType": "merchant",
    "rating": 5,
    "review": "Excellent service and quick preparation.",
    "_id": "60d5ec49f8d2e30b8c8b4570",
    "createdAt": "2023-10-01T12:00:00.000Z",
    "updatedAt": "2023-10-01T12:00:00.000Z"
  }
}
```

#### Errors

| Status | Condition                               |
| ------ | --------------------------------------- |
| 400    | Target user ID is missing based on type |
| 404    | Target user not found                   |
| 401    | Missing or invalid auth token           |

---

### 2. GET `/review/get-all-reviews`

Retrieves a paginated list of reviews. Admins can view all reviews, while other users can only view the reviews they have posted.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Query Parameters

Supports standard pagination, sorting, and filtering options (`page`, `limit`, `sortBy`, `sortOrder`, etc.).

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review retrieved",
  "data": {
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPage": 1
    },
    "result": [
      {
        "_id": "60d5ec49f8d2e30b8c8b4570",
        "user": {
          "_id": "60d5ec49f8d2e30b8c8b4566",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "orderId": "60d5ec49f8d2e30b8c8b4567",
        "merchantId": "60d5ec49f8d2e30b8c8b4568",
        "reviewType": "merchant",
        "rating": 5,
        "review": "Excellent service and quick preparation.",
        "createdAt": "2023-10-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. GET `/review/get-review`

Retrieves the details of a single review by its ID.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Query Parameters

| Field      | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `reviewId` | string | ✅       | ID of the review |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review retrieved",
  "data": {
    "_id": "60d5ec49f8d2e30b8c8b4570",
    "user": "60d5ec49f8d2e30b8c8b4566",
    "orderId": "60d5ec49f8d2e30b8c8b4567",
    "merchantId": "60d5ec49f8d2e30b8c8b4568",
    "reviewType": "merchant",
    "rating": 5,
    "review": "Excellent service and quick preparation.",
    "createdAt": "2023-10-01T12:00:00.000Z",
    "updatedAt": "2023-10-01T12:00:00.000Z"
  }
}
```

#### Errors

| Status | Condition                         |
| ------ | --------------------------------- |
| 400    | Missing `reviewId` field in query |
| 404    | Review not found                  |

---

### 4. PATCH `/review/update-review`

Updates an existing review's rating or text content.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Request Body

```json
{
  "reviewId": "60d5ec49f8d2e30b8c8b4570",
  "rating": 4,
  "review": "Good service, but slightly delayed."
}
```

| Field      | Type   | Required | Description                        |
| ---------- | ------ | -------- | ---------------------------------- |
| `reviewId` | string | ✅       | ID of the review to update         |
| `rating`   | number | ❌       | Updated rating (1 to 5)            |
| `review`   | string | ❌       | Updated text content of the review |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review updated",
  "data": {
    "_id": "60d5ec49f8d2e30b8c8b4570",
    "user": "60d5ec49f8d2e30b8c8b4566",
    "orderId": "60d5ec49f8d2e30b8c8b4567",
    "merchantId": "60d5ec49f8d2e30b8c8b4568",
    "reviewType": "merchant",
    "rating": 4,
    "review": "Good service, but slightly delayed.",
    "createdAt": "2023-10-01T12:00:00.000Z",
    "updatedAt": "2023-10-02T12:00:00.000Z"
  }
}
```

#### Errors

| Status | Condition                                |
| ------ | ---------------------------------------- |
| 400    | Missing `reviewId` field in request body |
| 404    | Review not found                         |

---

### 5. DELETE `/review/delete-review`

Deletes a review by its ID.

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| **Auth**       | ✅ **Required** — Bearer Token (all roles) |
| **Rate Limit** | No                                         |

#### Query Parameters

| Field      | Type   | Required | Description      |
| ---------- | ------ | -------- | ---------------- |
| `reviewId` | string | ✅       | ID of the review |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review deleted",
  "data": {
    "acknowledged": true,
    "deletedCount": 1
  }
}
```

#### Errors

| Status | Condition                         |
| ------ | --------------------------------- |
| 400    | Missing `reviewId` field in query |
| 404    | Review not found                  |

---

## Error Reference

For general error response format, refer to [`docs/api/_shared.md`](file:///C:/Users/thakursaad/projects/happyphoto/docs/api/_shared.md).

| HTTP Status | Meaning                                           |
| ----------- | ------------------------------------------------- |
| 400         | Bad Request — validation failed or missing inputs |
| 401         | Unauthorized — missing or invalid auth token      |
| 404         | Not Found — requested resource doesn't exist      |
