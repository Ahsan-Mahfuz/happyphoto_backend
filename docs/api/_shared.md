# Shared API Contracts

This document defines the cross-module contracts for authentication, error handling, pagination, and rate limiting. All modules adhere to these baselines unless explicitly overridden in their respective documentation.

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication.

- **Token Lifecycle**:
  - `accessToken`: Issued upon login, valid for short durations. Passed in the `Authorization` header as `Bearer <token>`.
  - `refreshToken`: Issued alongside the access token, used to obtain new access tokens. Passed in an HTTP-Only, Secure cookie.
- **Roles**: Access is governed by RBAC (Role-Based Access Control). Available roles include `USER`, `ADMIN`, `PROPERTY_HOST`, `DRIVER`, and `MERCHANT`.

## Error Response Envelope

All API errors return a standard JSON envelope:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive error message",
  "errorMessages": [
    {
      "path": "field_name",
      "message": "Specific field error"
    }
  ],
  "stack": "..." // Only present in non-production environments
}
```

### Error Code Registry

| HTTP Status | Meaning                                            |
| ----------- | -------------------------------------------------- |
| 400         | Bad Request — validation failed or incorrect input |
| 401         | Unauthorized — missing, invalid, or expired token  |
| 403         | Forbidden — access denied for the user's role      |
| 404         | Not Found — resource doesn't exist                 |
| 429         | Too Many Requests — rate limit exceeded            |
| 500         | Internal Server Error                              |

## Pagination, Filtering, & Sorting

Lists are requested using URL query parameters:

- **Pagination**: `?page=1&limit=10` (Default: `page=1`, `limit=10`)
- **Sorting**: `?sort=createdAt,-name` (Default: `-createdAt`)
- **Searching**: `?searchTerm=keyword` (Searches configured fields)
- **Filtering**: `?field=value` (Exact match)
- **Field Selection**: `?fields=name,email` (Include) or `?fields=-__v` (Exclude)

### Pagination Meta

Paginated responses include a `meta` object:

```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPage": 5
  },
  "data": [...]
}
```

## Common Request & Response Headers

- **Request**:
  - `Authorization`: `Bearer <token>` (Required for protected endpoints)
- **Response**:
  - `Content-Type`: `application/json`

## Default Rate Limits

By default, the global rate limit restricts a single IP address to **10 requests per hour** for specific endpoints (like login). Some endpoints may have different rate limits defined in their module documentation.

## Formats

- **Date/Time**: ISO 8601 format (e.g., `2026-07-06T14:20:00Z`)
- **ID Format**: MongoDB ObjectId (24-character hex string)
