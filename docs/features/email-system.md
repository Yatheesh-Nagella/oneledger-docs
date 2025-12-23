# Email System

OneLibro uses [Resend](https://resend.com) for transactional email delivery with React Email templates for beautiful, responsive emails.

## Overview

The email system handles:
- Welcome emails for new users
- Invite code delivery
- Password reset notifications
- Budget alert notifications
- Plaid item error notifications
- Invite request confirmations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Email System Flow                        │
└─────────────────────────────────────────────────────────────┘

Trigger Event (signup, budget exceeded, etc.)
    │
    ├─> lib/email.ts: sendEmail()
    │       │
    │       ├─> Select template from emails/templates/
    │       ├─> Render React component to HTML
    │       ├─> Send via Resend API
    │       └─> Log to email_logs table
    │
    └─> Database: email_logs
            │
            └─> Track: delivery, opens, clicks, bounces
```

## Email Templates

All email templates are located in `emails/templates/` and built with React Email components.

### Available Templates

| Template | File | Trigger | Purpose |
|----------|------|---------|---------|
| Welcome Email | `WelcomeEmail.tsx` | User signup | Welcome new users to OneLibro |
| Invite Code | `InviteCodeEmail.tsx` | Admin sends invite | Deliver invite code to new user |
| Account Created | `AccountCreatedEmail.tsx` | Signup complete | Confirm account creation |
| Password Reset | `PasswordResetEmail.tsx` | Password reset request | Send reset link |
| Budget Alert | `BudgetAlertEmail.tsx` | Budget threshold exceeded | Notify user of overspending |
| Plaid Item Error | `PlaidItemErrorEmail.tsx` | Plaid connection fails | Alert user to reconnect account |
| Invite Request Confirmation | `InviteRequestConfirmationEmail.tsx` | User requests invite | Confirm request received |

### Template Structure

Each template uses shared components from `emails/components/`:

```tsx
import { EmailLayout } from '../components/EmailLayout';
import { Button } from '../components/Button';

export default function WelcomeEmail({ name }: { name: string }) {
  return (
    <EmailLayout>
      <h1>Welcome to OneLibro, {name}!</h1>
      <p>We're excited to have you on board.</p>
      <Button href="https://finance.yatheeshnagella.com/dashboard">
        Go to Dashboard
      </Button>
    </EmailLayout>
  );
}
```

## Sending Emails

### Using the sendEmail Helper

```typescript
import { sendEmail } from '@/lib/email';

// Send a welcome email
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to OneLibro',
  templateKey: 'welcome_email',
  templateProps: { name: 'John Doe' },
  category: 'transactional',
});
```

### sendEmail Options

```typescript
interface SendEmailOptions {
  to: string;                    // Recipient email
  subject: string;               // Email subject
  templateKey: string;           // Template key from email_templates table
  templateProps: Record<string, any>;  // Props to pass to template
  category?: 'transactional' | 'marketing' | 'system';
  replyTo?: string;             // Optional reply-to address
}
```

### Email Categories

- **transactional**: User-triggered emails (signup, password reset)
- **marketing**: Promotional emails and campaigns
- **system**: System notifications (alerts, errors)

## Database Schema

### email_templates Table

Stores email template metadata and configuration.

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,      -- 'welcome_email', 'budget_alert', etc.
  template_name TEXT NOT NULL,            -- Human-readable name
  description TEXT,
  subject_template TEXT NOT NULL,         -- Subject line template
  is_active BOOLEAN DEFAULT true,         -- Can be disabled without deleting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### email_logs Table

Tracks all sent emails for debugging and analytics.

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email_to TEXT NOT NULL,
  template_key TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,                    -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  resend_id TEXT,                          -- Resend API message ID
  category TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

### budget_alert_history Table

Tracks budget alerts to prevent duplicate notifications.

```sql
CREATE TABLE budget_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id),
  user_id UUID REFERENCES users(id),
  alert_type TEXT NOT NULL,                -- 'warning', 'exceeded'
  amount_spent INTEGER NOT NULL,           -- Amount in cents
  budget_limit INTEGER NOT NULL,           -- Limit in cents
  sent_at TIMESTAMPTZ DEFAULT now()
);
```

## Environment Configuration

Required environment variables in `.env`:

```bash
# Resend API key
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Email sender configuration
NEXT_PUBLIC_FROM_EMAIL=noreply@yatheeshnagella.com
NEXT_PUBLIC_REPLY_TO_EMAIL=support@yatheeshnagella.com
```

## Email Workflows

### 1. User Signup Flow

```typescript
// app/api/auth/signup/route.ts
const { user } = await signUpWithInvite(email, password, name, inviteCode);

// Send welcome email (async, doesn't block response)
sendEmail({
  to: email,
  subject: 'Welcome to OneLibro',
  templateKey: 'welcome_email',
  templateProps: { name },
  category: 'transactional',
}).catch(console.error);
```

### 2. Invite Code Delivery

```typescript
// app/api/admin/invites/create/route.ts
const inviteCode = await createInviteCode(email, maxUses);

