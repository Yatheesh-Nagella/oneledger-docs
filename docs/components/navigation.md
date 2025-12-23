# Navigation System

OneLibro uses a responsive navigation system with sidebar for desktop and bottom navigation for mobile, providing seamless access to all app features.

## Overview

The navigation system adapts to different screen sizes:
- **Desktop (≥1024px)**: Sidebar navigation + top bar
- **Tablet (768px-1023px)**: Collapsible sidebar + top bar
- **Mobile (&lt;768px)**: Bottom navigation + top bar

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Navigation Structure                     │
└─────────────────────────────────────────────────────────────┘

DashboardLayout
│
├─> Sidebar (Desktop/Tablet)
│   ├─> Logo
│   ├─> Navigation Links
│   │   ├─> Dashboard
│   │   ├─> Accounts
│   │   ├─> Transactions
│   │   ├─> Budgets
│   │   └─> Settings
│   └─> User Menu
│
├─> TopBar (All Devices)
│   ├─> Page Title
│   ├─> User Avatar
│   └─> Mobile Menu Toggle
│
└─> BottomNav (Mobile Only)
    ├─> Dashboard Icon
    ├─> Accounts Icon
    ├─> Transactions Icon
    └─> Budgets Icon
```

## Components

### Sidebar

**Location**: `components/finance/Sidebar.tsx`

**Features**:
- Active link highlighting
- Icon + text labels
- Collapsible on tablet
- Smooth transitions
- Logout button
- User profile section

**Desktop Layout**:
```
┌──────────────────┐
│  OneLibro Logo   │
├──────────────────┤
│ 📊 Dashboard     │ ← Active (highlighted)
│ 🏦 Accounts      │
│ 💳 Transactions  │
│ 📈 Budgets       │
│ ⚙️  Settings     │
├──────────────────┤
│ User: John Doe   │
│ 🚪 Logout        │
└──────────────────┘
```

**Navigation Links**:

| Page | Path | Icon | Description |
|------|------|------|-------------|
| Dashboard | `/finance` | LayoutDashboard | Overview of finances |
| Accounts | `/finance/accounts` | Building2 | Connected bank accounts |
| Transactions | `/finance/transactions` | Receipt | Transaction history |
| Budgets | `/finance/budgets` | PiggyBank | Budget management |
| Settings | `/finance/settings` | Settings | User preferences |

**Implementation**:
```tsx
import { Sidebar } from '@/components/finance/Sidebar';

export default function FinanceLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

**Active Link Styling**:
```tsx
const isActive = pathname === href;

<Link
  href={href}
  className={cn(
    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
    isActive
      ? 'bg-[#10b981] text-white'
      : 'text-gray-300 hover:bg-[#1a1a1a]'
  )}
>
  <Icon className="w-5 h-5" />
  <span>{label}</span>
</Link>
```

---

### TopBar

**Location**: `components/finance/TopBar.tsx`

**Features**:
- Page title display
- User avatar with dropdown menu
- Mobile menu toggle
- Breadcrumb navigation (optional)
- Notifications badge (future)

**Layout**:
```
┌────────────────────────────────────────────────────────────┐
│ ☰ Dashboard                            🔔 👤 John Doe ▼   |
└────────────────────────────────────────────────────────────┘
```

**User Dropdown Menu**:
- Profile
- Settings
- Help & Support
- Logout

**Implementation**:
```tsx
import { TopBar } from '@/components/finance/TopBar';

<TopBar
  title="Dashboard"
  user={user}
  showMobileMenu={isMobileMenuOpen}
  onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
/>
```

---

### BottomNav

**Location**: `components/finance/BottomNav.tsx`

**Features**:
- Fixed position at bottom
- Icon-only navigation
- Active state highlighting
- Touch-optimized targets (48x48px minimum)
- Safe area insets for notched devices

**Mobile Layout**:
```
┌────────────────────────────────────────────────────────────┐
│                     App Content                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  📊        🏦        💳        📈        ⚙️             │
│ Home    Accounts   Trans    Budgets  Settings              │
└────────────────────────────────────────────────────────────┘
```

