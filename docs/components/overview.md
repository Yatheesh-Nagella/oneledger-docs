# Component Library

OneLibro's component library provides reusable, accessible UI components built with React, TypeScript, and Tailwind CSS v4.

## Design Principles

### 1. Consistency

All components follow the same design patterns:
- Color scheme (dark theme primary)
- Typography scale
- Spacing system (Tailwind spacing)
- Border radius (rounded-lg for most components)
- Transition timing (150ms for hovers, 300ms for state changes)

### 2. Accessibility

Components are built with accessibility in mind:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Screen reader friendly

### 3. Responsive Design

Mobile-first approach:
- Stack vertically on mobile
- Use flexbox/grid for layouts
- Touch-friendly tap targets (min 44x44px)
- Responsive typography

### 4. Performance

Optimized for speed:
- Lazy loading for heavy components
- Memoization where appropriate
- Minimal bundle size
- CSS-in-JS avoided (Tailwind only)

## Component Categories

### Layout Components

Structural components for page organization:

- **DashboardLayout** - Main layout with sidebar and top bar
- **DashboardCard** - Reusable card container for dashboard widgets
- **Sidebar** - Navigation sidebar with collapsible sections
- **TopBar** - Header with user menu and notifications
- **BottomNav** - Mobile navigation bar

### Form Components

User input components:

- **TransactionForm** - Add/edit transaction form
- **BudgetForm** - Create/edit budget form
- **RequestInviteModal** - Invite request modal dialog

### Data Display Components

Components for showing data:

- **RecentTransactions** - Transaction list with formatting
- **AccountCard** - Bank account summary card
- **SpendingChart** - Budget spending visualization (Recharts)

### Loading States

Skeleton loaders for better perceived performance:

- **Skeleton** - Base skeleton loader
- **DashboardSkeleton** - Dashboard loading state
- **AccountCardSkeleton** - Account card loading state
- **TransactionListSkeleton** - Transaction list loading state

### Integration Components

Third-party integrations:

- **PlaidLink** - Plaid Link button/modal for bank connections
- **ErrorBoundary** - Catch and display React errors gracefully

### Authentication Components

Auth-related components:

- **ProtectedRoute** - HOC for authenticated routes
- **FinanceLayoutClient** - Finance app layout with auth context

## Component Documentation

### DashboardLayout

Main layout for authenticated finance app pages with sidebar navigation.

**Location**: `components/finance/DashboardLayout.tsx`

**Props**:
```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;              // Page title
  showBackButton?: boolean;    // Show back navigation
}
```

**Usage**:
```tsx
import { DashboardLayout } from '@/components/finance/DashboardLayout';

export default function BudgetsPage() {
  return (
    <DashboardLayout title="Budgets" showBackButton={false}>
      <div className="space-y-6">
        {/* Page content */}
      </div>
    </DashboardLayout>
  );
}
```

**Features**:
- Responsive sidebar (collapses on mobile)
- Top bar with user profile
- Bottom navigation for mobile
- Page title rendering
- Loading states

---

### DashboardCard

Reusable card component for dashboard widgets.

**Location**: `components/finance/DashboardCard.tsx`

**Props**:
```typescript
interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  loading?: boolean;
}
```

**Usage**:
```tsx
<DashboardCard
  title="Total Balance"
  value={formatCurrency(totalBalance)}
  subtitle="Across all accounts"
  icon={<DollarSign className="w-6 h-6" />}
  trend="up"
  trendValue="+5.2%"
/>
```

**Features**:
- Icon support
- Trend indicators (up/down arrows)
- Loading state (skeleton)
- Clickable cards (optional)
- Responsive sizing

---

### AccountCard

Displays bank account information with balance and actions.

**Location**: `components/finance/AccountCard.tsx`

**Props**:
```typescript
interface AccountCardProps {
  account: {
    id: string;
    name: string;
    official_name?: string;
    type: string;
    subtype: string;
    current_balance: number;
    available_balance?: number;
    institution_name: string;
  };
  onSync?: (accountId: string) => void;
  onUnlink?: (accountId: string) => void;
}
```

**Usage**:
```tsx
<AccountCard
  account={account}
  onSync={handleSync}
  onUnlink={handleUnlink}
/>
```

**Features**:
- Account type badges (Checking, Savings, Credit Card)
- Balance display (current and available)
- Institution logo (future enhancement)
- Sync button (refresh transactions)
- Unlink button (disconnect account)
- Last updated timestamp

---

### PlaidLink

Wrapper component for Plaid Link integration.

**Location**: `components/finance/PlaidLink.tsx`

**Props**:
```typescript
interface PlaidLinkProps {
  userId: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit?: () => void;
  mode?: 'create' | 'update';
  itemId?: string;           // Required for update mode
  children?: React.ReactNode; // Custom button content
}
```

