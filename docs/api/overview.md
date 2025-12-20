# API Reference

Complete reference for all OneLibro API endpoints.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Plaid APIs](#plaid-apis)
- [Transaction APIs](#transaction-apis)
- [Admin Auth APIs](#admin-auth-apis)
- [Admin Management APIs](#admin-management-apis)
- [Error Handling](#error-handling)

## Overview

OneLibro uses **Next.js API Routes** (serverless functions) for all backend operations.

**Base URL (Development):**
```
http://localhost:3000/api
```

**Base URL (Production):**
```
https://finance.yatheeshnagella.com/api
```

### API Categories

| Category | Base Path | Auth Required |
|----------|-----------|---------------|
| Plaid Integration | `/api/plaid/*` | User JWT |
| Transactions | `/api/transactions/*` | User JWT |
| Admin Auth | `/api/admin/auth/*` | None (creates session) |
| Admin Management | `/api/admin/*` | Admin Session Token |

## Authentication

### User API Authentication

**All user APIs require JWT token from Supabase:**

```bash
Authorization: Bearer <supabase_jwt_token>
```

**Example:**
```javascript
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch('/api/plaid/create-link-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ userId: user.id }),
});
```

### Admin API Authentication

**Admin APIs require session token (from login):**

```bash
Cookie: admin_session=<session_token>
```

Or via header:
```bash
Authorization: Bearer <session_token>
```

---

## Plaid APIs

### Create Link Token

Generate a Plaid Link token for connecting bank accounts.

**Endpoint:** `POST /api/plaid/create-link-token`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "userId": "uuid-string"
}
```

**Response (200 OK):**
```json
{
  "link_token": "link-sandbox-12345678-1234-1234-1234-123456789012",
  "expiration": "2024-12-04T12:00:00Z"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Unauthorized"
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to create link token"
}
```

**Example Usage:**
```typescript
const createLinkToken = async (userId: string) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();
  return data.link_token;
};
```

---

### Exchange Public Token

Exchange Plaid's public token for an access token after user connects bank.

**Endpoint:** `POST /api/plaid/exchange-token`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "publicToken": "public-sandbox-12345678-1234-1234-1234-123456789012",
  "userId": "uuid-string",
  "institutionId": "ins_3",
  "institutionName": "Chase"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "itemId": "uuid-of-plaid-item",
  "accounts": [
    {
      "id": "uuid-of-account",
      "name": "Chase Checking",
      "type": "depository",
      "subtype": "checking",
      "mask": "0000",
      "currentBalance": 250000,
      "availableBalance": 245000
    }
  ]
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Missing required fields"
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to exchange token"
}
```

**Implementation Details:**
1. Exchanges public token with Plaid API
2. Encrypts access token (AES-256-CBC)
3. Stores encrypted token in `plaid_items` table
4. Fetches and stores accounts in `accounts` table
5. Returns account list to client

**Example Usage:**
```typescript
const exchangeToken = async (publicToken: string, metadata: PlaidLinkMetadata) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/plaid/exchange-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      publicToken,
      userId: user.id,
      institutionId: metadata.institution?.institution_id,
      institutionName: metadata.institution?.name,
    }),
  });

  return response.json();
};
```

---

### Sync Transactions

Sync transactions from Plaid for a specific item.

**Endpoint:** `POST /api/plaid/sync-transactions`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "itemId": "uuid-of-plaid-item"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "added": 15,
  "modified": 3,
  "removed": 1,
  "nextCursor": "cursor-string-for-next-sync"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Plaid item not found"
}
```

**Response (500 Error):**
```json
{
  "error": "Failed to sync transactions"
}
```

**Implementation Details:**
1. Retrieves encrypted access token from database
2. Decrypts access token
3. Calls Plaid `transactionsSync` API with cursor
4. Processes added/modified transactions (upsert to DB)
5. Processes removed transactions (soft delete)
6. Updates account balances
7. Saves next cursor for incremental sync

**Example Usage:**
```typescript
const syncTransactions = async (itemId: string) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/plaid/sync-transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ itemId }),
  });

  return response.json();
};
```

---

### Unlink Account

Disconnect a Plaid item and remove all associated accounts.

**Endpoint:** `POST /api/plaid/unlink-account`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "itemId": "uuid-of-plaid-item"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (404 Not Found):**
```json
{
  "error": "Item not found"
}
```

**Example Usage:**
```typescript
const unlinkAccount = async (itemId: string) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/plaid/unlink-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ itemId }),
  });

  return response.json();
};
```

---

### Plaid Webhook

Receive webhooks from Plaid for transaction updates, errors, etc.

**Endpoint:** `POST /api/plaid/webhook`

**Authentication:** Webhook signature verification

**Request Body (Example - TRANSACTIONS_UPDATE):**
```json
{
  "webhook_type": "TRANSACTIONS",
  "webhook_code": "SYNC_UPDATES_AVAILABLE",
  "item_id": "plaid-item-id-12345",
  "initial_update_complete": true,
  "historical_update_complete": true
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Webhook Types Handled:**
- `TRANSACTIONS.SYNC_UPDATES_AVAILABLE` - New transactions available
- `ITEM.ERROR` - Item connection error
- `ITEM.LOGIN_REQUIRED` - User needs to re-authenticate

**Implementation:**
```typescript
export async function POST(request: Request) {
  const body = await request.json();

  // Verify webhook signature
  const signature = request.headers.get('plaid-verification');
  const isValid = verifyWebhookSignature(signature, body);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Handle webhook
  switch (body.webhook_code) {
    case 'SYNC_UPDATES_AVAILABLE':
      // Trigger background sync
      await triggerTransactionSync(body.item_id);
      break;

    case 'LOGIN_REQUIRED':
      // Update item status
      await updateItemStatus(body.item_id, 'login_required');
      break;
  }

  return NextResponse.json({ success: true });
}
```

---

## Transaction APIs

### Create Transaction

Create a manual transaction (not from Plaid).

**Endpoint:** `POST /api/transactions/create`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "userId": "uuid-string",
  "accountId": "uuid-of-account",
  "transactionDate": "2024-12-01",
  "amount": 4567,
  "merchantName": "Whole Foods",
  "category": "Food and Drink",
  "description": "Groceries"
}
```

**Field Details:**
- `amount`: Integer in **cents** (4567 = $45.67)
- `transactionDate`: ISO date string (YYYY-MM-DD)
- `category`: String (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid-of-transaction",
    "user_id": "uuid-string",
    "account_id": "uuid-of-account",
    "transaction_date": "2024-12-01",
    "amount": 4567,
    "merchant_name": "Whole Foods",
    "category": "Food and Drink",
    "description": "Groceries",
    "is_pending": false,
    "created_at": "2024-12-04T12:00:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Missing required fields"
}
```

