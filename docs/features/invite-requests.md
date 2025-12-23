# Invite Request System

The invite request system allows prospective users to request access to OneLibro's private beta. Admins can review requests and send invite codes directly from the admin dashboard.

## Overview

OneLibro uses an **invite-only access model** for controlled onboarding during the private beta phase. The invite request system provides a self-service way for users to request access without requiring manual outreach.

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Invite Request User Journey                    │
└─────────────────────────────────────────────────────────────┘

1. User visits finance.yatheeshnagella.com/login
   │
   ├─> Clicks "Request Invite Code"
   │
2. Modal opens with request form
   │
   ├─> Enter: Email + Full Name
   ├─> Submit request
   │
3. Request stored in database
   │
   ├─> Status: "pending"
   ├─> Rate limit: 1 request per 24 hours per email
   │
4. Confirmation email sent
   │
   ├─> Template: invite_request_confirmation
   ├─> Message: "We'll review your request shortly"
   │
5. Admin reviews request
   │
   ├─> admin.yatheeshnagella.com/invite-requests
   ├─> Admin clicks "Send Invite"
   │
6. Invite code generated and emailed
   │
   ├─> Request status: "approved"
   ├─> User receives invite code email
   │
7. User signs up with invite code
   │
   └─> Request status: "used"
```

## Database Schema

### invite_code_requests Table

```sql
CREATE TABLE invite_code_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'used'
  notes TEXT,                              -- Admin notes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id),
  invite_code_id UUID REFERENCES invite_codes(id)
);

-- Indexes
CREATE INDEX idx_invite_requests_email ON invite_code_requests(email);
CREATE INDEX idx_invite_requests_status ON invite_code_requests(status);
CREATE INDEX idx_invite_requests_created ON invite_code_requests(created_at DESC);
```

### Request Statuses

| Status | Description | Next Action |
|--------|-------------|-------------|
| `pending` | Request submitted, awaiting review | Admin reviews |
| `approved` | Admin sent invite code | User signs up |
| `rejected` | Admin declined request | None |
| `used` | User signed up successfully | None |

## User Interface

### Request Modal Component

Location: `components/finance/RequestInviteModal.tsx`

```tsx
<RequestInviteModal isOpen={showModal} onClose={() => setShowModal(false)} />
```

**Features:**
- Email validation (format check)
- Name validation (required, trimmed)
- Rate limiting (1 request per 24 hours)
- Success state with auto-close
- Error handling with user-friendly messages
- Loading state during submission

**UX Flow:**
1. User clicks "Request Invite Code" button on login page
2. Modal slides in from center
3. User enters email and name
4. Click "Request Invite Code" button
5. Loading spinner appears
6. Success: Green checkmark + "Request Submitted!" message
7. Auto-close after 3 seconds
8. Confirmation email sent

## API Endpoints

### POST /api/invite-requests/create

Submit a new invite request.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Validation:**
- Email must be valid format
- Name must be non-empty
- Same email can only request once per 24 hours

**Response (Success):**
```json
{
  "success": true,
  "message": "Request submitted successfully"
}
```

**Response (Rate Limited):**
```json
{
  "error": "You have already submitted a request recently. Please wait 24 hours."
}
```
Status: `429 Too Many Requests`

**Response (Invalid Email):**
```json
{
  "error": "Invalid email format"
}
```
Status: `400 Bad Request`

### GET /api/admin/invite-requests/list

Retrieve all invite requests (admin only).

**Response:**
```json
{
  "requests": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "status": "pending",
      "created_at": "2025-01-23T10:00:00Z",
      "notes": null
    }
  ]
}
```

**Sorting:** Descending by `created_at` (newest first)

## Admin Dashboard

### Viewing Invite Requests

Navigate to: `admin.yatheeshnagella.com/invite-requests`

**Features:**
- **Search**: Filter by email or name
- **Status Filter**: View by pending, approved, rejected, used
- **Sorting**: By date, email, name
- **Bulk Actions**: Approve/reject multiple requests
- **Notes**: Add internal notes to requests

**Table Columns:**
- Email
- Name
- Status (badge with color coding)
- Requested Date
- Actions (Send Invite, Reject, Add Notes)

### Approving Requests

1. Click "Send Invite" button next to request
2. Redirects to `/admin/invites/create` with email pre-filled
3. Admin can customize invite code settings:
   - Max uses
   - Expiration date
   - Custom message
4. Click "Create & Send Invite Code"
5. Invite code created and emailed
6. Request status updated to "approved"
7. `invite_code_id` linked to request

### Rejecting Requests

1. Click "Reject" button
2. Optional: Add rejection reason in notes
3. Request status updated to "rejected"
4. User is NOT notified (privacy consideration)
5. User can submit new request after 24 hours

## Email Templates

### Invite Request Confirmation

**Template**: `emails/templates/InviteRequestConfirmationEmail.tsx`

**Sent To**: User who submitted request
**Sent When**: Immediately after request submission
**Subject**: "Thank you for requesting access to OneLibro"

**Content:**
```
Hi [Name],

Thank you for your interest in OneLibro!

We've received your request for an invite code. We'll review
your request and send you an invite code shortly.

In the meantime, learn more about OneLibro at our website.

Questions? Reply to this email and we'll be happy to help!

