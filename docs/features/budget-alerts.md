# Budget Alerts

Budget alerts automatically notify users when they exceed their spending limits. Alerts are sent via email and can be customized per budget.

## Overview

OneLibro's budget alert system helps users stay on track with their financial goals by sending timely notifications when spending thresholds are reached.

**Key Features:**
- Automatic daily checks for over-budget spending
- Email notifications with spending details
- Alert history to prevent duplicate notifications
- User-configurable notification preferences
- Multiple alert levels (warning, exceeded)

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              Budget Alert System Flow                       │
└─────────────────────────────────────────────────────────────┘

Daily Cron Job (9 AM UTC)
    │
    ├─> app/api/cron/budget-alerts/route.ts
    │
    ├─> For each active budget:
    │       │
    │       ├─> Calculate total spending this month
    │       ├─> Compare to budget limit
    │       │
    │       ├─> If exceeded AND not already notified:
    │       │       │
    │       │       ├─> Send email alert
    │       │       └─> Log to budget_alert_history
    │       │
    │       └─> If within 90% of limit:
    │               │
    │               └─> Send warning (optional)
    │
    └─> Return summary of alerts sent
```

## Alert Levels

### 1. Warning Alert (90% threshold)

**Triggered**: When spending reaches 90% of budget limit
**Frequency**: Once per budget period
**Purpose**: Early warning to slow spending

**Example:**
- Budget: $500/month for Groceries
- Spent: $455
- Alert: "You've spent 91% of your Groceries budget"

### 2. Exceeded Alert

**Triggered**: When spending exceeds 100% of budget limit
**Frequency**: Once per budget period
**Purpose**: Notify user they've exceeded their budget

**Example:**
- Budget: $500/month for Groceries
- Spent: $523
- Alert: "You've exceeded your Groceries budget by $23"

## Database Schema

### budget_alert_history Table

Tracks sent alerts to prevent duplicates within the same budget period.

```sql
CREATE TABLE budget_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,           -- 'warning' or 'exceeded'
  amount_spent INTEGER NOT NULL,      -- Amount in cents
  budget_limit INTEGER NOT NULL,      -- Limit in cents
  period_start DATE NOT NULL,         -- Budget period start
  period_end DATE NOT NULL,           -- Budget period end
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_alert_history_budget ON budget_alert_history(budget_id);
CREATE INDEX idx_alert_history_user ON budget_alert_history(user_id);
CREATE INDEX idx_alert_history_sent ON budget_alert_history(sent_at DESC);

-- Prevent duplicate alerts per budget period
CREATE UNIQUE INDEX idx_unique_alert_per_period
ON budget_alert_history(budget_id, alert_type, period_start, period_end);
```

## Cron Job Configuration

### Vercel Cron Job

Configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/budget-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Schedule**: `0 9 * * *` (Daily at 9:00 AM UTC)
**Vercel Plan**: Requires Hobby plan or higher

### Cron Job Endpoint

**Location**: `app/api/cron/budget-alerts/route.ts`

**Authorization**: Vercel cron secret (auto-verified)

```typescript
export async function GET(request: NextRequest) {
  // Verify request is from Vercel cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Process budget alerts
  const results = await processBudgetAlerts();

  return NextResponse.json({
    success: true,
    alertsSent: results.alertsSent,
    budgetsChecked: results.budgetsChecked,
  });
}
```

## Alert Processing Logic

### 1. Fetch Active Budgets

```sql
SELECT b.*, u.email, u.name
FROM budgets b
JOIN users u ON b.user_id = u.id
WHERE b.period_type IN ('monthly', 'weekly')
AND b.limit > 0;
```

### 2. Calculate Current Spending

For each budget, sum transactions in current period:

```sql
SELECT SUM(amount) as total_spent
FROM transactions
WHERE user_id = $1
AND category = $2
AND date >= $3  -- Period start
AND date <= $4  -- Period end
```

### 3. Check Alert Conditions

```typescript
const percentSpent = (totalSpent / budget.limit) * 100;

// Warning threshold: 90%
if (percentSpent >= 90 && percentSpent < 100) {
  // Send warning alert if not already sent this period
  if (!hasWarningAlertThisPeriod(budget.id)) {
    await sendWarningAlert(user, budget, totalSpent);
  }
}

