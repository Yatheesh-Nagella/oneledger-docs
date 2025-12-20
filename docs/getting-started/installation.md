# Getting Started with OneLibro

This guide will help you set up OneLibro locally for development.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 20+ (LTS recommended)
- **npm** or **yarn** package manager
- **Git** for version control
- **Supabase Account** (free tier works)
- **Plaid Account** (sandbox is free)
- **Code Editor** (VS Code recommended)

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/Yatheesh-Nagella/yatheesh-portfolio.git
cd yatheesh-portfolio
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Fill in the following required variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Plaid Configuration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-sandbox-secret
PLAID_ENV=sandbox

# Security
ENCRYPTION_KEY=your-64-character-hex-key
```

**Generate encryption key:**
```bash
# On Linux/Mac
openssl rand -hex 32

# On Windows (PowerShell)
-join ((48..57) + (97..102) | Get-Random -Count 64 | % {[char]$_})
```

### 4. Set Up Supabase Database

#### Option A: Using Supabase Dashboard
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the migration files from `supabase/migrations/` in order

#### Option B: Using Supabase CLI
```bash
npx supabase db push
```

### 5. Run Development Server

```bash
npm run dev
```

Visit:
- **Main Portfolio**: http://localhost:3000
- **Finance App**: http://finance.localhost:3000
- **Admin Dashboard**: http://admin.localhost:3000

## Detailed Setup

### Supabase Setup

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Set a strong database password (save it!)
5. Wait for project to initialize (~2 minutes)

#### 2. Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

#### 3. Run Database Migrations

Go to **SQL Editor** and run each migration file:

```sql
-- File: supabase/migrations/001_initial_schema.sql
-- Copy and paste the contents, then click "Run"
```

Migrations to run in order:
1. `001_initial_schema.sql` - Core tables
2. `002_rls_policies.sql` - Row Level Security
3. `003_admin_tables.sql` - Admin system
4. `004_functions.sql` - Database functions
5. `005_triggers.sql` - Automated triggers

#### 4. Verify Database Setup

Run this query to check tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see:
- users
- invite_codes
- plaid_items
- accounts
- transactions
- budgets
- admin_users
- admin_sessions
- admin_audit_logs

### Plaid Setup

![Bank-connection](/img/diagrams/Bank-connection.png)

#### 1. Create Plaid Account

1. Go to [plaid.com](https://plaid.com/)
2. Sign up for free Development account
3. Verify email
4. Complete onboarding

#### 2. Get API Credentials

1. Go to **Dashboard** → **Team Settings** → **Keys**
2. Copy:
   - **Client ID** → `PLAID_CLIENT_ID`
   - **Sandbox secret** → `PLAID_SECRET`
3. Set `PLAID_ENV=sandbox`

#### 3. Configure Allowed Redirect URIs

In Plaid Dashboard → **API**:
- Add: `http://localhost:3000`
- Add: `http://finance.localhost:3000`
- Add: `https://finance.yourdomain.com` (for production)

#### 4. Test Plaid Sandbox

Sandbox test credentials:
- **Username**: `user_good`
- **Password**: `pass_good`
- **MFA**: `1234` (if prompted)

<!-- See Plaid Sandbox Guide (coming soon) for more testing scenarios. -->

### Environment Variables Explained

#### Required Variables

```env
# Supabase - Database and Authentication
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...  # Public key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...      # Admin key (server-side only!)

# Plaid - Banking Integration
PLAID_CLIENT_ID=abc123...                # Your Plaid client ID
PLAID_SECRET=xxx...                      # Sandbox/Development/Production secret
PLAID_ENV=sandbox                        # sandbox | development | production

# Security - Encryption
ENCRYPTION_KEY=64-character-hex-string   # For encrypting Plaid access tokens
```

#### Optional Variables

```env
# Plaid Sandbox Testing (optional)
PLAID_USER_NAME=user_good               # Sandbox username
PLAID_PWD=pass_good                     # Sandbox password

# Google Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXX
```

### First-Time Setup Tasks

#### 1. Create Admin User

