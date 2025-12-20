# Development Workflow

Best practices and workflow for OneLibro development.

## Table of Contents

- [Getting Started](#getting-started)
- [Git Workflow](#git-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Code Review](#code-review)
- [Deployment](#deployment)

---

## Getting Started

### Initial Setup

1. **Clone repository:**
```bash
git clone https://github.com/Yatheesh-Nagella/yatheesh-portfolio.git
cd yatheesh-portfolio
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Run development server:**
```bash
npm run dev
```

5. **Open in browser:**
- Main: http://localhost:3000
- Finance: http://finance.localhost:3000
- Admin: http://admin.localhost:3000

---

### Project Structure

```
yatheesh-portfolio/
├── app/                    # Next.js App Router pages
│   ├── finance/           # Finance app routes
│   ├── admin/             # Admin dashboard routes
│   └── api/               # API endpoints
├── components/            # React components
│   └── finance/          # Finance-specific components
├── contexts/             # React Context providers
├── lib/                  # Utility libraries
├── types/               # TypeScript type definitions
├── public/              # Static assets
├── DOCS/                # Documentation
└── supabase/            # Database migrations
```

---

## Git Workflow

### Branch Naming

Use descriptive branch names with prefixes:

```bash
# Feature branches
feature/user-authentication
feature/plaid-integration
feature/budget-tracking

# Bug fixes
fix/login-redirect-issue
fix/transaction-sync-error

# Refactoring
refactor/optimize-queries
refactor/split-large-components

# Documentation
docs/api-reference
docs/setup-guide

# Chores (dependencies, config, etc.)
chore/update-dependencies
chore/configure-eslint
```

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add user dashboard"

# Push to remote
git push -u origin feature/your-feature-name
```

---

### Commit Messages

Follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature or bug change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)

**Examples:**

```bash
# Feature
git commit -m "feat(auth): add invite-only signup system"

# Bug fix
git commit -m "fix(plaid): handle expired access tokens"

# Refactor
git commit -m "refactor(queries): optimize getUserAccounts query

- Use single query with nested relations instead of two queries
- Reduces database round trips from 2 to 1
- 50% performance improvement"

# Documentation
git commit -m "docs: add API reference for Plaid endpoints"

# Performance
git commit -m "perf(transactions): add pagination for transaction list"
```

**Commit Message Best Practices:**

✅ **Good:**
```
feat(budgets): add monthly budget tracking

- Create budgets table with RLS policies
- Add createBudget API endpoint
- Implement budget creation UI
- Calculate spending vs budget automatically
```

❌ **Bad:**
```
Update files
```

❌ **Bad:**
```
WIP
```

❌ **Bad:**
```
Fix bug
```

---

### Pull Request Process

1. **Create pull request:**
```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
# Use PR template if available
```

2. **PR Title Format:**
```
feat(scope): Brief description of changes
```

3. **PR Description Template:**
```markdown
## Summary
Brief description of what this PR does.

## Changes
- List key changes
- One item per line
- Be specific

## Test Plan
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Tested in staging
- [ ] Manual testing steps:
  1. Go to X page
  2. Click Y button
  3. Verify Z happens

## Screenshots (if applicable)
[Add screenshots or screen recordings]

## Related Issues
Fixes #123
Related to #456
```

4. **Before merging:**
- ✅ All CI checks pass
- ✅ Code reviewed and approved
- ✅ No merge conflicts
- ✅ Branch is up to date with main

5. **Merge strategy:**
```bash
# Squash and merge (preferred for feature branches)
# Creates single clean commit in main

# Rebase and merge (for clean linear history)
# Maintains individual commits

# Merge commit (for important milestones)
# Preserves full branch history
```

---

## Code Standards

### TypeScript

**Always use TypeScript for new files:**

```typescript
// ✅ Good: Type-safe function
export async function getUserAccounts(userId: string): Promise<Account[]> {
  // Implementation
}

// ❌ Bad: Using 'any'
export async function getUserAccounts(userId: any): Promise<any> {
  // Implementation
}
```

**Prefer interfaces for object types:**

```typescript
// ✅ Good: Interface
interface User {
  id: string;
  email: string;
  full_name: string | null;
}

// ✅ Also good: Type alias (for unions, primitives)
type Status = 'active' | 'inactive' | 'pending';

// ❌ Avoid: Inline types
function updateUser(user: { id: string; email: string }) {
  // Use interface instead
}
```

**Use type imports:**

```typescript
// ✅ Good: Type-only import
import type { User, Account } from '@/types/database.types';

// ✅ Good: Mixed import
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
```

---

### React Components

**Use functional components with hooks:**

```typescript
// ✅ Good: Functional component with TypeScript
interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
}

export function DashboardCard({ title, value, icon, trend }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between">
        <span className="text-gray-600">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {trend && (
        <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  );
}
```

**Component file structure:**

```typescript
'use client'; // If client component

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardCard } from '@/components/finance/DashboardCard';
import type { Account } from '@/types/database.types';

// Types/Interfaces
interface AccountsPageProps {
  // Props type definition
}

// Component
export default function AccountsPage({ }: AccountsPageProps) {
  // Hooks
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Event handlers
  const handleClick = () => {
    // Handler logic
  };

  // Render helpers
  const renderAccount = (account: Account) => {
    return <div key={account.id}>{account.account_name}</div>;
  };

  // Render
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {accounts.map(renderAccount)}
    </div>
  );
}
```

---

### Naming Conventions

**Variables:**
```typescript
// camelCase for variables and functions
const userId = user.id;
const accountBalance = 10000;

function getUserAccounts() {}
```

**Components:**
```typescript
// PascalCase for components
function DashboardCard() {}
function UserProfile() {}
```

**Constants:**
```typescript
// SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
```

**Files:**
```
// Component files: PascalCase.tsx
DashboardCard.tsx
UserProfile.tsx

// Utility files: lowercase or camelCase
supabase.ts
plaid.ts
formatCurrency.ts

// Page files: lowercase
page.tsx
layout.tsx
```

---

### Code Organization

**Keep files focused and small:**

```typescript
// ✅ Good: Single responsibility
// lib/currency.ts
export function formatCurrency(cents: number): string {
  // Implementation
}

export function dollarsToCents(dollars: number): number {
  // Implementation
}

// ❌ Bad: Kitchen sink file
// lib/utils.ts - contains 50+ unrelated functions
```

**Use barrel exports:**

```typescript
// components/finance/index.ts
export { DashboardCard } from './DashboardCard';
export { PlaidLink } from './PlaidLink';
export { SpendingChart } from './SpendingChart';

// Then import
import { DashboardCard, PlaidLink } from '@/components/finance';
```

---

### Error Handling

**Always handle errors gracefully:**

```typescript
// ✅ Good: Proper error handling
export async function getUserAccounts(userId: string): Promise<Account[]> {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAccounts:', error);
    return [];
  }
}

// ❌ Bad: No error handling
export async function getUserAccounts(userId: string): Promise<Account[]> {
  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);

  return data; // Could be undefined!
}
```

**User-facing error messages:**

```typescript
// ✅ Good: Helpful error message
if (error.includes('expired')) {
  toast.error('Your session has expired. Please sign in again.');
  router.push('/finance/login');
}

// ❌ Bad: Technical error exposed to user
toast.error(error.message); // "Row violates RLS policy"
```

---

## Testing

### Manual Testing Checklist

Before submitting PR, test:

**Authentication:**
- [ ] Sign up with invite code
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials
- [ ] Sign out
- [ ] Session persistence after refresh
- [ ] Protected routes redirect to login

**Plaid Integration:**
- [ ] Connect bank account (sandbox)
- [ ] View connected accounts
- [ ] Sync transactions
- [ ] Unlink account
- [ ] Handle connection errors

**Data Display:**
- [ ] Dashboard loads correctly
- [ ] Account balances are accurate
- [ ] Transactions display correctly
- [ ] Charts render properly
- [ ] Pagination works

**Edge Cases:**
- [ ] Empty states (no accounts, no transactions)
- [ ] Loading states
- [ ] Error states
- [ ] Large datasets (100+ items)
- [ ] Mobile responsive

---

### Writing Unit Tests

**Test helper functions:**

```typescript
// lib/__tests__/currency.test.ts
import { formatCurrency, dollarsToCents, centsToDollars } from '../currency';

describe('Currency utilities', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts correctly', () => {
      expect(formatCurrency(123456)).toBe('$1,234.56');
    });

    it('formats negative amounts correctly', () => {
      expect(formatCurrency(-5000)).toBe('-$50.00');
    });

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('dollarsToCents', () => {
    it('converts dollars to cents', () => {
      expect(dollarsToCents(19.99)).toBe(1999);
      expect(dollarsToCents(100)).toBe(10000);
    });

    it('handles floating point precision', () => {
      expect(dollarsToCents(0.1 + 0.2)).toBe(30); // Not 29 or 31
    });
  });
});
```

---

### Testing with Plaid Sandbox

**Test credentials:**

```typescript
// Successful connection
username: 'user_good'
password: 'pass_good'

// Multi-factor auth
username: 'user_good' (will prompt for MFA code: 1234)

// Invalid credentials
username: 'user_bad'
password: 'pass_bad'

// Locked account
username: 'user_locked'
password: 'pass_locked'
```

<!-- See Plaid Sandbox Guide (coming soon) for more testing scenarios. -->

---

## Code Review

### Reviewer Checklist

When reviewing code:

**Functionality:**
- [ ] Code does what PR description says
- [ ] No obvious bugs
- [ ] Edge cases handled
- [ ] Error handling present

**Code Quality:**
- [ ] Follows TypeScript best practices
- [ ] No `any` types (unless documented why)
- [ ] Functions are focused and small
- [ ] Variable names are clear
- [ ] No commented-out code

**Performance:**
- [ ] No N+1 queries
- [ ] Pagination for large datasets
- [ ] Proper indexes used
- [ ] No unnecessary re-renders

**Security:**
- [ ] No secrets in code
- [ ] Input validation present
- [ ] Authorization checks present
- [ ] SQL injection prevented

**Testing:**
- [ ] Tested manually
- [ ] Tests added for new features
- [ ] No breaking changes to existing tests

---

### Giving Feedback

**Be constructive and specific:**

✅ **Good:**
```
Consider using `useMemo` here to avoid recalculating on every render:

const sortedAccounts = useMemo(
  () => accounts.sort((a, b) => b.balance - a.balance),
  [accounts]
);
```

❌ **Bad:**
```
This is slow.
```

**Ask questions:**

✅ **Good:**
```
Why did you choose to use a separate API call here instead of
including this in the initial query? Is there a performance reason?
```

**Acknowledge good code:**

✅ **Good:**
```
Nice refactor! This is much more readable than the previous version.
```

---

## Deployment

### Pre-Deployment Checklist

**Before deploying to production:**

- [ ] All tests pass
- [ ] Code reviewed and approved
- [ ] Environment variables set in Vercel
- [ ] Database migrations run
- [ ] No console.log statements (or only intentional logging)
- [ ] Error handling in place
- [ ] Performance tested
- [ ] Security review completed
- [ ] Documentation updated

---

### Deployment Process

**1. Merge to main:**
```bash
# After PR approval
git checkout main
git pull origin main
# Squash and merge PR on GitHub
```

**2. Vercel auto-deploys:**
- Vercel detects push to main
- Runs build
- Deploys to production
- Assigns deployment URL

**3. Verify deployment:**
- Check deployment URL
- Test critical flows
- Monitor for errors

**4. Rollback if needed:**
```bash
# In Vercel dashboard
# Go to Deployments
# Find previous stable deployment
# Click "Promote to Production"
```

---

### Environment-Specific Config

**Development:**
```env
PLAID_ENV=sandbox
# Use test credentials
```

**Staging:**
```env
PLAID_ENV=development
# Use real credentials but Plaid development mode
```

**Production:**
```env
PLAID_ENV=production
# Real credentials, real bank data
```

---

## Daily Workflow

**Morning:**
```bash
# Update local repo
git checkout main
git pull origin main

# Check for updates
npm install

# Start dev server
npm run dev
```

**During Development:**
```bash
# Make changes
# Test changes
# Commit frequently

git add .
git commit -m "feat: add feature X"
```

**End of Day:**
```bash
# Push work in progress
git push origin feature/your-feature

# Or create draft PR for early feedback
```

**Weekly:**
```bash
# Update dependencies
npm update

# Check for security issues
npm audit
npm audit fix
```

---

## Best Practices Summary

✅ **Do:**
- Write TypeScript, not JavaScript
- Use helper functions from `lib/`
- Handle errors gracefully
- Add loading states
- Validate user input
- Write descriptive commit messages
- Test before submitting PR
- Review others' code
- Update documentation

❌ **Don't:**
- Commit secrets or API keys
- Use `any` type without good reason
- Skip error handling
- Write god files (1000+ lines)
- Ignore TypeScript errors
- Deploy without testing
- Leave console.logs in production code
- Skip code review

---

**Next Steps:**
- Review [Architecture Overview](../architecture/overview) for system design
- Read [Troubleshooting Guide](./troubleshooting) for common issues
