# Admin Dashboard

The OneLibro Admin Dashboard provides comprehensive tools for managing users, invite codes, system monitoring, and email campaigns. Access it at `admin.yatheeshnagella.com`.

## Overview

The admin dashboard is a separate application from the finance app, with its own authentication system, custom TOTP 2FA, and specialized tools for system administration.

**Key Capabilities:**
- User management and monitoring
- Invite code creation and tracking
- Invite request review and approval
- Email template management and test sending
- Email campaign creation and scheduling
- System audit logs and activity monitoring
- Admin user management (super admin only)

## Access & Authentication

### URL

**Production**: `https://admin.yatheeshnagella.com`
**Local Dev**: `http://admin.localhost:3000`

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Admin Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Admin visits admin.yatheeshnagella.com
   │
2. Redirected to /admin/login
   │
   ├─> Enter: Email + Password
   ├─> Submit credentials
   │
3. Backend validates credentials
   │
   ├─> Check password hash (bcrypt)
   ├─> Verify admin exists and is active
   │
4. TOTP 2FA Challenge
   │
   ├─> Enter 6-digit code from authenticator app
   ├─> Verify TOTP with secret
   │
5. Session Created
   │
   ├─> Generate session token
   ├─> Store in admin_sessions table
   ├─> Set httpOnly cookie
   │
6. Redirected to /admin (dashboard)
```

### Setup TOTP (First Login)

If admin doesn't have TOTP configured:

1. Login with email/password
2. Redirected to `/admin/setup-totp`
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter verification code
5. TOTP secret saved to `admin_users` table
6. Redirected to dashboard

## Database Schema

### admin_users Table

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,        -- bcrypt hash
  is_super_admin BOOLEAN DEFAULT false,
  totp_secret TEXT,                   -- TOTP secret (encrypted)
  totp_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### admin_sessions Table

```sql
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-cleanup expired sessions
CREATE INDEX idx_sessions_expires ON admin_sessions(expires_at);
```

### admin_audit_logs Table

Tracks all admin actions for security and compliance.

```sql
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,              -- 'create_invite', 'delete_user', etc.
  resource_type TEXT,                -- 'invite_code', 'user', 'email_campaign'
  resource_id UUID,
  details JSONB,                     -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for querying logs
