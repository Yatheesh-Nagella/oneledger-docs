# Security Best Practices

Security implementation and best practices for OneLedger.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication Security](#authentication-security)
- [Data Encryption](#data-encryption)
- [API Security](#api-security)
- [Database Security](#database-security)
- [Environment Variables](#environment-variables)
- [Common Vulnerabilities](#common-vulnerabilities)

## Security Overview

OneLedger implements multiple layers of security:

```
┌─────────────────────────────────────────────┐
│         Security Layers                      │
├─────────────────────────────────────────────┤
│ 1. Authentication (Supabase Auth + Custom)  │
│ 2. Authorization (RLS + Manual)             │
│ 3. Encryption (AES-256-CBC)                 │
│ 4. Input Validation                         │
│ 5. Rate Limiting                            │
│ 6. Audit Logging                            │
└─────────────────────────────────────────────┘
```

## Authentication Security

### Password Security

**User Passwords (Supabase Auth):**
- ✅ Handled by Supabase (bcrypt hashing)
- ✅ Minimum length enforced (8+ characters recommended)
- ✅ Password reset via email
- ✅ No plaintext storage

**Admin Passwords (Custom Auth):**
- ✅ bcrypt hashing with cost factor 12
- ✅ Account lockout after 5 failed attempts (15 minutes)
- ✅ Failed attempt tracking
- ✅ No password in logs or error messages

**Implementation:**
```typescript
import bcrypt from 'bcryptjs';

// Hash password (cost factor 12)
const passwordHash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, storedHash);
```

**Best Practices:**
```typescript
// ✅ Good: Strong password requirements
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

// ✅ Good: Clear error messages
if (password.length < PASSWORD_MIN_LENGTH) {
  return 'Password must be at least 12 characters';
}

// ❌ Bad: Revealing which field is wrong
return 'Invalid email or password'; // Good - doesn't reveal which
// return 'Email not found'; // Bad - reveals email exists
```

---

### Two-Factor Authentication (2FA)

**TOTP (Time-based One-Time Password):**
- ✅ Using `otplib` library
- ✅ 6-digit codes
- ✅ 30-second time window
- ✅ ±60 second clock skew tolerance
- ✅ Secrets encrypted before storage

**Implementation:**
```typescript
import { authenticator } from 'otplib';

// Generate secret
const secret = authenticator.generateSecret();

// Generate QR code URL
const otpauthUrl = authenticator.keyuri(
  userEmail,
  'OneLedger Admin',
  secret
);

// Verify code (with clock skew tolerance)
const isValid = authenticator.verify({
  token: code,
  secret,
  window: 2, // ±60 seconds
});
```

**Security Notes:**
- ⚠️ TOTP secrets are **encrypted** before storage
- ⚠️ Backup codes should be generated and stored securely
- ⚠️ Enforce 2FA for all admin users

---

### Session Management

**User Sessions (Supabase):**
- ✅ JWT tokens with expiration
- ✅ Automatic refresh
- ✅ httpOnly cookies (when possible)
- ✅ Session invalidation on logout

**Admin Sessions (Custom):**
- ✅ Cryptographically secure random tokens (32 bytes)
- ✅ 8-hour expiration
- ✅ IP address tracking
- ✅ User agent tracking
- ✅ Automatic cleanup of expired sessions

**Implementation:**
```typescript
import crypto from 'crypto';

// Generate secure session token
const token = crypto.randomBytes(32).toString('hex');

// Set expiration
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + 8);

// Verify session on each request
const { data: session } = await supabase
  .from('admin_sessions')
  .select('*')
  .eq('token', token)
  .single();

if (!session || new Date(session.expires_at) < new Date()) {
  // Session invalid or expired
  return { error: 'Session expired' };
}
```

**Best Practices:**
```typescript
// ✅ Good: Short session lifetime
const SESSION_LIFETIME_HOURS = 8;

// ✅ Good: Clean up expired sessions
await supabase
  .from('admin_sessions')
  .delete()
  .lt('expires_at', new Date().toISOString());

// ✅ Good: Invalidate all sessions on password change
await supabase
  .from('admin_sessions')
  .delete()
  .eq('admin_user_id', userId);
```

---

## Data Encryption

### Plaid Access Tokens

**All Plaid access tokens are encrypted before storage:**

**Algorithm:** AES-256-CBC
**Key:** 256-bit (32 bytes) from `ENCRYPTION_KEY` env var

**Encryption:**
```typescript
import crypto from 'crypto';

function encryptAccessToken(token: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  // Generate random IV (16 bytes)
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // Encrypt
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return: IV:EncryptedText
  return iv.toString('hex') + ':' + encrypted;
}
```

**Decryption:**
```typescript
function decryptAccessToken(encryptedToken: string): string {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  // Split IV and encrypted data
  const parts = encryptedToken.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  // Decrypt
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**Generate Encryption Key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})

# Node.js
crypto.randomBytes(32).toString('hex')
```

**Security Notes:**
- ⚠️ NEVER commit `ENCRYPTION_KEY` to git
- ⚠️ Use different keys for dev/staging/production
- ⚠️ Rotate keys periodically (requires re-encrypting all tokens)
- ⚠️ Store keys in secure secret management (Vercel Env Vars, AWS Secrets Manager, etc.)

---

### TOTP Secrets

**Admin TOTP secrets are encrypted using same AES-256-CBC:**

```typescript
// Encrypt TOTP secret before storing
const encryptedSecret = encrypt(totpSecret);

await supabase
  .from('admin_users')
  .update({ totp_secret: encryptedSecret })
  .eq('id', userId);
```

---

## API Security

### Input Validation

**Always validate and sanitize user input:**

```typescript
// ✅ Good: Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return { error: 'Invalid email format' };
}

// ✅ Good: Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(userId)) {
  return { error: 'Invalid user ID' };
}

// ✅ Good: Sanitize string input
const sanitized = input.trim().slice(0, 255);

// ✅ Good: Validate numeric ranges
if (amount < 0 || amount > 1000000000) {
  return { error: 'Invalid amount' };
}
```

**Prevent SQL Injection:**
```typescript
// ✅ Good: Use parameterized queries (Supabase handles this)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput); // Safe - parameterized

// ❌ Bad: String concatenation (don't do this!)
const query = `SELECT * FROM users WHERE email = '${userInput}'`; // Unsafe!
```

---

### Authorization Checks

**Always verify user owns the resource:**

```typescript
// ✅ Good: Verify ownership
export async function DELETE(request: Request) {
  const { transactionId, userId } = await request.json();

  // Get transaction
  const { data: transaction } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('id', transactionId)
    .single();

  // Check ownership
  if (!transaction || transaction.user_id !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Delete transaction
  await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  return NextResponse.json({ success: true });
}

// ❌ Bad: No ownership check
await supabase
  .from('transactions')
  .delete()
  .eq('id', transactionId); // Anyone can delete any transaction!
```

---

### Rate Limiting

**Implement rate limiting for sensitive endpoints:**

```typescript
// Example: Limit login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const { email } = await request.json();

  // Check rate limit
  const attempt = loginAttempts.get(email);
  const now = Date.now();

  if (attempt) {
    if (now < attempt.resetAt) {
      if (attempt.count >= 5) {
        return NextResponse.json(
          { error: 'Too many attempts. Try again later.' },
          { status: 429 }
        );
      }
      attempt.count++;
    } else {
      // Reset after 15 minutes
      loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
    }
  } else {
    loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 });
  }

  // Continue with login...
}
```

**Consider using a rate limiting library:**
- `express-rate-limit` (for Express)
- Vercel Edge Config for serverless
- Redis for distributed rate limiting

---

### CORS Configuration

**Configure CORS to allow only trusted origins:**

```typescript
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://finance.yatheeshnagella.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## Database Security

### Row Level Security (RLS)

**All tables have RLS enabled:**

```sql
-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own accounts
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);
```

**Test RLS policies:**
```sql
-- Switch to user context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';

-- Try to access another user's data (should return nothing)
SELECT * FROM accounts WHERE user_id != 'user-uuid-here';
```

---

### Service Role Key Usage

**⚠️ NEVER expose service role key to client:**

```typescript
// ✅ Good: Service role key only in API routes (server-side)
import { createClient } from '@supabase/supabase-js';

export function getAdminServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Server-side only!
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ❌ Bad: Service role key in client-side code
const supabase = createClient(url, serviceRoleKey); // Don't do this!
```

**When to use service role:**
- ✅ Admin operations that bypass RLS
- ✅ Server-side data migration
- ✅ Background jobs/cron tasks
- ❌ Never in client-side code
- ❌ Never in API routes called directly by users (use anon key + RLS)

---

## Environment Variables

### Secure Storage

**Development:**
```bash
# .env (add to .gitignore!)
SUPABASE_SERVICE_ROLE_KEY=your-key-here
PLAID_SECRET=your-secret-here
ENCRYPTION_KEY=your-64-char-hex-key
```

**Production (Vercel):**
1. Go to Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable
4. Mark sensitive variables as "Secret"

**Best Practices:**
- ✅ Different keys for dev/staging/production
- ✅ Never commit secrets to git
- ✅ Use `.env.example` for template (no real values)
- ✅ Rotate secrets periodically
- ✅ Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

---

## Common Vulnerabilities

### Prevented Vulnerabilities

**✅ SQL Injection:**
- Using Supabase client (parameterized queries)
- No raw SQL with user input

**✅ XSS (Cross-Site Scripting):**
- React escapes output by default
- Sanitize HTML if using `dangerouslySetInnerHTML`

**✅ CSRF (Cross-Site Request Forgery):**
- Supabase JWT tokens (not cookies)
- SameSite cookies for admin sessions

**✅ Insecure Direct Object References:**
- Ownership checks in all API routes
- RLS policies enforce data isolation

**✅ Sensitive Data Exposure:**
- Encryption for Plaid tokens and TOTP secrets
- No sensitive data in logs or error messages
- HTTPS enforced in production

---

### Security Checklist

**Before deploying to production:**

- [ ] All environment variables set
- [ ] `ENCRYPTION_KEY` is 64-character hex (32 bytes)
- [ ] Different keys for dev/staging/production
- [ ] HTTPS enabled (Vercel does this automatically)
- [ ] RLS policies tested
- [ ] Admin 2FA enabled
- [ ] Rate limiting configured
- [ ] Error messages don't reveal sensitive info
- [ ] No secrets in git history
- [ ] Audit logging enabled
- [ ] Session timeouts configured
- [ ] Password requirements enforced
- [ ] CORS configured correctly
- [ ] Plaid webhooks verified with signature
- [ ] Database backups enabled

---

### Reporting Security Issues

**If you find a security vulnerability:**

1. **DO NOT** open a public GitHub issue
2. Email security contact directly
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

---

**Next Steps:**
- Review [Authentication](../architecture/authentication) for auth implementation
- Check [API Reference](../api/overview) for API security
- Read [Database Schema](../architecture/database) for RLS policies
