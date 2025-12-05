# Database Schema Documentation

Complete documentation of OneLedger's PostgreSQL database schema hosted on Supabase.

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Functions & Triggers](#functions--triggers)
- [Indexes](#indexes)

## Overview

OneLedger uses **PostgreSQL** via **Supabase** with the following design principles:

- ✅ **Row Level Security (RLS)** for data isolation
- ✅ **Foreign key constraints** for referential integrity
- ✅ **Indexes** on frequently queried columns
- ✅ **Triggers** for automated updates (timestamps, etc.)
- ✅ **Cents-based storage** for monetary values (integers, not decimals)
- ✅ **UUID** primary keys for all tables

## Entity Relationship Diagram

![data-model](/img/diagrams/data-model.png) 

```
┌─────────────────┐
│  invite_codes   │
└────────┬────────┘
         │
         │ invited_by (FK)
         │
┌────────▼────────┐           ┌──────────────┐
│     users       │◄──────────│ admin_users  │
└────────┬────────┘  created_by└──────┬───────┘
         │                            │
         │ user_id (FK)        ┌──────▼─────────┐
         │                     │ admin_sessions │
┌────────▼────────┐            └────────────────┘
│  plaid_items    │                    │
└────────┬────────┘            ┌───────▼────────┐
         │                     │admin_audit_logs│
         │ plaid_item_id (FK)  └────────────────┘
         │
┌────────▼────────┐
│    accounts     │
└────────┬────────┘
         │
         │ account_id (FK)
         │
┌────────▼────────┐
│  transactions   │
└─────────────────┘
         │
         │ user_id (FK)
         │
┌────────▼────────┐
│    budgets      │
└─────────────────┘
```

## Tables

### users

Stores user profiles and invite tracking information.

**Table:** `users`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key (matches auth.users.id) |
| `email` | text | NO | - | User email (unique) |
| `full_name` | text | YES | NULL | User's full name |
| `is_admin` | boolean | NO | false | Admin flag |
| `invite_code` | text | YES | NULL | Invite code used to sign up |
| `invited_by` | uuid | YES | NULL | User ID who created the invite |
| `invite_expires_at` | timestamptz | YES | NULL | When invite code expires |
| `last_login_at` | timestamptz | YES | NULL | Last successful login |
| `created_at` | timestamptz | NO | now() | Account creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Unique: `email`
- Index: `invite_code`

**RLS Policies:**
```sql
-- Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

---

### invite_codes

Manages invitation codes for user signup.

**Table:** `invite_codes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `code` | text | NO | - | Unique invite code |
| `created_by` | uuid | NO | - | Admin user who created it |
| `max_uses` | integer | NO | 1 | Maximum number of uses |
| `used_count` | integer | NO | 0 | Current usage count |
| `expires_at` | timestamptz | NO | - | Expiration date/time |
| `is_active` | boolean | NO | true | Active status |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Indexes:**
- Primary key: `id`
- Unique: `code`

**Constraints:**
- `used_count <= max_uses`
- `expires_at > created_at`

**Example:**
```sql
INSERT INTO invite_codes (code, created_by, max_uses, expires_at)
VALUES ('WELCOME2024', 'admin-uuid', 100, '2024-12-31 23:59:59');
```

---

### plaid_items

Stores connected bank institutions and encrypted Plaid access tokens.

**Table:** `plaid_items`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to users |
| `plaid_item_id` | text | NO | - | Plaid's item ID |
| `access_token` | text | NO | - | Encrypted Plaid access token |
| `institution_id` | text | YES | NULL | Plaid institution ID |
| `institution_name` | text | YES | NULL | Bank name (e.g., "Chase") |
| `status` | text | NO | 'active' | Connection status |
| `cursor` | text | YES | NULL | Transaction sync cursor |
| `last_synced_at` | timestamptz | YES | NULL | Last sync timestamp |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- Unique: `plaid_item_id`

**RLS Policies:**
```sql
CREATE POLICY "Users can view own plaid items"
  ON plaid_items FOR SELECT
  USING (auth.uid() = user_id);
```

**Important Notes:**
- `access_token` is **encrypted** using AES-256-CBC before storage
- `cursor` is used for incremental transaction sync
- `status` values: `'active'`, `'login_required'`, `'error'`

---

### accounts

Stores bank accounts (from Plaid) and manual cash accounts.

**Table:** `accounts`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to users |
| `plaid_item_id` | uuid | YES | NULL | Foreign key to plaid_items (NULL for cash accounts) |
| `plaid_account_id` | text | YES | NULL | Plaid's account ID |
| `account_name` | text | NO | - | Account name |
| `account_type` | text | NO | - | Type (checking, savings, credit, cash) |
| `current_balance` | integer | NO | 0 | Balance in **cents** |
| `available_balance` | integer | YES | NULL | Available balance in cents |
| `currency_code` | text | NO | 'USD' | Currency (ISO 4217) |
| `is_hidden` | boolean | NO | false | Hidden from UI |
| `mask` | text | YES | NULL | Last 4 digits (e.g., "1234") |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- Foreign key: `plaid_item_id` → `plaid_items(id)` ON DELETE CASCADE
- Index: `(user_id, is_hidden)` for efficient filtering

**RLS Policies:**
```sql
CREATE POLICY "Users can manage own accounts"
  ON accounts FOR ALL
  USING (auth.uid() = user_id);
```

**Important Notes:**
- **All monetary values stored in cents** (integer, not decimal)
- Cash accounts have `plaid_item_id = NULL`
- `account_type` values: `'checking'`, `'savings'`, `'credit'`, `'loan'`, `'cash'`

**Example:**
```sql
-- Manual cash account
INSERT INTO accounts (user_id, account_name, account_type, current_balance)
VALUES ('user-uuid', 'Wallet Cash', 'cash', 15000); -- $150.00

-- Plaid-linked checking account
INSERT INTO accounts (user_id, plaid_item_id, plaid_account_id, account_name, account_type, current_balance, mask)
VALUES ('user-uuid', 'item-uuid', 'plaid-acct-id', 'Chase Checking', 'checking', 252341, '4532');
```

---

### transactions

Stores all financial transactions (from Plaid or manually added).

**Table:** `transactions`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to users |
| `account_id` | uuid | NO | - | Foreign key to accounts |
| `plaid_transaction_id` | text | YES | NULL | Plaid's transaction ID (NULL for manual) |
| `transaction_date` | date | NO | - | Transaction date |
| `amount` | integer | NO | - | Amount in **cents** (positive = debit, negative = credit) |
| `merchant_name` | text | YES | NULL | Merchant/payee name |
| `category` | text | YES | NULL | Transaction category |
| `subcategory` | text | YES | NULL | Transaction subcategory |
| `description` | text | YES | NULL | Transaction description |
| `is_pending` | boolean | NO | false | Pending status |
| `is_hidden` | boolean | NO | false | Hidden from UI |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- Foreign key: `account_id` → `accounts(id)` ON DELETE CASCADE
- **Composite index**: `(user_id, transaction_date DESC)` for fast queries
- Unique: `plaid_transaction_id` (for Plaid transactions)

**RLS Policies:**
```sql
CREATE POLICY "Users can manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);
```

**Important Notes:**
- **Amount in cents**: `$19.99` stored as `1999`
- **Positive = Debit** (money out), **Negative = Credit** (money in)
- Categories from Plaid (or custom for manual transactions)

**Example:**
```sql
-- Grocery purchase
INSERT INTO transactions (user_id, account_id, transaction_date, amount, merchant_name, category)
VALUES ('user-uuid', 'account-uuid', '2024-12-01', 4567, 'Whole Foods', 'Food and Drink');
-- Amount: $45.67

-- Paycheck (credit)
INSERT INTO transactions (user_id, account_id, transaction_date, amount, merchant_name, category)
VALUES ('user-uuid', 'account-uuid', '2024-12-01', -250000, 'Employer Inc', 'Income');
-- Amount: -$2,500.00 (negative = credit)
```

---

### budgets

User-defined spending budgets by category.

**Table:** `budgets`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `user_id` | uuid | NO | - | Foreign key to users |
| `name` | text | NO | - | Budget name |
| `category` | text | NO | - | Transaction category to track |
| `amount` | integer | NO | - | Budget limit in **cents** |
| `spent_amount` | integer | NO | 0 | Current spending in cents |
| `period` | text | NO | - | Period (weekly, monthly, yearly) |
| `start_date` | date | YES | NULL | Budget start date |
| `end_date` | date | YES | NULL | Budget end date |
| `is_active` | boolean | NO | true | Active status |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `user_id` → `users(id)` ON DELETE CASCADE
- Index: `(user_id, is_active)`

**RLS Policies:**
```sql
CREATE POLICY "Users can manage own budgets"
  ON budgets FOR ALL
  USING (auth.uid() = user_id);
```

**Important Notes:**
- `period` values: `'weekly'`, `'monthly'`, `'yearly'`
- `spent_amount` is calculated automatically from transactions

**Example:**
```sql
-- Monthly grocery budget: $500
INSERT INTO budgets (user_id, name, category, amount, period)
VALUES ('user-uuid', 'Groceries', 'Food and Drink', 50000, 'monthly');
```

---

### admin_users

Separate admin authentication system with 2FA support.

**Table:** `admin_users`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `email` | text | NO | - | Admin email (unique) |
| `password_hash` | text | NO | - | bcrypt password hash |
| `full_name` | text | YES | NULL | Admin's full name |
| `totp_secret` | text | YES | NULL | Encrypted TOTP secret |
| `totp_enabled` | boolean | NO | false | TOTP enabled flag |
| `totp_verified` | boolean | NO | false | TOTP verified flag |
| `failed_login_attempts` | integer | NO | 0 | Failed login counter |
| `locked_until` | timestamptz | YES | NULL | Account lock expiration |
| `last_login_at` | timestamptz | YES | NULL | Last successful login |
| `last_login_ip` | text | YES | NULL | Last login IP address |
| `is_active` | boolean | NO | true | Active status |
| `created_at` | timestamptz | NO | now() | Creation timestamp |
| `updated_at` | timestamptz | NO | now() | Last update timestamp |

**Indexes:**
- Primary key: `id`
- Unique: `email`

**Important Notes:**
- Passwords hashed with **bcrypt** (cost factor: 12)
- TOTP secrets **encrypted** with AES-256-CBC
- Account locks for 15 minutes after 5 failed attempts

---

### admin_sessions

Admin session management (separate from Supabase Auth).

**Table:** `admin_sessions`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `admin_user_id` | uuid | NO | - | Foreign key to admin_users |
| `token` | text | NO | - | Session token (64-char hex) |
| `expires_at` | timestamptz | NO | - | Session expiration (8 hours) |
| `ip_address` | text | YES | NULL | Client IP address |
| `user_agent` | text | YES | NULL | Client user agent |
| `created_at` | timestamptz | NO | now() | Creation timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `admin_user_id` → `admin_users(id)` ON DELETE CASCADE
- Unique: `token`

**Important Notes:**
- Sessions expire after **8 hours**
- Token is **64-character hex string** (crypto.randomBytes(32))

---

### admin_audit_logs

Audit trail for admin actions.

**Table:** `admin_audit_logs`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key |
| `admin_user_id` | uuid | NO | - | Foreign key to admin_users |
| `action` | text | NO | - | Action type (login, create_invite, etc.) |
| `resource_type` | text | YES | NULL | Resource type (user, invite_code, etc.) |
| `resource_id` | text | YES | NULL | Resource ID |
| `details` | jsonb | YES | NULL | Additional details |
| `ip_address` | text | YES | NULL | Client IP |
| `user_agent` | text | YES | NULL | Client user agent |
| `created_at` | timestamptz | NO | now() | Timestamp |

**Indexes:**
- Primary key: `id`
- Foreign key: `admin_user_id` → `admin_users(id)` ON DELETE CASCADE
- Index: `(admin_user_id, created_at DESC)`
- Index: `(action, created_at DESC)`

**Example:**
```sql
INSERT INTO admin_audit_logs (admin_user_id, action, resource_type, resource_id, details)
VALUES (
  'admin-uuid',
  'create_invite',
  'invite_code',
  'invite-uuid',
  '{"code": "WELCOME2024", "max_uses": 100}'::jsonb
);
```

---

## Row Level Security (RLS)

All tables have RLS **enabled** to ensure data isolation.

### User Data Policies

```sql
-- Users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Accounts table
CREATE POLICY "Users can manage own accounts"
  ON accounts FOR ALL
  USING (auth.uid() = user_id);

-- Transactions table
CREATE POLICY "Users can manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);

-- Budgets table
CREATE POLICY "Users can manage own budgets"
  ON budgets FOR ALL
  USING (auth.uid() = user_id);

-- Plaid items table
CREATE POLICY "Users can view own plaid items"
  ON plaid_items FOR SELECT
  USING (auth.uid() = user_id);
```

### Admin-Only Policies

```sql
-- Invite codes (admin-only management)
CREATE POLICY "Only admins can manage invite codes"
  ON invite_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Public can view active invite codes (for signup validation)
CREATE POLICY "Anyone can view active invite codes"
  ON invite_codes FOR SELECT
  USING (is_active = true AND expires_at > now());
```

## Functions & Triggers

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Repeat for: accounts, transactions, budgets, plaid_items, admin_users
```

### Create User Profile Trigger

```sql
-- Automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Indexes

### Performance Indexes

```sql
-- High-frequency queries
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_accounts_user ON accounts(user_id) WHERE is_hidden = false;
CREATE INDEX idx_plaid_items_user ON plaid_items(user_id);
CREATE INDEX idx_budgets_user_active ON budgets(user_id) WHERE is_active = true;

-- Admin audit logs
CREATE INDEX idx_admin_audit_logs_user ON admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action, created_at DESC);
```

## Data Types Best Practices

### Monetary Values

**✅ Store as cents (integer):**
```sql
current_balance INTEGER -- $123.45 = 12345
```

**❌ Don't use decimal/numeric:**
```sql
current_balance DECIMAL(10,2) -- Avoid!
```

**Reason:** Integers avoid floating-point precision issues.

### Dates vs Timestamps

- **`date`** for transaction dates (no time needed)
- **`timestamptz`** for created_at, updated_at (includes timezone)

---

**Next Steps:**
- Review [Authentication](./authentication) for auth implementation
- Check [API Reference](../api/overview) for database queries via API
- Read [Helper Libraries](../reference/helper-libraries) for query helper functions