**Example Usage:**
```typescript
const createTransaction = async (data: TransactionInput) => {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch('/api/transactions/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      userId: user.id,
      accountId: data.accountId,
      transactionDate: data.date,
      amount: dollarsToCents(data.amount), // Convert $45.67 to 4567
      merchantName: data.merchant,
      category: data.category,
      description: data.description,
    }),
  });

  return response.json();
};
```

---

### Update Transaction

Update an existing transaction.

**Endpoint:** `PUT /api/transactions/update`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "transactionId": "uuid-of-transaction",
  "userId": "uuid-string",
  "amount": 5000,
  "merchantName": "Updated Merchant",
  "category": "Updated Category",
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "transaction": {
    "id": "uuid-of-transaction",
    "amount": 5000,
    "merchant_name": "Updated Merchant",
    "category": "Updated Category",
    "description": "Updated description",
    "updated_at": "2024-12-04T12:00:00Z"
  }
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Cannot update Plaid-synced transactions"
}
```

**Note:** Only manual transactions (with `plaid_transaction_id = null`) can be updated.

---

### Delete Transaction

Delete a manual transaction.

**Endpoint:** `DELETE /api/transactions/delete`

**Authentication:** User JWT required

**Request Body:**
```json
{
  "transactionId": "uuid-of-transaction",
  "userId": "uuid-string"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Cannot delete Plaid-synced transactions"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Transaction not found"
}
```

---

## Admin Auth APIs

### Create First Admin

Create the initial admin user (only works if no admins exist).

**Endpoint:** `POST /api/admin/auth/create-first-admin`

**Authentication:** None (public, but only works once)

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "strong-password-here",
  "fullName": "Admin User"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "admin": {
    "id": "uuid-string",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "created_at": "2024-12-04T12:00:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Admin user already exists"
}
```

**Security Note:** This endpoint is disabled after the first admin is created.

---

### Admin Login

Authenticate admin user (step 1 of 2FA).

**Endpoint:** `POST /api/admin/auth/login`

**Authentication:** None

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response (200 OK) - No 2FA:**
```json
{
  "success": true,
  "requiresTOTP": false,
  "session": {
    "id": "session-uuid",
    "token": "64-char-hex-token",
    "expires_at": "2024-12-04T20:00:00Z"
  },
  "user": {
    "id": "admin-uuid",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "totp_enabled": false
  }
}
```