**Usage**:
```tsx
import { PlaidLink } from '@/components/finance/PlaidLink';

<PlaidLink
  userId={user.id}
  onSuccess={handlePlaidSuccess}
  onExit={() => console.log('User exited Plaid')}
>
  <button className="btn-primary">
    Connect Bank Account
  </button>
</PlaidLink>
```

**Features**:
- Create mode (new bank connection)
- Update mode (re-authenticate existing connection)
- Error handling
- Loading states
- Customizable button

---

### TransactionForm

Form for adding/editing transactions.

**Location**: `components/finance/TransactionForm.tsx`

**Props**:
```typescript
interface TransactionFormProps {
  transaction?: Transaction;  // For editing
  onSubmit: (data: TransactionFormData) => Promise<void>;
  onCancel: () => void;
}
```

**Usage**:
```tsx
<TransactionForm
  transaction={existingTransaction}
  onSubmit={handleSubmit}
  onCancel={() => router.back()}
/>
```

**Fields**:
- Account (select)
- Amount (number input with currency formatting)
- Date (date picker)
- Category (select)
- Description (text input)
- Notes (textarea, optional)

**Validation**:
- Amount must be > 0
- Date required
- Category required
- Description required

---

### BudgetForm

Form for creating/editing budgets.

**Location**: `components/finance/BudgetForm.tsx`

**Props**:
```typescript
interface BudgetFormProps {
  budget?: Budget;           // For editing
  onSubmit: (data: BudgetFormData) => Promise<void>;
  onCancel: () => void;
}
```

**Usage**:
```tsx
<BudgetForm
  budget={existingBudget}
  onSubmit={handleCreateBudget}
  onCancel={() => router.push('/finance/budgets')}
/>
```

**Fields**:
- Name (text input)
- Category (select from predefined categories)
- Limit (currency input)
- Period (monthly/weekly)
- Start date (date picker)

**Validation**:
- Name required (min 3 chars)
- Limit must be > 0
- Period required
- Category required

---

### SpendingChart

Recharts-based visualization of budget spending.

**Location**: `components/finance/SpendingChart.tsx`

**Props**:
```typescript
interface SpendingChartProps {
  data: Array<{
    category: string;
    spent: number;
    budget: number;
  }>;
  height?: number;
  showLegend?: boolean;
}
```

**Usage**:
```tsx
<SpendingChart
  data={budgetData}
  height={400}
  showLegend={true}
/>
```

**Features**:
- Bar chart comparing spent vs budget
- Color coding (green = under budget, red = over budget)
- Responsive sizing
- Tooltip with formatted values
- Legend (optional)

---

### RecentTransactions

Transaction list component with formatting and actions.

**Location**: `components/finance/RecentTransactions.tsx`

**Props**:
```typescript
interface RecentTransactionsProps {
  transactions: Transaction[];
  limit?: number;             // Max transactions to show
  showViewAll?: boolean;      // Show "View All" link
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}
```

**Usage**:
```tsx
<RecentTransactions
  transactions={recentTransactions}
  limit={5}
  showViewAll={true}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Features**:
- Transaction rows with merchant name, category, amount
- Date formatting (relative: "2 days ago")
- Category badges with icons
- Amount color coding (red for expenses, green for income)
- Empty state message
- Action buttons (edit, delete)

---

### RequestInviteModal

Modal dialog for requesting an invite code.

**Location**: `components/finance/RequestInviteModal.tsx`

**Props**:
```typescript
interface RequestInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Usage**:
```tsx
const [showModal, setShowModal] = useState(false);

<RequestInviteModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
/>
```

**Features**:
- Email and name input fields
- Form validation
- Loading state during submission
- Success state with auto-close
- Error handling with user-friendly messages
- Closes on overlay click or X button

---

### Skeleton Loaders

Loading state components for better perceived performance.

**Locations**: `components/finance/skeletons/`

**Available Skeletons**:

1. **Skeleton** - Base skeleton component
   ```tsx
   <Skeleton className="w-full h-8" />
   ```

2. **DashboardSkeleton** - Dashboard page loading
   ```tsx
   <DashboardSkeleton />
   ```

3. **AccountCardSkeleton** - Account card loading
   ```tsx
   <AccountCardSkeleton />
   ```

4. **TransactionListSkeleton** - Transaction list loading
   ```tsx
   <TransactionListSkeleton count={5} />
   ```

**Usage**:
```tsx
import { DashboardSkeleton } from '@/components/finance/skeletons';

{loading ? <DashboardSkeleton /> : <DashboardContent />}
```

---

### ProtectedRoute

Higher-order component for protecting routes with authentication.

**Location**: `components/finance/ProtectedRoute.tsx`

**Usage**:
```tsx
import { ProtectedRoute } from '@/components/finance/ProtectedRoute';

export default function BudgetsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Protected content */}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

**Features**:
- Redirects to login if not authenticated
- Shows loading state during auth check
- Preserves redirect URL after login
- Works with AuthContext

---

### ErrorBoundary

React error boundary for graceful error handling.

**Location**: `components/finance/ErrorBoundary.tsx`

**Usage**:
```tsx
import { ErrorBoundary } from '@/components/finance/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