// Exceeded threshold: 100%+
if (percentSpent >= 100) {
  // Send exceeded alert if not already sent this period
  if (!hasExceededAlertThisPeriod(budget.id)) {
    await sendExceededAlert(user, budget, totalSpent);
  }
}
```

### 4. Prevent Duplicate Alerts

Before sending, check `budget_alert_history`:

```sql
SELECT id FROM budget_alert_history
WHERE budget_id = $1
AND alert_type = $2
AND period_start = $3
AND period_end = $4;
```

If record exists, skip sending alert.

### 5. Send Email Alert

```typescript
await sendEmail({
  to: user.email,
  subject: `Budget Alert: ${budget.name}`,
  templateKey: 'budget_alert_email',
  templateProps: {
    name: user.name,
    budgetName: budget.name,
    budgetLimit: formatCurrency(budget.limit),
    amountSpent: formatCurrency(totalSpent),
    percentSpent: Math.round(percentSpent),
    overage: formatCurrency(totalSpent - budget.limit),
  },
  category: 'system',
});
```

### 6. Log Alert

```sql
INSERT INTO budget_alert_history (
  budget_id, user_id, alert_type, amount_spent,
  budget_limit, period_start, period_end
) VALUES ($1, $2, $3, $4, $5, $6, $7);
```

## Email Template

**Template**: `emails/templates/BudgetAlertEmail.tsx`

**Subject Line**:
- Warning: "Budget Alert: You're at 91% of your [Category] budget"
- Exceeded: "Budget Alert: You've exceeded your [Category] budget"

**Email Content**:

```tsx
<EmailLayout>
  <h1>Budget Alert</h1>

  <p>Hi {name},</p>

  {alertType === 'warning' ? (
    <p>
      You've spent <strong>{percentSpent}%</strong> of your{' '}
      <strong>{budgetName}</strong> budget this month.
    </p>
  ) : (
    <p>
      You've exceeded your <strong>{budgetName}</strong> budget by{' '}
      <strong>{overage}</strong>.
    </p>
  )}

  <div className="stats">
    <div>Spent: {amountSpent}</div>
    <div>Budget: {budgetLimit}</div>
    <div>Remaining: {formatCurrency(budgetLimit - amountSpent)}</div>
  </div>

  <Button href="https://finance.yatheeshnagella.com/budgets">
    View Budget Details
  </Button>

  <p className="tip">
    💡 <strong>Tip:</strong> Review your recent transactions to identify
    areas where you can cut back.
  </p>
</EmailLayout>
```

## User Notification Preferences

Users can enable/disable budget alerts in `/finance/settings/notifications`.

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

### Checking Preferences

Before sending alert:

```typescript
const { budget_alerts } = await getNotificationPreferences(userId);

if (!budget_alerts) {
  // Skip sending alert
  return;
}

await sendEmail({ /* ... */ });
```

### Settings UI

```tsx
// finance/settings/notifications/page.tsx
<label>
  <input
    type="checkbox"
    checked={preferences.budget_alerts}
    onChange={handleToggle}
  />
  Budget Alerts
  <span>Notify me when I exceed my budget</span>
</label>
```

## Monitoring & Analytics

### Cron Job Logs

Check Vercel deployment logs for cron execution:

```
[Cron] Budget Alerts Job Started
[Cron] Checked 42 budgets
[Cron] Sent 3 alerts (2 exceeded, 1 warning)
[Cron] Completed in 2.3s
```

### Database Queries

**Alert history overview**:
```sql
SELECT
  DATE(sent_at) as date,
  alert_type,
  COUNT(*) as count
FROM budget_alert_history
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at), alert_type
ORDER BY date DESC;
```

**Most triggered budgets**:
```sql
SELECT
  b.name,
  b.category,
  COUNT(*) as alert_count