**Response (200 OK) - Requires 2FA:**
```json
{
  "requiresTOTP": true,
  "userId": "admin-uuid"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid email or password"
}
```

**Response (423 Locked):**
```json
{
  "error": "Account is temporarily locked. Please try again later."
}
```

---

### Verify TOTP

Verify 2FA code and create session (step 2 of 2FA).

**Endpoint:** `POST /api/admin/auth/verify-totp`

**Authentication:** None (requires userId from login step)

**Request Body:**
```json
{
  "userId": "admin-uuid",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "session": {
    "id": "session-uuid",
    "token": "64-char-hex-token",
    "expires_at": "2024-12-04T20:00:00Z"
  },
  "user": {
    "id": "admin-uuid",
    "email": "admin@example.com",
    "full_name": "Admin User",
    "totp_enabled": true,
    "totp_verified": true
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid code"
}
```

---

### Setup TOTP

Generate TOTP secret and QR code for 2FA setup.

**Endpoint:** `POST /api/admin/auth/setup-totp`

**Authentication:** Admin session required

**Request Body:**
```json
{
  "userId": "admin-uuid"
}
```

**Response (200 OK):**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "otpauth://totp/OneLibro%20Admin:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=OneLibro%20Admin"
}
```

**Usage:** Display QR code to user to scan with authenticator app.

---

### Verify TOTP Setup

Verify first-time TOTP setup with code from authenticator app.

**Endpoint:** `POST /api/admin/auth/verify-totp-setup`

**Authentication:** Admin session required

**Request Body:**
```json
{
  "userId": "admin-uuid",
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid code. Please try again."
}
```

---

### Verify Session

Check if admin session is still valid.

**Endpoint:** `POST /api/admin/auth/verify-session`

**Authentication:** Admin session token required

**Request Body:**
```json
{
  "token": "session-token-string"
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "admin-uuid",
    "email": "admin@example.com",
    "full_name": "Admin User"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "valid": false,
  "error": "Session expired"
}
```

---

### Logout

Invalidate admin session.

**Endpoint:** `POST /api/admin/auth/logout`

**Authentication:** Admin session token required

**Request Body:**
```json
{
  "token": "session-token-string"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Admin Management APIs

### Get Users

Retrieve list of all users.

**Endpoint:** `GET /api/admin/get-users`

**Authentication:** Admin session required

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_admin": false,
      "invite_code": "WELCOME2024",
      "invited_by": "admin-uuid",
      "last_login_at": "2024-12-04T12:00:00Z",
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 125
}
```

---

### Update User

Update user details or admin status.

**Endpoint:** `PUT /api/admin/users/[id]`

**Authentication:** Admin session required

**Request Body:**
```json
{
  "fullName": "Updated Name",
  "isAdmin": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "Updated Name",
    "is_admin": true,
    "updated_at": "2024-12-04T12:00:00Z"
  }
}
```

---

### Create Invite Code

Generate a new invite code.

**Endpoint:** `POST /api/admin/invites/create`

**Authentication:** Admin session required

**Request Body:**
```json
{
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdBy": "admin-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "invite": {
    "id": "invite-uuid",
    "code": "ABC123XYZ789",
    "max_uses": 100,
    "used_count": 0,
    "expires_at": "2024-12-31T23:59:59Z",
    "is_active": true,
    "created_at": "2024-12-04T12:00:00Z"
  }
}
```

---

### Update Invite Code

Update invite code settings.

**Endpoint:** `PUT /api/admin/invites/[id]`

**Authentication:** Admin session required

**Request Body:**
```json
{
  "maxUses": 200,
  "isActive": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "invite": {
    "id": "invite-uuid",
    "code": "ABC123XYZ789",
    "max_uses": 200,
    "is_active": false,
    "updated_at": "2024-12-04T12:00:00Z"
  }
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 423 | Locked | Account temporarily locked |
| 500 | Internal Server Error | Server error occurred |

### Error Handling Example

```typescript
const response = await fetch('/api/plaid/exchange-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});

if (!response.ok) {
  const error = await response.json();

  switch (response.status) {
    case 401:
      // Redirect to login
      router.push('/finance/login');
      break;
    case 400:
      // Show validation error
      setError(error.error);
      break;
    case 500:
      // Show generic error
      setError('Something went wrong. Please try again.');
      break;
  }

  return;
}

const data = await response.json();
// Handle success
```

---

**Next Steps:**
- Review [Helper Libraries](../reference/helper-libraries) for helper functions
- Check [Authentication](../architecture/authentication) for auth implementation
- Read [Security](../guides/security) for API security best practices