**Features**:
- Catches React rendering errors
- Displays user-friendly error message
- "Try Again" button to recover
- Logs errors to console (production: send to error tracking)

---

## Styling Guidelines

### Color Palette

**Background Colors**:
- `bg-[#0a0a0a]` - Main background
- `bg-[#0f0f0f]` - Card background
- `bg-[#1a1a1a]` - Elevated elements

**Border Colors**:
- `border-[#2a2a2a]` - Default border
- `border-[#3a3a3a]` - Hover border

**Text Colors**:
- `text-white` - Primary text
- `text-gray-300` - Secondary text
- `text-gray-400` - Tertiary text/placeholders
- `text-gray-500` - Disabled text

**Accent Colors**:
- `text-[#10b981]` / `bg-[#10b981]` - Primary (green)
- `text-[#ef4444]` - Danger/error (red)
- `text-[#f59e0b]` - Warning (orange)
- `text-[#3b82f6]` - Info (blue)

### Typography

**Font Family**: System font stack (default Next.js)

**Font Sizes**:
- `text-xs` (12px) - Labels, captions
- `text-sm` (14px) - Body text
- `text-base` (16px) - Default
- `text-lg` (18px) - Subheadings
- `text-xl` (20px) - Card titles
- `text-2xl` (24px) - Page titles
- `text-3xl` (30px) - Large headings

**Font Weights**:
- `font-normal` (400) - Body text
- `font-medium` (500) - Labels
- `font-semibold` (600) - Buttons, headings
- `font-bold` (700) - Emphasis

### Spacing

Use Tailwind's spacing scale:
- `gap-2` (0.5rem / 8px) - Tight spacing
- `gap-4` (1rem / 16px) - Default spacing
- `gap-6` (1.5rem / 24px) - Section spacing
- `gap-8` (2rem / 32px) - Large spacing

### Border Radius

- `rounded` (4px) - Small elements
- `rounded-md` (6px) - Buttons, inputs
- `rounded-lg` (8px) - Cards (default)
- `rounded-xl` (12px) - Large cards
- `rounded-full` - Circular (avatars, badges)

### Shadows

Minimal shadows for depth:
- `shadow-sm` - Subtle elevation
- `shadow-md` - Card elevation
- `shadow-lg` - Modal/popover elevation

## Animation & Transitions

### Hover Effects

```css
transition-colors duration-150
hover:bg-[#1a1a1a]
hover:border-[#3a3a3a]
```

### Loading States

```css
animate-pulse  /* Skeleton loaders */
animate-spin   /* Spinners */
```

### Smooth Scrolling

```css
scroll-smooth
```

## Accessibility Best Practices

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Use `tabIndex` appropriately
- Provide visible focus indicators

### ARIA Labels

```tsx
<button aria-label="Delete transaction">
  <TrashIcon />
</button>
```

### Semantic HTML

Use proper HTML elements:
- `<button>` for actions
- `<a>` for navigation
- `<nav>` for navigation sections
- `<main>` for main content

### Focus Management

```tsx
// Trap focus in modals
<Dialog onClose={onClose} initialFocus={cancelButtonRef}>
  {/* Modal content */}
</Dialog>
```

## Performance Optimization

### Code Splitting

Lazy load heavy components:

```tsx
const SpendingChart = dynamic(
  () => import('@/components/finance/SpendingChart'),
  { loading: () => <Skeleton className="h-[400px]" /> }
);
```

### Memoization

Prevent unnecessary re-renders:

```tsx
const MemoizedTransactionList = React.memo(RecentTransactions);
```

### Image Optimization

Use Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src="/oneLibro-logo.png"
  alt="OneLibro"
  width={120}
  height={40}
  priority
/>
```

## Testing Components

### Unit Tests (Vitest)

```tsx
import { render, screen } from '@testing-library/react';
import { DashboardCard } from './DashboardCard';

describe('DashboardCard', () => {
  it('renders title and value', () => {
    render(<DashboardCard title="Balance" value="$1,234.56" />);
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });
});
```

### Integration Tests (Playwright)

```typescript
test('user can add transaction', async ({ page }) => {
  await page.goto('/finance/transactions/add');
  await page.fill('input[name="amount"]', '50.00');
  await page.selectOption('select[name="category"]', 'Groceries');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/finance/transactions');
});
```

## Future Component Additions

- [ ] Toast notifications (success, error, info)
- [ ] Date range picker
- [ ] Multi-select dropdown
- [ ] Data table with sorting/filtering
- [ ] Chart components (line, pie, donut)
- [ ] File upload component
- [ ] Avatar component with fallback
- [ ] Progress bar component
- [ ] Tabs component
- [ ] Accordion component

## Related Documentation

- [Navigation System](./navigation.md)
