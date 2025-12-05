# Authentication Guide

Complete guide to authentication and authorization in OneLedger.

## Table of Contents

- [Overview](#overview)
- [User Authentication](#user-authentication)
- [Admin Authentication](#admin-authentication)
- [Session Management](#session-management)
- [Protected Routes](#protected-routes)
- [API Authentication](#api-authentication)

## Overview

OneLedger has **two separate authentication systems**:

1. **User Authentication** - Supabase Auth for finance app users
2. **Admin Authentication** - Custom auth with TOTP 2FA for admin dashboard

```
┌─────────────────────────────────────────────────┐
│           Authentication Systems                 │
├──────────────────────┬──────────────────────────┤
│   User Auth          │    Admin Auth            │
│   (Finance App)      │    (Admin Dashboard)     │
├──────────────────────┼──────────────────────────┤
│ Supabase Auth        │ Custom Auth              │
│ JWT Tokens           │ Session Tokens           │
│ Invite-Only Signup   │ TOTP 2FA                 │
│ Password Auth        │ bcrypt Passwords         │
│ RLS Enforcement      │ Manual Authorization     │
└──────────────────────┴──────────────────────────┘
```

## User Authentication

### Architecture

**User auth uses Supabase Authentication:**

```
User → Supabase Auth → JWT Token → Row Level Security
```

### Sign Up Flow

**1. User enters email, password, name, and invite code**

Component: `/app/finance/login/page.tsx`

```typescript
const handleSignUp = async (e: FormEvent) => {
  e.preventDefault();

  const { user, error } = await signUpWithInvite(
    email,
    password,
    fullName,
    inviteCode
  );

  if (error) {
    // Show error
    return;
  }

  // Redirect to dashboard
  router.push('/finance');
};
```

**2. Validate invite code**

Function: `lib/supabase.ts:signUpWithInvite()`

```typescript
export async function signUpWithInvite(
  email: string,
  password: string,
  fullName: string,
  inviteCode: string
): Promise<{ user: User | null; error: string | null }> {
  // 1. Verify invite code exists and is active
  const { data: invite, error: inviteError } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', inviteCode)
    .eq('is_active', true)
    .single();

  if (inviteError || !invite) {
    return { user: null, error: 'Invalid invite code' };
  }

  // 2. Check expiration
  if (new Date(invite.expires_at) < new Date()) {
    return { user: null, error: 'Invite code has expired' };
  }

  // 3. Check usage limit
  if (invite.used_count >= invite.max_uses) {
    return { user: null, error: 'Invite code has been fully used' };
  }

  // 4. Create Supabase auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error || !data.user) {
    return { user: null, error: error?.message || 'Signup failed' };
  }

  // 5. Update invite code usage
  await supabase
    .from('invite_codes')
    .update({
      used_count: invite.used_count + 1,
      is_active: (invite.used_count + 1) < invite.max_uses
    })
    .eq('id', invite.id);

  // 6. Update user profile with invite info (trigger creates user row)
  await supabase
    .from('users')
    .update({
      invite_code: inviteCode,
      invited_by: invite.created_by,
      invite_expires_at: invite.expires_at
    })
    .eq('id', data.user.id);

  return { user: await getCurrentUser(), error: null };
}
```

**3. Database trigger creates user profile**

```sql
CREATE FUNCTION public.handle_new_user()
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

### Sign In Flow

**1. User enters email and password**

```typescript
const handleSignIn = async (e: FormEvent) => {
  e.preventDefault();

  const { user, error } = await signIn(email, password);

  if (error) {
    setError(error);
    return;
  }

  router.push('/finance');
};
```

**2. Authenticate with Supabase**

Function: `lib/supabase.ts:signIn()`

```typescript
export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  // 1. Authenticate
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  // 2. Update last login time
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  // 3. Get full user profile
  const user = await getCurrentUser();

  return { user, error: null };
}
```

**3. JWT token stored in browser**

Supabase automatically stores JWT in browser storage (httpOnly cookie or localStorage).

### AuthContext Provider

**Global authentication state management:**

File: `contexts/AuthContext.tsx`

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Usage in components:**

```typescript
function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome, {user.full_name}!</div>;
}
```

### Protected Routes

**Option 1: useRequireAuth Hook**

```typescript
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/finance/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}

// Usage
function AccountsPage() {
  const { user, loading } = useRequireAuth();

  if (loading) return <LoadingSpinner />;

  return <div>Accounts for {user.full_name}</div>;
}
```

**Option 2: ProtectedRoute Component**

```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/finance/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

// Usage
function AccountsPage() {
  return (
    <ProtectedRoute>
      <AccountsList />
    </ProtectedRoute>
  );
}
```

## Admin Authentication

### Architecture

**Admin auth is completely separate from user auth:**

```
Admin → Custom Auth → Session Token → Manual Authorization
```

### Sign In Flow (with 2FA)

**Step 1: Email/Password Authentication**

Endpoint: `POST /api/admin/auth/login`

```typescript
export async function POST(request: Request) {
  const { email, password } = await request.json();

  const { requiresTOTP, userId, error } = await authenticateAdmin(
    email,
    password
  );

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  if (requiresTOTP) {
    // Return userId for 2FA step
    return NextResponse.json({ requiresTOTP: true, userId });
  }

  // No 2FA - create session immediately
  const { session, user, error: sessionError } = await createAdminSession(userId);

  if (sessionError) {
    return NextResponse.json({ error: sessionError }, { status: 500 });
  }

  return NextResponse.json({ session, user });
}
```

**Step 2: Verify TOTP Code**

Endpoint: `POST /api/admin/auth/verify-totp`

```typescript
export async function POST(request: Request) {
  const { userId, code } = await request.json();

  // Verify TOTP code
  const { valid, error } = await verifyAdminTOTP(userId, code);

  if (!valid) {
    return NextResponse.json({ error }, { status: 401 });
  }

  // Create session
  const { session, user, error: sessionError } = await createAdminSession(userId);

  return NextResponse.json({ session, user });
}
```

### Password Hashing

**bcrypt with cost factor 12:**

```typescript
import bcrypt from 'bcryptjs';

// Hash password
const passwordHash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(password, storedHash);
```

### TOTP 2FA Setup

**Step 1: Generate TOTP Secret**

Function: `lib/admin-auth.ts:setupAdminTOTP()`

```typescript
export async function setupAdminTOTP(userId: string) {
  // Generate secret
  const secret = authenticator.generateSecret();

  // Get user email
  const { data: user } = await supabase
    .from('admin_users')
    .select('email')
    .eq('id', userId)
    .single();

  // Generate QR code URL
  const otpauthUrl = authenticator.keyuri(
    user.email,
    'OneLedger Admin',
    secret
  );

  // Encrypt and save secret
  const encryptedSecret = encrypt(secret);

  await supabase
    .from('admin_users')
    .update({
      totp_secret: encryptedSecret,
      totp_enabled: true,
      totp_verified: false,
    })
    .eq('id', userId);

  return { secret, qrCodeUrl: otpauthUrl, error: null };
}
```

**Step 2: User Scans QR Code**

User scans QR code with Google Authenticator or Authy.

**Step 3: Verify Setup with Code**

```typescript
export async function verifyTOTPSetup(userId: string, code: string) {
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('totp_secret')
    .eq('id', userId)
    .single();

  const secret = decrypt(adminUser.totp_secret);

  // Verify code (allow 2-step window for clock skew)
  const isValid = authenticator.verify({
    token: code,
    secret,
    window: 2,
  });

  if (!isValid) {
    return { success: false, error: 'Invalid code' };
  }

  // Mark as verified
  await supabase
    .from('admin_users')
    .update({ totp_verified: true })
    .eq('id', userId);

  return { success: true, error: null };
}
```

### Session Management

**Admin sessions expire after 8 hours:**

```typescript
export async function createAdminSession(userId: string) {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // Session expires in 8 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  // Store session
  const { data: session } = await supabase
    .from('admin_sessions')
    .insert({
      admin_user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  return { session, user: await getAdminUser(userId), error: null };
}
```

**Verify session on each request:**

```typescript
export async function verifyAdminSession(token: string) {
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .single();

  if (!session) {
    return { user: null, error: 'Invalid session' };
  }

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Delete expired session
    await supabase.from('admin_sessions').delete().eq('id', session.id);
    return { user: null, error: 'Session expired' };
  }

  // Get user
  const user = await getAdminUser(session.admin_user_id);

  return { user, error: null };
}
```

### Account Lockout

**Lock account after 5 failed login attempts:**

```typescript
export async function authenticateAdmin(email: string, password: string) {
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single();

  // Check if locked
  if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
    return {
      requiresTOTP: false,
      error: 'Account is temporarily locked. Try again later.',
    };
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);

  if (!passwordMatch) {
    // Increment failed attempts
    const newFailedAttempts = (adminUser.failed_login_attempts || 0) + 1;

    const updates: any = { failed_login_attempts: newFailedAttempts };

    // Lock after 5 attempts for 15 minutes
    if (newFailedAttempts >= 5) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updates.locked_until = lockUntil.toISOString();
    }

    await supabase.from('admin_users').update(updates).eq('id', adminUser.id);

    return { requiresTOTP: false, error: 'Invalid email or password' };
  }

  // Reset failed attempts on success
  await supabase
    .from('admin_users')
    .update({ failed_login_attempts: 0, locked_until: null })
    .eq('id', adminUser.id);

  return { requiresTOTP: adminUser.totp_enabled, userId: adminUser.id, error: null };
}
```

## API Authentication

### User API Endpoints

**Verify JWT token from Supabase:**

```typescript
export async function POST(request: Request) {
  // Get Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);

  // Verify with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // User is authenticated
  // Proceed with request...
}
```

### Admin API Endpoints

**Verify session token:**

```typescript
export async function POST(request: Request) {
  // Get session token from cookie or header
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify session
  const { user, error } = await verifyAdminSession(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Admin is authenticated
  // Proceed with request...
}
```

---

**Next Steps:**
- Review [Database Schema](./database) for RLS policies
- Check [API Reference](../api/overview) for auth endpoints
- Read [Security](../guides/security) for security best practices