CREATE INDEX idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_action ON admin_audit_logs(action);
CREATE INDEX idx_audit_created ON admin_audit_logs(created_at DESC);
```

## Dashboard Sections

### 1. Dashboard Home (`/admin`)

**Metrics Overview:**
- Total users
- Active users (logged in last 30 days)
- Pending invite requests
- Total invite codes (used/unused)
- Email delivery stats (last 7 days)

**Recent Activity:**
- Latest user signups
- Recent invite requests
- Failed email deliveries
- Recent audit log entries

### 2. User Management (`/admin/users`)

**Features:**
- View all users with pagination
- Search by email or name
- Filter by status (active, inactive, deleted)
- Sort by signup date, last login, name
- View user details (accounts, transactions, budgets)
- Delete users (soft delete with confirmation)

**User Details:**
- Profile information
- Connected bank accounts (via Plaid)
- Transaction count and volume
- Budget usage
- Email preferences
- Last login timestamp
- Account created date

**Actions:**
- View user dashboard (impersonate - super admin only)
- Send password reset email
- Deactivate/reactivate account
- Delete user (with cascade to related data)

### 3. Invite Codes (`/admin/invites`)

**List View:**
- All invite codes with status
- Filter: Active, Used, Expired
- Search by code or email
- Sort by creation date, expiration, uses

**Code Details:**
- Invite code value
- Created by (admin)
- Created for (email)
- Max uses / Current uses
- Expiration date
- Status (active, expired, depleted)
- Users who signed up with this code

**Create Invite Code** (`/admin/invites/create`):

Form fields:
- Email (optional - for specific user)
- Max uses (1-100)
- Expiration days (1-365)
- Send email immediately (checkbox)
- Custom message (optional)

Click "Create & Send Invite Code" to:
1. Generate unique code
2. Insert into `invite_codes` table
3. Optionally email to recipient
4. Log action in audit logs

### 4. Invite Requests (`/admin/invite-requests`)

**List View:**
- All invite requests
- Status badges (pending, approved, rejected, used)
- Search by email or name
- Filter by status
- Sort by request date

**Actions:**
- **Send Invite**: Redirects to create invite with email pre-filled
- **Reject**: Mark as rejected (add notes)
- **Add Notes**: Internal notes for tracking
- **View Details**: Full request info

**Bulk Actions:**
- Select multiple requests
- Bulk approve (create invites for all)
- Bulk reject

### 5. Email Templates (`/admin/emails/templates`)

**Template List:**
- All email templates from `email_templates` table
- Status (active/inactive)
- Last used date
- Total sent count

**Template Details** (`/admin/emails/templates/[id]`):
- Template key (e.g., `welcome_email`)
- Template name
- Subject template
- Preview (rendered with sample data)
- Edit subject line
- Toggle active/inactive
- **Send Test Email**: Send to any email for testing

### 6. Email Logs (`/admin/emails/logs`)

**Log View:**
- All sent emails from `email_logs` table
- Filter by status (sent, failed, bounced)
- Filter by template
- Filter by date range
- Search by recipient email

**Log Details:**
- Recipient email
- Template used
- Subject line
- Status (sent/failed)
- Error message (if failed)
- Resend message ID
- Sent timestamp

**Actions:**
- View full email content
- Resend email
- Link to Resend dashboard

### 7. Email Campaigns (`/admin/emails/campaigns`)

**Campaign Management:**
- Create email campaigns for marketing
- Schedule send time
- Select recipient segments
- Track open/click rates
- A/B test subject lines (future)

**Create Campaign** (`/admin/emails/campaigns/create`):

Form fields:
- Campaign name
- Subject line
- Email template
- Recipient filter (all users, active users, specific segment)
- Schedule (immediate or future date)
- Test mode (send to admin email first)

### 8. Audit Logs (`/admin/logs`)

**Activity Monitoring:**
- All admin actions logged
- Filter by admin user
- Filter by action type
- Filter by date range
- Search by resource ID

**Logged Actions:**
- User creation/deletion
- Invite code creation
- Invite request approval/rejection
- Email campaign creation/sending
- Settings changes
- Admin user changes (super admin only)

**Log Entry Details:**
- Admin who performed action
- Action type
- Resource affected (user, invite, etc.)
- Timestamp
- IP address
- User agent
- Additional details (JSON)

### 9. Settings (`/admin/settings`)

**System Settings:**
- Email from address
- Email reply-to address
- Invite code defaults (max uses, expiration)
- Session timeout duration
- Audit log retention period

**Admin Profile:**
- Change password
- Update email
- Re-configure TOTP
- View login history

### 10. Admin Users (`/admin/users`) - Super Admin Only

**Admin Management:**
- View all admin users
- Create new admin users
- Promote/demote super admin status
- Deactivate admin accounts
- View admin activity logs

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/auth/login` | Login with email/password |
| POST | `/api/admin/auth/verify-totp` | Verify TOTP code |
| POST | `/api/admin/auth/setup-totp` | Generate TOTP secret |
| POST | `/api/admin/auth/verify-totp-setup` | Confirm TOTP setup |
| GET | `/api/admin/auth/verify-session` | Verify active session |
| POST | `/api/admin/auth/logout` | Destroy session |

### User Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/get-users` | List all users |
| GET | `/api/admin/users/[id]` | Get user details |
| DELETE | `/api/admin/users/[id]` | Delete user |
| PUT | `/api/admin/users/[id]` | Update user |

### Invite Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/invites/create` | Create invite code |
| GET | `/api/admin/invites/[id]` | Get invite details |
| PUT | `/api/admin/invites/[id]` | Update invite code |
| DELETE | `/api/admin/invites/[id]` | Deactivate invite |

### Invite Requests

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/invite-requests/list` | List all requests |
| PUT | `/api/admin/invite-requests/[id]` | Update request status |

### Email Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/admin/emails/send-test` | Send test email |
| GET | `/api/admin/campaigns` | List email campaigns |
| POST | `/api/admin/campaigns` | Create campaign |
| POST | `/api/admin/campaigns/[id]/send` | Send campaign |

## Security Features

### 1. TOTP 2FA

All admin users must enable TOTP for login.

**Setup:**
- QR code generation with `qrcode` package
- TOTP secret generation with `otpauth-url`
- Verification with `otplib`

**Login Flow:**
1. Password check (bcrypt)
2. TOTP code verification (6-digit)
3. Session token generation (secure random)

### 2. Session Management

**Session Security:**
- HttpOnly cookies (XSS protection)
- Secure flag (HTTPS only)
- SameSite strict (CSRF protection)
- 24-hour expiration
- Server-side session validation

**Middleware:**
```typescript
// contexts/AdminAuthContext.tsx
export function useRequireAdminAuth() {
  // Verify session on every request
  // Redirect to login if invalid
}
```

### 3. Audit Logging

Every admin action is logged:

```typescript
await logAdminAction({
  adminId: admin.id,
  action: 'create_invite',
  resourceType: 'invite_code',
  resourceId: inviteCode.id,
  details: { email, maxUses, expiresAt },
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
});
```

### 4. Role-Based Access

**Regular Admin:**
- View users
- Create invite codes
- Review invite requests
- Send emails
- View logs

**Super Admin** (all above plus):
- Delete users
- Manage admin users
- Change system settings
- Access all audit logs

Check in API routes:

```typescript
const { admin } = await verifyAdminSession(request);

if (!admin.is_super_admin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Admin Workflows

### Workflow 1: Approve Invite Request

1. Navigate to `/admin/invite-requests`
2. Review pending requests
3. Click "Send Invite" on desired request
4. Redirected to `/admin/invites/create` with email pre-filled
5. Customize invite code settings (max uses, expiration)
6. Click "Create & Send Invite Code"
7. Invite code created and emailed to user
8. Request status updated to "approved"
9. Admin action logged

### Workflow 2: Manage Problematic User

1. Navigate to `/admin/users`
2. Search for user by email
3. Click on user to view details
4. Review activity (transactions, budgets, logins)
5. Actions:
   - Send password reset (if locked out)
   - Deactivate account (if abuse detected)
   - Delete account (if requested or GDPR compliance)
6. Confirm action with modal
7. User notified via email (if appropriate)
8. Action logged in audit logs

### Workflow 3: Send Email Campaign

1. Navigate to `/admin/emails/campaigns/create`
2. Enter campaign details:
   - Name: "Spring Budget Tips"
   - Subject: "5 Ways to Save Money This Spring"
   - Template: Marketing email template
   - Recipients: Active users (last 30 days)
3. Click "Send Test" to preview
4. Review test email
5. Schedule campaign (immediate or future)
6. Confirm send
7. Campaign processing begins
8. Monitor in `/admin/emails/logs`

## Monitoring & Analytics

### Dashboard Metrics

Key metrics displayed on admin home:

```typescript
// app/admin/page.tsx
const metrics = {
  totalUsers: await countUsers(),
  activeUsers: await countActiveUsers(30), // Last 30 days
  pendingInviteRequests: await countPendingRequests(),
  totalInviteCodes: await countInviteCodes(),
  usedInviteCodes: await countUsedInviteCodes(),
  emailsSentLast7Days: await countEmailsSent(7),
  failedEmails: await countFailedEmails(7),
};
```

### Audit Log Analytics

```sql
-- Most active admins
SELECT
  au.email,
  COUNT(*) as action_count,
  MAX(aal.created_at) as last_activity
FROM admin_audit_logs aal
JOIN admin_users au ON aal.admin_id = au.id
WHERE aal.created_at >= NOW() - INTERVAL '30 days'
GROUP BY au.id, au.email
ORDER BY action_count DESC;

-- Actions by type
SELECT
  action,
  COUNT(*) as count
FROM admin_audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY action
ORDER BY count DESC;
```

## Troubleshooting

### Can't Login to Admin Dashboard

**Possible causes:**
1. Wrong email/password
2. TOTP code incorrect or expired
3. Session expired
4. Admin account deactivated

**Solutions:**
- Verify credentials in `admin_users` table
- Re-sync authenticator app time
- Clear cookies and try again
- Contact super admin to reactivate

### TOTP Not Working

**Common issues:**
- Clock skew between server and authenticator app
- Wrong secret configured
- Code expired (30-second window)

**Fix:**
```sql
-- Reset TOTP for admin
UPDATE admin_users
SET totp_secret = NULL, totp_enabled = false
WHERE email = 'admin@example.com';
```

Admin must re-setup TOTP on next login.

### Audit Logs Not Recording

**Check:**
1. Verify `logAdminAction()` is called in API routes
2. Check database permissions
3. Review error logs for INSERT failures

## Best Practices

### 1. Regular Audit Reviews

Review audit logs weekly:
- Identify unusual patterns
- Monitor admin activity
- Detect potential security issues

### 2. Invite Request SLA

Respond to invite requests within 48 hours:
- Set up daily reminders
- Prioritize pending requests
- Communicate delays to users

### 3. Email Template Testing

Always send test emails before campaigns:
- Check rendering in multiple clients
- Verify all links work
- Proofread content

### 4. User Data Protection

When viewing user data:
- Access only what's necessary
- Don't share user information externally
- Log all user data access

## Future Enhancements

- [ ] **Analytics Dashboard**: Charts and graphs for key metrics
- [ ] **Automated Invite Approvals**: Auto-approve trusted domains
- [ ] **Admin Roles**: Granular permissions beyond super admin
- [ ] **Activity Alerts**: Notify super admins of suspicious activity
- [ ] **Data Export**: Export user data, logs, metrics to CSV
- [ ] **Batch Operations**: Bulk user actions (deactivate, email, etc.)
- [ ] **API Keys**: Allow programmatic admin access
- [ ] **Webhooks**: Trigger external systems on events
- [ ] **Mobile App**: Admin dashboard on iOS/Android

## Related Documentation

- [Authentication System](../architecture/authentication.md)
- [Email System](./email-system.md)
- [Invite Request System](./invite-requests.md)
- [Security Best Practices](../guides/security.md)
