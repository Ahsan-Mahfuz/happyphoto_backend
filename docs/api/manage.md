# Manage Module — API Documentation

> **Base Path:** `/manage`
> **Source:** [`src/app/module/manage`](file:///C:/Users/thakursaad/projects/happyphoto/src/app/module/manage)

---

## Table of Contents

- [Overview](#overview)
- [Entities Managed](#entities-managed)
- [Routes Structure](#routes-structure)
  - [1. Add/Update Document](#1-addupdate-document-post)
  - [2. Get Document](#2-get-document-get)
  - [3. Delete Document](#3-delete-document-delete)
- [Specific Endpoints Map](#specific-endpoints-map)

---

## Overview

The Manage module handles static, platform-wide content pages such as Terms & Conditions, Privacy Policy, About Us, FAQs, and Contact Us information.

Because these documents represent singular global states (e.g., there is only one active "Privacy Policy" at a time), the `POST` endpoints behave as **upserts**: if a document doesn't exist, it is created; if it does, it is updated.

---

## Entities Managed

All entities in this module share the exact same schema and logic.

**Schema:**

```typescript
{
  description: string; // The markdown/HTML or text content of the page
  createdAt: Date;
  updatedAt: Date;
}
```

**Collections:**

- `TermsConditions`
- `PrivacyPolicy`
- `FAQ`
- `AboutUs`
- `ContactUs`

---

## Routes Structure

For each of the 5 entities, there are 3 endpoints (Add/Update, Get, Delete). Below is the generic shape of these endpoints.

### 1. Add/Update Document (POST)

Creates the document if it doesn't exist, or completely overwrites it if it does.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Request Body

```json
{
  "description": "<h1>Privacy Policy</h1><p>We respect your data...</p>"
}
```

| Field         | Type   | Required | Description                      |
| ------------- | ------ | -------- | -------------------------------- |
| `description` | string | ✅       | The full content of the document |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "[Entity] updated",
  "data": {
    "_id": "ObjectId",
    "description": "<h1>Privacy Policy</h1>...",
    "updatedAt": "2023-10-01T12:00:00.000Z"
  }
}
```

---

### 2. Get Document (GET)

Retrieves the currently active document.

| Property | Value            |
| -------- | ---------------- |
| **Auth** | ❌ None (Public) |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successful",
  "data": {
    "_id": "ObjectId",
    "description": "<h1>Privacy Policy</h1>..."
  }
}
```

---

### 3. Delete Document (DELETE)

Deletes the active document.

| Property | Value      |
| -------- | ---------- |
| **Auth** | ✅ `ADMIN` |

#### Query Parameters

| Field | Type   | Required | Description                                 |
| ----- | ------ | -------- | ------------------------------------------- |
| `id`  | string | ✅       | The MongoDB `_id` of the document to delete |

#### Response — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful",
  "data": {
    "acknowledged": true,
    "deletedCount": 1
  }
}
```

#### Errors

| Status | Condition                           |
| ------ | ----------------------------------- |
| 404    | Document with provided ID not found |

---

## Specific Endpoints Map

Substitute the generic shapes above into the specific paths below:

| Entity                 | Method | Path                              | Auth    |
| ---------------------- | ------ | --------------------------------- | ------- |
| **Terms & Conditions** | POST   | `/manage/add-terms-conditions`    | `ADMIN` |
|                        | GET    | `/manage/get-terms-conditions`    | Public  |
|                        | DELETE | `/manage/delete-terms-conditions` | `ADMIN` |
| **Privacy Policy**     | POST   | `/manage/add-privacy-policy`      | `ADMIN` |
|                        | GET    | `/manage/get-privacy-policy`      | Public  |
|                        | DELETE | `/manage/delete-privacy-policy`   | `ADMIN` |
| **About Us**           | POST   | `/manage/add-about-us`            | `ADMIN` |
|                        | GET    | `/manage/get-about-us`            | Public  |
|                        | DELETE | `/manage/delete-about-us`         | `ADMIN` |
| **FAQ**                | POST   | `/manage/add-faq`                 | `ADMIN` |
|                        | GET    | `/manage/get-faq`                 | Public  |
|                        | DELETE | `/manage/delete-faq`              | `ADMIN` |
| **Contact Us**         | POST   | `/manage/add-contact-us`          | `ADMIN` |
|                        | GET    | `/manage/get-contact-us`          | Public  |
|                        | DELETE | `/manage/delete-contact-us`       | `ADMIN` |
