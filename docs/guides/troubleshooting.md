# Troubleshooting Guide

Common issues and solutions for OneLedger development.

## Table of Contents

- [Development Environment](#development-environment)
- [Build Errors](#build-errors)
- [Supabase Issues](#supabase-issues)
- [Plaid Integration](#plaid-integration)
- [Authentication Problems](#authentication-problems)
- [Database Errors](#database-errors)
- [Performance Issues](#performance-issues)

---

## Development Environment

### "Module not found" Errors

**Problem:** Import errors like `Cannot find module '@/lib/supabase'`

**Solutions:**

1. **Check path aliases in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. **Clear Next.js cache:**
```bash
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

3. **Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

4. **Restart TypeScript server (VS Code):**
- Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
- Type "TypeScript: Restart TS Server"

---

### Development Server Won't Start

**Problem:** `npm run dev` fails or port is already in use

**Solutions:**

1. **Port 3000 already in use:**
```bash
# Find process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

2. **Node version mismatch:**
```bash
# Check Node version (need 20+)
node --version

# Install correct version with nvm
nvm install 20
nvm use 20
```

3. **Clear everything and restart:**
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

---

### TypeScript Errors

**Problem:** TypeScript errors in working code

**Solutions:**

1. **Regenerate Supabase types:**
```bash
# Install Supabase CLI
npm install -g supabase

# Generate types
npx supabase gen types typescript --project-id <your-project-id> > types/supabase.ts
```

2. **Clear TypeScript cache:**
```bash
# Delete TypeScript build info
rm -rf tsconfig.tsbuildinfo
rm -rf .next
```

3. **Check for type mismatches:**
```typescript
// If Supabase types don't match database schema
// Option 1: Re-generate types (see above)
// Option 2: Type assertion (temporary)
const data = result as MyType;
```

---

## Build Errors

### "Invalid environment variable" Error

**Problem:** Build fails with environment variable validation errors

**Error message:**
```
❌ Invalid environment variables:
  - ENCRYPTION_KEY: Required
  - PLAID_SECRET: Required
```

**Solutions:**

1. **Check `.env` file exists:**
```bash
ls -la .env
```

2. **Verify all required variables are set:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
ENCRYPTION_KEY=... # Must be 64 hex characters!
```

3. **Generate missing encryption key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
```

4. **No spaces or quotes in `.env`:**
```env
# ✅ Correct
PLAID_SECRET=abc123

# ❌ Wrong (extra spaces)
PLAID_SECRET = abc123

# ❌ Wrong (quotes)
PLAID_SECRET="abc123"
```

5. **Restart dev server after changing `.env`:**
```bash
# Kill and restart
npm run dev
```

---

### Build Succeeds but Runtime Errors

**Problem:** `npm run build` succeeds but app crashes on start

**Solutions:**

1. **Check environment variables in production:**
- Vercel: Go to Settings → Environment Variables
- Ensure all required vars are set

2. **Check for client-side environment variable usage:**
```typescript
// ❌ Wrong: Server-only var used on client
const secret = process.env.PLAID_SECRET; // undefined on client!

// ✅ Correct: Use only NEXT_PUBLIC_ vars on client
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// ✅ Correct: Use server-only vars in API routes
export async function POST(request: Request) {
  const secret = process.env.PLAID_SECRET; // Works in API route
}
```

3. **Check for dynamic imports:**
```typescript
// If library only works on server
import { someLibrary } from 'server-only-lib'; // Might fail

// Use dynamic import instead
const { someLibrary } = await import('server-only-lib');
```

---

## Supabase Issues

### "Row not found" Error

**Problem:** Query returns null when data should exist

**Common Causes:**

1. **RLS policy blocking access:**
```typescript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id); // Should match row's user_id
```

2. **Check RLS policies in Supabase:**
```sql
-- In Supabase SQL Editor
SELECT * FROM accounts WHERE user_id = 'the-uuid-here';
-- If this works in SQL Editor but not from app, it's an RLS issue
```

3. **Using anon key vs service role:**
```typescript
// ✅ Use service role client for admin operations
import { getAdminServiceClient } from '@/lib/admin-auth';
const supabase = getAdminServiceClient();

// ⚠️ Regular client respects RLS
import { supabase } from '@/lib/supabase';
```

---

### "Permission denied" Error

**Problem:** `new row violates row-level security policy`

**Solutions:**

1. **Check INSERT policy exists:**
```sql
-- Create policy if missing
CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

2. **Ensure user_id matches auth user:**
```typescript
const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase
  .from('accounts')
  .insert({
    user_id: user.id, // Must match authenticated user!
    account_name: 'Checking',
    // ...
  });
```

3. **Temporarily disable RLS for debugging:**
```sql
-- ⚠️ Only for debugging! Re-enable after testing
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
-- Test insert
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
```

---

### Connection Timeouts

**Problem:** Queries hang or timeout

**Solutions:**

1. **Check Supabase project status:**
- Go to Supabase dashboard
- Check if project is paused (free tier pauses after inactivity)
- Click "Restore" if paused

2. **Check database connections:**
```sql
-- See active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections (if too many)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < current_timestamp - INTERVAL '1 hour';
```

3. **Optimize query:**
```typescript
// ❌ Slow: Fetching unnecessary data
const { data } = await supabase
  .from('transactions')
  .select('*');

// ✅ Fast: Select only needed columns
const { data } = await supabase
  .from('transactions')
  .select('id, amount, transaction_date')
  .limit(100);
```

---

## Plaid Integration

### Plaid Link Doesn't Open

**Problem:** Click "Connect Bank Account" but nothing happens

**Solutions:**

1. **Check browser console for errors:**
- Press F12 → Console tab
- Look for errors like `link_token is required`

2. **Verify link token creation:**
```typescript
// Add logging
const createLinkToken = async () => {
  console.log('Creating link token...');
  const response = await fetch('/api/plaid/create-link-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId: user.id }),
  });

  const data = await response.json();
  console.log('Link token response:', data);

  if (data.error) {
    console.error('Error creating link token:', data.error);
  }
};
```

3. **Check Plaid credentials:**
```env
# Verify these are set correctly
PLAID_CLIENT_ID=your-client-id
PLAID_SECRET=your-sandbox-secret
PLAID_ENV=sandbox
```

4. **Check redirect URIs in Plaid Dashboard:**
- Go to Plaid Dashboard → API → Allowed redirect URIs
- Add: `http://localhost:3000`
- Add: `http://finance.localhost:3000`

---

### "Invalid access token" Error

**Problem:** Plaid API returns `INVALID_ACCESS_TOKEN`

**Causes & Solutions:**

1. **Token was revoked or expired:**
```typescript
// Update Plaid item status
await supabase
  .from('plaid_items')
  .update({ status: 'login_required' })
  .eq('id', itemId);

// User needs to re-link account using update mode
```

2. **Decryption failed:**
```typescript
// Verify encryption key hasn't changed
console.log('Encryption key length:', process.env.ENCRYPTION_KEY?.length);
// Should be 64 characters
```

3. **Using wrong environment:**
```typescript
// If token was created in sandbox but now using production
// Create new token with correct environment
```

---

### Sandbox Connection Fails

**Problem:** Can't connect to Plaid sandbox institution

**Solutions:**

1. **Use correct test credentials:**
```
Username: user_good
Password: pass_good
```

2. **Try different test credentials for specific scenarios:**
```
# Successful connection
user_good / pass_good

# Requires MFA
user_good (will prompt for MFA code: 1234)

# Invalid credentials
user_bad / pass_bad

# Locked account
user_locked / pass_locked
```

3. **Check Plaid environment:**
```typescript
// In lib/plaid.ts
console.log('Plaid environment:', process.env.PLAID_ENV);
// Should be 'sandbox' for testing
```

4. **Search for "Plaid Sandbox" in institution search:**
- Don't search for real banks in sandbox
- Look for "Plaid Sandbox" or "First Platypus Bank"

---

### Transactions Not Syncing

**Problem:** Connected bank but no transactions appear

**Solutions:**

1. **Check transaction sync status:**
```sql
-- Check last sync time
SELECT institution_name, last_synced_at, cursor
FROM plaid_items
WHERE user_id = 'your-user-id';
```

2. **Manually trigger sync:**
```typescript
const response = await fetch('/api/plaid/sync-transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ itemId: plaidItemId }),
});

const result = await response.json();
console.log('Sync result:', result);
```

3. **Check for sync errors:**
```sql
-- Look for error logs
SELECT * FROM plaid_items WHERE status = 'error';
```

4. **Sandbox transactions:**
- Sandbox accounts have limited transaction history
- Transactions may be dated months ago
- Check date filter in UI

---

## Authentication Problems

### "User not authenticated" Error

**Problem:** User appears logged in but API calls fail with 401

**Solutions:**

1. **Check if session expired:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Expires at:', session?.expires_at);
```

2. **Refresh session:**
```typescript
const { data: { session } } = await supabase.auth.refreshSession();
```

3. **Check Authorization header:**
```typescript
// Verify token is being sent
const response = await fetch('/api/plaid/create-link-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session?.access_token}`, // Should not be undefined
  },
});
```

4. **Re-login:**
```typescript
// Clear session and re-authenticate
await supabase.auth.signOut();
// User signs in again
```

---

### Admin Login Fails with Correct Password

**Problem:** Admin can't login even with correct credentials

**Solutions:**

1. **Check if account is locked:**
```sql
SELECT email, locked_until, failed_login_attempts
FROM admin_users
WHERE email = 'admin@example.com';

-- Unlock account
UPDATE admin_users
SET locked_until = NULL,
    failed_login_attempts = 0
WHERE email = 'admin@example.com';
```

2. **Check if account is active:**
```sql
SELECT is_active FROM admin_users
WHERE email = 'admin@example.com';

-- Activate account
UPDATE admin_users
SET is_active = true
WHERE email = 'admin@example.com';
```

3. **Reset password:**
```typescript
// Use create-first-admin endpoint if no admins exist
// Or update password hash directly in database
import bcrypt from 'bcryptjs';

const newPasswordHash = await bcrypt.hash('new-password', 12);

await supabase
  .from('admin_users')
  .update({ password_hash: newPasswordHash })
  .eq('email', 'admin@example.com');
```

---

### TOTP Code Always Invalid

**Problem:** 2FA codes never work

**Solutions:**

1. **Check time synchronization:**
- TOTP codes are time-based
- Ensure server and client clocks are synchronized
- Check with: https://time.is/

2. **Try multiple codes:**
- Code window is ±60 seconds
- Try the current code and one before/after

3. **Re-setup TOTP:**
```sql
-- Reset TOTP
UPDATE admin_users
SET totp_enabled = false,
    totp_verified = false,
    totp_secret = NULL
WHERE id = 'admin-uuid';

-- Admin can now setup TOTP again
```

4. **Check encryption:**
```typescript
// Verify TOTP secret can be decrypted
const { data: admin } = await supabase
  .from('admin_users')
  .select('totp_secret')
  .eq('id', userId)
  .single();

try {
  const secret = decrypt(admin.totp_secret);
  console.log('Secret decrypted successfully');
} catch (error) {
  console.error('Decryption failed - encryption key may have changed');
}
```

---

## Database Errors

### "relation does not exist" Error

**Problem:** `relation "public.accounts" does not exist`

**Solutions:**

1. **Run migrations:**
```bash
# If using Supabase CLI
npx supabase db push

# Or manually in Supabase SQL Editor
-- Run each migration file in order
```

2. **Check table exists:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

3. **Recreate table:**
```sql
-- Copy SQL from migration file and run
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- ... rest of schema
);
```

---

### "duplicate key value violates unique constraint"

**Problem:** Insert fails with unique constraint violation

**Solutions:**

1. **Check for existing record:**
```sql
SELECT * FROM invite_codes WHERE code = 'WELCOME2024';

-- Update instead of insert
UPDATE invite_codes
SET max_uses = 100
WHERE code = 'WELCOME2024';
```

2. **Use upsert:**
```typescript
const { error } = await supabase
  .from('invite_codes')
  .upsert({
    code: 'WELCOME2024',
    max_uses: 100,
    // ... other fields
  });
```

3. **Generate unique values:**
```typescript
// For codes, use UUID or random string
import crypto from 'crypto';

const uniqueCode = crypto.randomBytes(8).toString('hex').toUpperCase();
```

---

## Performance Issues

### Slow Page Load

**Problem:** Pages take too long to load

**Solutions:**

1. **Check for N+1 queries:**
```typescript
// ❌ Bad: N+1 query problem
const accounts = await getUserAccounts(userId);
for (const account of accounts) {
  const item = await getPlaidItem(account.plaid_item_id); // N queries!
}

// ✅ Good: Single query with join
const accounts = await supabase
  .from('accounts')
  .select(`
    *,
    plaid_items (*)
  `)
  .eq('user_id', userId);
```

2. **Add loading states:**
```typescript
function Dashboard() {
  const { accounts, loading } = useAccounts();

  if (loading) return <LoadingSpinner />;

  return <div>{/* Render accounts */}</div>;
}
```

3. **Implement pagination:**
```typescript
// Don't fetch all transactions at once
const transactions = await getUserTransactions(userId, {
  limit: 50,
  offset: page * 50,
});
```

4. **Use SWR caching:**
```typescript
import useSWR from 'swr';

function useAccounts() {
  const { data, error } = useSWR(
    `/api/accounts/${user.id}`,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return { accounts: data, loading: !error && !data, error };
}
```

---

### High Memory Usage

**Problem:** Node.js process uses too much memory

**Solutions:**

1. **Check for memory leaks:**
```typescript
// Unsubscribe from listeners
useEffect(() => {
  const subscription = supabase
    .channel('transactions')
    .on('INSERT', handleInsert)
    .subscribe();

  return () => {
    subscription.unsubscribe(); // Important!
  };
}, []);
```

2. **Limit query results:**
```typescript
// Don't fetch unlimited data
const transactions = await supabase
  .from('transactions')
  .select('*')
  .limit(100); // Always use limit
```

3. **Restart development server:**
```bash
# Memory leaks common in dev mode
# Restart helps
npm run dev
```

---

## Getting More Help

### Enable Debug Logging

```typescript
// In lib/supabase.ts
export const supabase = createClient(url, key, {
  auth: {
    debug: true, // Enable auth debugging
  },
});

// In API routes
console.log('Request:', await request.json());
console.log('Response:', result);
```

### Check Vercel Logs

```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs

# View real-time logs
vercel logs --follow
```

### Supabase Logs

1. Go to Supabase Dashboard
2. Click "Logs" in sidebar
3. Select log type:
   - API logs (shows all requests)
   - Database logs (shows queries)
   - Auth logs (shows login attempts)

---

**Still stuck?** Open an issue on GitHub with:
- Description of problem
- Steps to reproduce
- Error messages
- Environment (OS, Node version, browser)
- Relevant code snippets