await sendEmail({
  to: email,
  subject: 'Your OneLibro Invite Code',
  templateKey: 'invite_code_email',
  templateProps: {
    code: inviteCode,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  category: 'transactional',
});
```

### 3. Budget Alerts (Cron Job)

```typescript
// app/api/cron/budget-alerts/route.ts
export async function GET(request: NextRequest) {
  // Runs daily at 9 AM UTC
  const overBudgetUsers = await findUsersOverBudget();

  for (const user of overBudgetUsers) {
    await sendEmail({
      to: user.email,
      subject: 'Budget Alert: You\'ve exceeded your budget',
      templateKey: 'budget_alert_email',
      templateProps: {
        name: user.name,
        budgetName: user.budget.name,
        spent: user.totalSpent,
        limit: user.budget.limit,
      },
      category: 'system',
    });

    // Log alert to prevent duplicates
    await logBudgetAlert(user.budget.id, user.id);
  }
}
```

## Testing Emails

### Development Testing

Use Resend's test mode to preview emails without sending:

```typescript
// Set in .env.local
RESEND_API_KEY=re_test_xxxxxxxxxxxxxxxxxxxx
```

### Preview Templates Locally

Run the email preview server:

```bash
cd emails
npm run dev
```

Visit http://localhost:3000 to preview all email templates with sample data.

### Send Test Email (Admin Dashboard)

Admins can send test emails from the admin dashboard:

1. Navigate to `/admin/emails/templates`
2. Select a template
3. Click "Send Test Email"
4. Enter test recipient email
5. Review delivery in Resend dashboard

## Monitoring & Analytics

### Resend Dashboard

Track email delivery metrics at https://resend.com/emails:

- **Sent**: Successfully delivered to recipient's server
- **Delivered**: Accepted by recipient's inbox
- **Opened**: Recipient opened the email (requires tracking pixel)
- **Clicked**: Recipient clicked a link
- **Bounced**: Delivery failed (invalid email, mailbox full)
- **Complained**: Recipient marked as spam

### Database Queries

Check recent email logs:

```sql
-- Recent emails sent
SELECT email_to, template_key, subject, status, sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 50;

-- Failed emails
SELECT email_to, template_key, error_message, sent_at
FROM email_logs
WHERE status = 'failed'
ORDER BY sent_at DESC;

-- Emails by category
SELECT category, COUNT(*) as count,
       COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful
FROM email_logs
GROUP BY category;
```

## Notification Preferences

Users can manage email preferences via `/finance/settings/notifications`.

### notification_preferences Table

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  budget_alerts BOOLEAN DEFAULT true,
  account_updates BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Respecting User Preferences

```typescript
// Check preferences before sending
const { preferences } = await getUserNotificationPreferences(userId);

if (preferences.budget_alerts) {
  await sendEmail({ /* budget alert */ });
}
```

### Unsubscribe Links

All marketing emails include an unsubscribe link:

```tsx
<Footer>
  <a href={`https://finance.yatheeshnagella.com/api/notifications/unsubscribe?token=${token}`}>
    Unsubscribe
  </a>
</Footer>
```

## Best Practices

### 1. Async Email Sending

Never block API responses waiting for email delivery:

```typescript
// ✅ Good - Fire and forget
sendEmail(options).catch(console.error);

// ❌ Bad - Blocks response
await sendEmail(options);
```

### 2. Error Handling

Always handle email failures gracefully:

```typescript
try {
  await sendEmail(options);
} catch (error) {
  console.error('Email failed:', error);
  // Don't fail the entire operation
  // Log to database for review
}
```

### 3. Rate Limiting

Resend limits vary by plan. For batch emails, implement rate limiting:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // 10 concurrent emails

const promises = users.map(user =>
  limit(() => sendEmail({ to: user.email, /* ... */ }))
);

await Promise.all(promises);
```

### 4. Template Versioning

When updating email templates, test thoroughly:

1. Send test emails to yourself
2. Check rendering across email clients (Gmail, Outlook, Apple Mail)
3. Verify links work correctly
4. Test on mobile devices

## Troubleshooting

### Email Not Sending

1. **Check Resend Dashboard**: Look for errors or bounces
2. **Verify API Key**: Ensure `RESEND_API_KEY` is set correctly
3. **Check Logs**: Review `email_logs` table for error messages
4. **Domain Verification**: Ensure sending domain is verified in Resend

### Template Not Rendering

1. **Check Template Key**: Ensure it exists in `email_templates` table
2. **Verify Props**: Check that all required props are passed
3. **Review React Errors**: Check server logs for React rendering errors

### Users Not Receiving Emails

1. **Spam Folder**: Ask users to check spam/junk folders
2. **Email Validity**: Verify email address is valid
3. **Domain Reputation**: Check Resend domain reputation
4. **User Preferences**: Verify user hasn't unsubscribed

## Future Enhancements

- [ ] Email campaign builder for marketing
- [ ] A/B testing for subject lines
- [ ] Advanced segmentation for targeted emails
- [ ] Email scheduling (send at optimal times)
- [ ] Rich analytics dashboard
- [ ] SMS notifications via Twilio integration