Best,
The OneLibro Team
```

### Invite Code Email (After Approval)

**Template**: `emails/templates/InviteCodeEmail.tsx`

**Sent To**: User whose request was approved
**Sent When**: Admin approves request and creates invite code
**Subject**: "Your OneLibro Invite Code is Ready!"

**Content:**
```
Hi [Name],

Great news! Your request for access to OneLibro has been approved.

Your Invite Code: XXXXX-XXXXX-XXXXX

This code expires in 7 days and can be used 1 time.

Get Started:
1. Visit finance.yatheeshnagella.com
2. Click "Sign Up"
3. Enter your invite code
4. Create your account

We're excited to have you join us!

Best,
The OneLibro Team
```

## Rate Limiting

### Why Rate Limit?

- Prevent spam submissions
- Reduce duplicate requests
- Maintain data quality
- Protect against bots

### Implementation

**Check**: 24-hour window based on `created_at` timestamp

```sql
-- Query in /api/invite-requests/create
SELECT id, created_at
FROM invite_code_requests
WHERE email = $1
AND created_at >= NOW() - INTERVAL '24 hours'
LIMIT 1;
```

**Behavior:**
- If existing request found within 24 hours: Return 429 error
- If no request or older than 24 hours: Allow new request

### User Communication

Error message clearly explains:
> "You have already submitted a request recently. Please wait 24 hours."

## Analytics

### Request Metrics

Track key metrics in admin dashboard:

```sql
-- Total requests
SELECT COUNT(*) FROM invite_code_requests;

-- Requests by status
SELECT status, COUNT(*) as count
FROM invite_code_requests
GROUP BY status;

-- Approval rate
SELECT
  COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*) as approval_rate
FROM invite_code_requests;

-- Average response time (pending → approved)
SELECT AVG(approved_at - created_at) as avg_response_time
FROM invite_code_requests
WHERE status = 'approved';

-- Recent requests (last 7 days)
SELECT DATE(created_at) as date, COUNT(*) as requests
FROM invite_code_requests
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Security Considerations

### Email Validation

Frontend validation:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  setError('Invalid email format');
  return;
}
```

Backend validation (same regex):
```typescript
if (!emailRegex.test(email)) {
  return NextResponse.json(
    { error: 'Invalid email format' },
    { status: 400 }
  );
}
```

### Input Sanitization

- Email: Lowercased and trimmed
- Name: Trimmed (whitespace removed)
- Notes: Sanitized to prevent XSS

```typescript
email: email.toLowerCase().trim(),
name: name.trim(),
```

### Rate Limiting

Prevents spam by limiting to 1 request per email per 24 hours.

### RLS Policies

```sql
-- Public can INSERT (submit requests)
CREATE POLICY "Allow public insert" ON invite_code_requests
FOR INSERT WITH CHECK (true);

-- Only admins can SELECT/UPDATE/DELETE
CREATE POLICY "Admins can view all" ON invite_code_requests
FOR SELECT USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can update" ON invite_code_requests
FOR UPDATE USING (auth.uid() IN (SELECT id FROM admin_users));
```

## User Experience Improvements

### Clear Call-to-Action

Login page prominently displays "Request Invite Code" button:
- Position: Below login form
- Style: Secondary button (not competing with "Log In")
- Text: Clear and action-oriented

### Immediate Feedback

- **Success State**: Green checkmark icon + confirmation message
- **Error State**: Red error banner with helpful message
- **Loading State**: Spinner + "Submitting..." text
- **Auto-Close**: Success modal closes after 3 seconds

### Transparent Communication

Confirmation email sets expectations:
- "We'll review your request shortly"
- "We'll send you an invite code"
- Includes support contact

## Troubleshooting

### User Not Receiving Confirmation Email

1. Check spam/junk folder
2. Verify email in `email_logs` table:
   ```sql
   SELECT * FROM email_logs
   WHERE template_key = 'invite_request_confirmation'
   AND email_to = 'user@example.com'
   ORDER BY sent_at DESC;
   ```
3. Check Resend dashboard for delivery status
4. Verify email address is valid

### Request Stuck in Pending

**Possible causes:**
- Admin hasn't reviewed yet
- Backlog of requests
- Request doesn't meet criteria

**Admin action:**
- Review request in `/admin/invite-requests`
- Approve or reject with notes
- Set up automated approval for certain domains (future)

### Duplicate Requests Allowed

**If rate limiting isn't working:**
1. Check database query logic in `/api/invite-requests/create`
2. Verify 24-hour interval calculation
3. Ensure email is lowercased for comparison
4. Check for database timezone issues

## Future Enhancements

- [ ] **Auto-Approval**: Automatically approve requests from whitelisted domains
- [ ] **Waitlist**: Queue system for high demand periods
- [ ] **Rejection Emails**: Optionally notify rejected users
- [ ] **Request Expiration**: Auto-expire old pending requests
- [ ] **Admin Notifications**: Email admins when new requests arrive
- [ ] **Request Analytics**: Dashboard with conversion funnel
- [ ] **Custom Fields**: Capture additional info (company, use case)
- [ ] **Referral Tracking**: Track how users heard about OneLibro
- [ ] **Priority Queue**: VIP/expedited review for certain users
- [ ] **Bulk Import**: Import requests from CSV

## Related Documentation

- [Invite Code System](../architecture/authentication.md#invite-code-system)
- [Email System](./email-system.md)
- [Admin Dashboard](./admin-dashboard.md)
- [User Authentication](../architecture/authentication.md)
