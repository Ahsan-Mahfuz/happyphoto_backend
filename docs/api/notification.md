# Notification Module — API Documentation

> **Base Path:** `/notification`
> **Source:** [`src/app/module/notification`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/notification)

---

## Table of Contents

- [Overview](#overview)
- [Data Models](#data-models)
- [Routes](#routes)
  - [GET /notification/get-all-notifications](#1-get-notificationget-all-notifications)
  - [GET /notification/get-notification](#2-get-notificationget-notification)
  - [PATCH /notification/update-as-mark-unread](#3-patch-notificationupdate-as-mark-unread)
  - [DELETE /notification/delete-notification](#4-delete-notificationdelete-notification)
- [Error Reference](#error-reference)

---

## Overview

The Notification module handles fetching, reading, and deleting notifications for all platform users.

**Role-based Routing:** The module uses a dual-collection design.

- If the authenticated user is an `ADMIN`, the service automatically interacts with the `AdminNotification` collection.
- If the authenticated user is a standard `USER` (or `DRIVER`, `MERCHANT`, etc.), it interacts with the `Notification` collection, isolating their notifications using their `userId`.

**All routes in this module are available to all authenticated roles (`config.auth_level.all`).**

---

## Data Models

**1. Standard Notification** (`Notification` collection)

```typescript
{
  toId: ObjectId; // The target user
  title: string;
  message: string;
  isRead: boolean; // default: false
}
```

**2. Admin Notification** (`AdminNotification` collection)

```typescript
{
  title: string;
  message: string;
  isRead: boolean; // default: false
}
```

---

## Routes

### 1. GET `/notification/get-all-notifications`

Retrieves a paginated list of notifications for the authenticated user. Admins will receive platform-wide admin notifications, while other users will receive their personal notifications.

| Property       | Value        |
| -------------- | ------------ |
| **Auth**       | ✅ All Roles |
| **Pagination** | ✅ Yes       |

#### Query Parameters

| Field        | Type   | Required | Description    |
| ------------ | ------ | -------- | -------------- |
| `page`       | number | ❌       | Page number    |
| `limit`      | number | ❌       | Limit per page |
| `searchTerm` | string | ❌       | Search text    |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notifications retrieved",
  "meta": { "page": 1, "limit": 10, "total": 2 },
  "data": [
    {
      "_id": "ObjectId",
      "toId": "ObjectId",
      "title": "Order Update",
      "message": "Your order has been shipped.",
      "isRead": false,
      "createdAt": "2023-10-01T12:00:00.000Z"
    }
  ]
}
```

---

### 2. GET `/notification/get-notification`

Retrieves a single notification by its ID.

| Property | Value        |
| -------- | ------------ |
| **Auth** | ✅ All Roles |

#### Query Parameters

| Field            | Type   | Required   | Description                                                                                                 |
| ---------------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `notificationId` | string | ✅ (Users) | The ID of the notification. _(Note: Ignored for Admins, who receive the first document in the collection)._ |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification retrieved",
  "data": {
    "_id": "ObjectId",
    "title": "Order Update",
    "message": "Your order has been shipped.",
    "isRead": false
  }
}
```

#### Errors

| Status | Condition                            |
| ------ | ------------------------------------ |
| 400    | Missing `notificationId` (For Users) |
| 404    | Notification not found               |

---

### 3. PATCH `/notification/update-as-mark-unread`

Bulk updates **all** notifications for the authenticated user (or all admin notifications) to the specified read/unread status.

| Property | Value        |
| -------- | ------------ |
| **Auth** | ✅ All Roles |

#### Request Body

```json
{
  "isRead": true
}
```

| Field    | Type    | Required | Description                                |
| -------- | ------- | -------- | ------------------------------------------ |
| `isRead` | boolean | ✅       | `true` to mark as read, `false` for unread |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification updated",
  "data": {
    "acknowledged": true,
    "modifiedCount": 5,
    "upsertedId": null,
    "upsertedCount": 0,
    "matchedCount": 5
  }
}
```

#### Errors

| Status | Condition                                    |
| ------ | -------------------------------------------- |
| 400    | No documents were modified (Already updated) |

---

### 4. DELETE `/notification/delete-notification`

Deletes a specific notification by its ID.

| Property | Value        |
| -------- | ------------ |
| **Auth** | ✅ All Roles |

#### Request Body

```json
{
  "notificationId": "ObjectId"
}
```

| Field            | Type   | Required | Description            |
| ---------------- | ------ | -------- | ---------------------- |
| `notificationId` | string | ✅       | ID of the notification |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification deleted",
  "data": {
    "_id": "ObjectId",
    "title": "Deleted Notification..."
  }
}
```

#### Errors

| Status | Condition                        |
| ------ | -------------------------------- |
| 400    | Missing `notificationId`         |
| 404    | Notification not found to delete |

---

## Error Reference

| HTTP Status | Meaning                                            |
| ----------- | -------------------------------------------------- |
| 400         | Bad Request — validation failed or no updates made |
| 401         | Unauthorized — token missing or invalid            |
| 404         | Not Found — notification document does not exist   |