After starting the app, create the first admin user:

```bash
# Navigate to admin setup
http://admin.localhost:3000/admin/setup
```

Or use API directly:

```bash
curl -X POST http://localhost:3000/api/admin/auth/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-strong-password",
    "fullName": "Admin User"
  }'
```

⚠️ **Important**: This endpoint only works if no admin users exist!

#### 2. Set Up Admin 2FA (Recommended)

1. Log in to admin dashboard
2. Go to **Settings** → **Security**
3. Click "Enable Two-Factor Authentication"
4. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
5. Enter verification code
6. Save backup codes in a secure location

#### 3. Create Invite Codes

To allow users to sign up:

1. Log in to admin dashboard
2. Go to **Invites** → **Create**
3. Set:
   - Expiration date
   - Max uses (e.g., 1 for single-use, 100 for multi-use)
4. Copy the generated code
5. Share with users

#### 4. Test User Signup

1. Go to `http://finance.localhost:3000/finance/login`
2. Click "Sign Up"
3. Enter email, password, name, and invite code
4. Verify account creation in admin dashboard

#### 5. Connect Test Bank Account

1. Log in as test user
2. Click "Connect Bank Account"
3. Search for "Plaid Sandbox"
4. Use credentials: `user_good` / `pass_good`
5. Select accounts to link
6. Verify accounts appear in dashboard

## Development Workflow

### Running the App

```bash
# Development server with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Testing Subdomains Locally

The app uses subdomain routing. To test locally:

1. **Use `.localhost` domains** (works natively):
   - `http://localhost:3000` - Main portfolio
   - `http://finance.localhost:3000` - Finance app
   - `http://admin.localhost:3000` - Admin dashboard

2. **Or edit hosts file** (alternative):
   ```
   # Windows: C:\Windows\System32\drivers\etc\hosts
   # Mac/Linux: /etc/hosts

   127.0.0.1 finance.localhost
   127.0.0.1 admin.localhost
   ```

### Common Development Commands

```bash
# Install new dependency
npm install package-name

# Install dev dependency
npm install -D package-name

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Project Structure Navigation

```
app/
├── finance/          # Finance app pages
│   ├── page.tsx     # Dashboard
│   ├── accounts/    # Account management
│   ├── transactions/# Transaction history
│   └── budgets/     # Budget management
├── admin/           # Admin dashboard
│   ├── page.tsx     # Admin home
│   ├── users/       # User management
│   └── invites/     # Invite management
└── api/             # API routes
    ├── plaid/       # Plaid integration
    ├── admin/       # Admin APIs
    └── transactions/# Transaction APIs
```

## Troubleshooting

### "Module not found" errors

```bash
# Clear Next.js cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

### "Invalid environment variable" errors

- Check `.env` file exists
- Verify all required variables are set
- Ensure no extra spaces in values
- Restart dev server after changes

### Supabase connection fails

- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon key (not service role)
- Ensure Supabase project is active (not paused)

### Plaid Link doesn't open

- Check `PLAID_CLIENT_ID` and `PLAID_SECRET` are correct
- Verify `PLAID_ENV=sandbox`
- Ensure redirect URIs are configured in Plaid Dashboard
- Check browser console for errors

### Database migrations fail

- Run migrations in correct order
- Check for syntax errors in SQL
- Verify database password is correct
- Ensure you have sufficient permissions

### Build fails with TypeScript errors

```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id your-project-id > types/supabase.ts

# Check types
npm run build
```

## Next Steps

✅ **You're all set!** Here's what to explore next:

1. **Learn the Architecture** - Read [Architecture Overview](../architecture/overview)
2. **Understand Authentication** - See [Authentication](../architecture/authentication)
3. **Explore APIs** - Check [API Reference](../api/overview)
4. **Review Database** - Study [Database Schema](../architecture/database)
5. **Development Workflow** - Follow [Development Guide](../guides/development)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Plaid Documentation](https://plaid.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

**Need help?** Check the [Troubleshooting Guide](../guides/troubleshooting) or open an issue on GitHub.