FROM budget_alert_history bah
JOIN budgets b ON bah.budget_id = b.id
GROUP BY b.id, b.name, b.category
ORDER BY alert_count DESC
LIMIT 10;
```

**User alert frequency**:
```sql
SELECT
  u.email,
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN alert_type = 'exceeded' THEN 1 END) as exceeded_alerts
FROM budget_alert_history bah
JOIN users u ON bah.user_id = u.id
WHERE sent_at >= NOW() - INTERVAL '90 days'
GROUP BY u.id, u.email
ORDER BY total_alerts DESC;
```

## Testing Budget Alerts

### Local Testing

1. **Set up test budget**:
   ```sql
   INSERT INTO budgets (user_id, name, category, limit, period_type)
   VALUES ('user-uuid', 'Test Groceries', 'Food & Dining', 50000, 'monthly');
   ```

2. **Add transactions exceeding limit**:
   ```sql
   INSERT INTO transactions (user_id, account_id, amount, category, date)
   VALUES ('user-uuid', 'account-uuid', 55000, 'Food & Dining', CURRENT_DATE);
   ```

3. **Manually trigger cron job**:
   ```bash
   curl http://localhost:3000/api/cron/budget-alerts \
     -H "Authorization: Bearer your-cron-secret"
   ```

4. **Check email logs**:
   ```sql
   SELECT * FROM email_logs
   WHERE template_key = 'budget_alert_email'
   ORDER BY sent_at DESC
   LIMIT 1;
   ```

### Production Testing

1. **Test via Vercel Dashboard**:
   - Go to Settings → Cron Jobs
   - Click "Trigger" next to budget-alerts job
   - Monitor deployment logs

2. **Verify in Resend**:
   - Check Resend dashboard for sent emails
   - Verify delivery status

## Troubleshooting

### Alerts Not Sending

**Possible causes**:
1. User has disabled budget alerts in preferences
2. Alert already sent this period (check `budget_alert_history`)
3. Email delivery failure (check `email_logs`)
4. Budget has no transactions in current period
5. Cron job not executing (check Vercel logs)

**Debug steps**:
```sql
-- Check user preferences
SELECT budget_alerts FROM notification_preferences WHERE user_id = 'uuid';

-- Check alert history
SELECT * FROM budget_alert_history
WHERE budget_id = 'uuid'
AND period_start = '2025-01-01';

-- Check email logs
SELECT * FROM email_logs
WHERE template_key = 'budget_alert_email'
AND user_id = 'uuid'
ORDER BY sent_at DESC;
```

### Duplicate Alerts

**If users receive multiple alerts for same budget period**:

1. Check unique index on `budget_alert_history`:
   ```sql
   SELECT * FROM pg_indexes
   WHERE tablename = 'budget_alert_history';
   ```

2. Verify period calculation logic in cron job
3. Check for race conditions in concurrent executions

### Alerts Too Frequent

**If alerts send every day instead of once per period**:

- Verify `period_start` and `period_end` in alert history
- Check that period calculation matches budget period type
- Ensure unique constraint prevents duplicates

## Best Practices

### 1. Graceful Degradation

Don't fail entire cron job if one alert fails:

```typescript
for (const budget of budgets) {
  try {
    await processbudgetAlert(budget);
  } catch (error) {
    console.error(`Failed to process budget ${budget.id}:`, error);
    // Continue to next budget
  }
}
```

### 2. Rate Limiting

Batch email sending to respect Resend limits:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(10); // 10 concurrent emails

const promises = alerts.map(alert =>
  limit(() => sendBudgetAlert(alert))
);

await Promise.all(promises);
```

### 3. Meaningful Logging

Log important metrics for monitoring:

```typescript
console.log(`Budget Alerts Summary:
  - Budgets checked: ${budgetsChecked}
  - Alerts sent: ${alertsSent}
  - Warnings: ${warningCount}
  - Exceeded: ${exceededCount}
  - Errors: ${errorCount}
  - Duration: ${duration}ms
`);
```

### 4. Idempotency

Ensure cron job can be safely re-run without duplicating alerts:
- Use unique constraints in database
- Check alert history before sending
- Handle concurrent executions gracefully

## Future Enhancements

- [ ] **In-App Notifications**: Show alerts in dashboard, not just email
- [ ] **Custom Thresholds**: Let users set warning % (default 90%)
- [ ] **Alert Frequency**: Weekly summaries instead of immediate alerts
- [ ] **Spending Insights**: Include AI-generated spending tips in alerts
- [ ] **Snooze Alerts**: Temporarily disable alerts for specific budgets
- [ ] **Multi-Channel**: SMS alerts via Twilio for urgent notifications
- [ ] **Forecast Alerts**: "At current rate, you'll exceed budget by [date]"
- [ ] **Category Recommendations**: Suggest budget adjustments based on patterns
- [ ] **Comparative Analytics**: "You spent 20% more than last month"

## Related Documentation

- [Email System](./email-system.md)
- [Database Schema](../architecture/database.md)