**Active State**:
- Active icon: Green (#10b981)
- Inactive icons: Gray (#9ca3af)
- Active label: Bold

**Implementation**:
```tsx
import { BottomNav } from '@/components/finance/BottomNav';

<BottomNav />
```

---

## Responsive Behavior

### Breakpoints

Using Tailwind's default breakpoints:

```typescript
const breakpoints = {
  mobile: '< 768px',
  tablet: '768px - 1023px',
  desktop: '≥ 1024px',
};
```

### Layout Changes

**Mobile (&lt;768px)**:
```css
.sidebar { display: none; }
.bottom-nav { display: flex; }
.top-bar { padding: 1rem; }
```

**Tablet (768px-1023px)**:
```css
.sidebar {
  display: flex;
  width: 240px;
  /* Can collapse to icon-only */
}
.bottom-nav { display: none; }
```

**Desktop (≥1024px)**:
```css
.sidebar {
  display: flex;
  width: 280px;
  /* Always expanded */
}
.bottom-nav { display: none; }
```

### Sidebar Collapse (Tablet)

**Collapsed State**:
- Width: 64px
- Hide text labels
- Show icons only
- Tooltip on hover

```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<aside className={cn(
  'transition-all duration-300',
  isCollapsed ? 'w-16' : 'w-64'
)}>
  {/* Navigation items */}
</aside>
```

---

## Navigation Loading States

Implemented in Phase 6 for better UX during page transitions.

### Link Component with Loading

```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function NavLink({ href, children, icon: Icon }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    setIsNavigating(true);
    router.push(href);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="relative"
    >
      {isNavigating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
      <Icon className="w-5 h-5" />
      <span>{children}</span>
    </Link>
  );
}
```

### Top Bar Loading Indicator

Progress bar at top of page during navigation:

```tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timeout);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-[#10b981] z-50 animate-pulse" />
  );
}
```

---

## User Menu

### Desktop User Menu (Sidebar)

```tsx
<div className="border-t border-[#2a2a2a] p-4">
  <div className="flex items-center gap-3 mb-3">
    <Avatar>{user.name[0]}</Avatar>
    <div>
      <p className="font-medium text-white">{user.name}</p>
      <p className="text-sm text-gray-400">{user.email}</p>
    </div>
  </div>
  <button
    onClick={handleLogout}
    className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-[#1a1a1a] rounded-lg"
  >
    <LogOut className="w-4 h-4" />
    <span>Logout</span>
  </button>
</div>
```

### Mobile User Menu (TopBar Dropdown)

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Avatar />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>
      Logout
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Breadcrumb Navigation

For nested pages (e.g., Edit Budget):

```tsx
import { Breadcrumb } from '@/components/ui/Breadcrumb';

<Breadcrumb>
  <BreadcrumbItem href="/finance">Home</BreadcrumbItem>
  <BreadcrumbItem href="/finance/budgets">Budgets</BreadcrumbItem>
  <BreadcrumbItem active>Edit Budget</BreadcrumbItem>
</Breadcrumb>
```

**Renders as**:
```
Home > Budgets > Edit Budget
```

---

## Keyboard Navigation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g d` | Go to Dashboard |
| `g a` | Go to Accounts |
| `g t` | Go to Transactions |
| `g b` | Go to Budgets |
| `g s` | Go to Settings |
| `/` | Focus search |
| `Esc` | Close modals/menus |

**Implementation**:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // g key pressed
      if (e.key === 'g' && !gPressed) {
        gPressed = true;
        setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      // Second key after g
      if (gPressed) {
        switch (e.key) {
          case 'd': router.push('/finance'); break;
          case 'a': router.push('/finance/accounts'); break;
          case 't': router.push('/finance/transactions'); break;
          case 'b': router.push('/finance/budgets'); break;
          case 's': router.push('/finance/settings'); break;
        }
        gPressed = false;
      }

      // Focus search
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);
}
```

**Usage in Layout**:
```tsx
export default function FinanceLayout({ children }) {
  useKeyboardShortcuts();

  return <>{children}</>;
}
```

---

## Deep Linking

Support for deep links to specific resources:

**URLs**:
- `/finance/accounts/[accountId]` - View account details
- `/finance/transactions/[transactionId]` - View transaction details
- `/finance/budgets/edit/[budgetId]` - Edit budget

**Back Button**:
```tsx
import { useRouter } from 'next/navigation';

function BackButton() {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>
      <ArrowLeft className="w-5 h-5" />
      Back
    </button>
  );
}
```

---

## Navigation Guards

### Protected Routes

Redirect unauthenticated users to login:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/finance/login');
    }
  }, [user, loading, router]);

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  return children;
}
```

### Admin-Only Routes

```tsx
export function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user?.is_admin) return <Forbidden />;

  return children;
}
```

---

## Mobile Gestures

### Swipe Navigation (Future Enhancement)

Swipe gestures for mobile navigation:

```tsx
import { useSwipeable } from 'react-swipeable';

export function SwipeableLayout({ children }) {
  const router = useRouter();

  const handlers = useSwipeable({
    onSwipedLeft: () => router.push('/finance/accounts'),
    onSwipedRight: () => router.push('/finance/dashboard'),
    trackMouse: false,
    trackTouch: true,
  });

  return <div {...handlers}>{children}</div>;
}
```

---

## Accessibility

### ARIA Labels

```tsx
<nav aria-label="Main navigation">
  <Link href="/finance" aria-current={isActive ? 'page' : undefined}>
    Dashboard
  </Link>
</nav>
```

### Skip Links

Allow keyboard users to skip to main content:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

### Focus Management

Trap focus in mobile menu when open:

```tsx
import { Dialog } from '@headlessui/react';

<Dialog open={isMobileMenuOpen} onClose={closeMobileMenu}>
  <Dialog.Panel>
    {/* Mobile menu content */}
  </Dialog.Panel>
</Dialog>
```

---

## Performance Optimization

### Link Prefetching

Next.js prefetches links in viewport:

```tsx
<Link href="/finance/budgets" prefetch={true}>
  Budgets
</Link>
```

### Code Splitting

Lazy load navigation components:

```tsx
const BottomNav = dynamic(
  () => import('@/components/finance/BottomNav'),
  { ssr: false } // Only load on client
);
```

---

## Testing Navigation

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

test('highlights active link', () => {
  render(<Sidebar currentPath="/finance/budgets" />);
  const budgetsLink = screen.getByText('Budgets');
  expect(budgetsLink).toHaveClass('bg-[#10b981]');
});
```

### E2E Tests

```typescript
test('user can navigate to budgets page', async ({ page }) => {
  await page.goto('/finance');
  await page.click('text=Budgets');
  await expect(page).toHaveURL('/finance/budgets');
  await expect(page.locator('h1')).toContainText('Budgets');
});
```

---

## Future Enhancements

- [ ] Command palette (Cmd+K) for quick navigation
- [ ] Recent pages/searches in menu
- [ ] Customizable sidebar (reorder links)
- [ ] Contextual actions in top bar
- [ ] Persistent sidebar state (localStorage)
- [ ] Notification center in top bar
- [ ] Global search across all data
- [ ] Tour/onboarding for new users

## Related Documentation

- [Component Library](./overview.md)
