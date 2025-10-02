# LeadFlip Navigation Structure

## Visual Navigation Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LeadFlip Navigation Bar                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [LeadFlip Logo]  |  PUBLIC LINKS  |  AUTH LINKS  |  ADMIN  |  [User Menu]  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

PUBLIC LINKS (Always Visible)
├── Home (/)
├── Post a Problem (/consumer)
├── For Businesses (/business)
├── Pricing (/pricing)
├── About (/about)
└── Contact (/contact)

AUTHENTICATED LINKS (Visible When Signed In)
├── Consumer Dashboard (/consumer/dashboard)
├── Business Dashboard (/business)
└── Business Settings (/business/settings) ⭐ NEW

ADMIN LINKS (Visible When role = "admin")
├── Admin Dashboard (/admin) [PRIMARY COLOR]
├── Users (/admin/users) [PRIMARY COLOR] ⭐ NEW
└── Audit Log (/admin/audit) [PRIMARY COLOR] ⭐ NEW
```

## Mobile Navigation Structure

```
┌─────────────────────────────────┐
│    [☰]  Mobile Menu             │
├─────────────────────────────────┤
│                                 │
│  PUBLIC SECTION                 │
│  ├─ 📞 Home                     │
│  ├─ 📞 Post a Problem           │
│  ├─ 💼 For Businesses           │
│  ├─ 💵 Pricing                  │
│  ├─ ℹ️  About                   │
│  └─ ✉️  Contact                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  AUTHENTICATED SECTION          │
│  ├─ 📊 Consumer Dashboard       │
│  ├─ 📊 Business Dashboard       │
│  └─ ⚙️  Business Settings      │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ADMIN SECTION                  │
│  ├─ 🛡️  Admin Dashboard         │
│  ├─ 👥 Users                    │
│  └─ 📄 Audit Log                │
│                                 │
└─────────────────────────────────┘
```

## Route Protection Matrix

| Route                  | Public | Auth Required | Admin Required | Component                |
|------------------------|--------|---------------|----------------|--------------------------|
| `/`                    | ✅     | ❌            | ❌             | Home Page                |
| `/about`               | ✅     | ❌            | ❌             | About Page               |
| `/contact`             | ✅     | ❌            | ❌             | Contact Page             |
| `/pricing`             | ✅     | ❌            | ❌             | Pricing Page             |
| `/consumer`            | ❌     | ✅            | ❌             | Lead Submission Form     |
| `/consumer/dashboard`  | ❌     | ✅            | ❌             | Consumer Dashboard       |
| `/business`            | ❌     | ✅            | ❌             | Business Dashboard       |
| `/business/settings`   | ❌     | ✅            | ❌             | Business Settings ⭐     |
| `/admin`               | ❌     | ✅            | ✅             | Admin Dashboard          |
| `/admin/users`         | ❌     | ✅            | ✅             | User Management ⭐       |
| `/admin/audit`         | ❌     | ✅            | ✅             | Audit Log Viewer ⭐      |

⭐ = Newly created route

## Admin Role Setup

### How to Set Admin Role in Clerk:

1. **Via Clerk Dashboard:**
   ```
   1. Go to https://dashboard.clerk.com
   2. Select your application
   3. Navigate to Users
   4. Click on user
   5. Scroll to "Public metadata"
   6. Add: {"role": "admin"}
   7. Save
   ```

2. **Via Clerk API:**
   ```javascript
   await clerkClient.users.updateUserMetadata(userId, {
     publicMetadata: {
       role: "admin"
     }
   });
   ```

3. **Detection in Code:**
   ```typescript
   const { user } = useUser()
   const isAdmin = user?.publicMetadata?.role === "admin"
   ```

## Confirmation Dialog Usage

### Component Location:
`/Volumes/Storage/Development/LegacyCall/src/components/ui/confirm-dialog.tsx`

### Props Interface:
```typescript
interface ConfirmDialogProps {
  open: boolean              // Controls dialog visibility
  onClose: () => void        // Called when dialog closes
  onConfirm: () => void      // Called when user confirms
  title: string              // Dialog title
  description: string        // Dialog description
  isDestructive?: boolean    // Red styling for destructive actions
  confirmText?: string       // Confirm button text (default: "Continue")
  cancelText?: string        // Cancel button text (default: "Cancel")
}
```

### Usage Patterns:

#### 1. Destructive Action (Delete, Remove, etc.)
```tsx
<ConfirmDialog
  open={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleDelete}
  title="Delete this item?"
  description="This action cannot be undone."
  isDestructive={true}
  confirmText="Delete"
  cancelText="Cancel"
/>
```

#### 2. Important Action (Logout, Submit, etc.)
```tsx
<ConfirmDialog
  open={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleLogout}
  title="Are you sure you want to logout?"
  description="You will need to sign in again."
  confirmText="Logout"
  cancelText="Stay Logged In"
/>
```

#### 3. Warning Action (Change Settings, etc.)
```tsx
<ConfirmDialog
  open={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleChange}
  title="Important Warning"
  description="This will affect your account settings."
  confirmText="I Understand"
  cancelText="Go Back"
/>
```

## Icon Reference

| Icon          | Purpose                  | Location              |
|---------------|--------------------------|----------------------|
| Phone         | Logo, Consumer links     | Navigation, Pages    |
| LayoutDashboard | Dashboards             | Navigation           |
| DollarSign    | Pricing                  | Navigation           |
| Info          | About                    | Navigation           |
| Mail          | Contact                  | Navigation           |
| Shield        | Admin Dashboard          | Navigation           |
| Settings      | Business Settings        | Navigation ⭐        |
| Users         | User Management          | Navigation ⭐        |
| FileText      | Audit Log                | Navigation ⭐        |

⭐ = Newly added icon

## Color Coding

- **Public Links**: `text-foreground/80` (gray)
- **Authenticated Links**: `text-foreground/80` (gray)
- **Admin Links**: `text-primary` (red/primary color)
- **Hover States**: `hover:text-foreground` or `hover:text-primary/80`

## Responsive Breakpoints

- **Desktop**: `md:flex` - Shows horizontal navigation bar
- **Mobile**: `md:hidden` - Shows hamburger menu
- **Mobile Menu Width**: `w-[300px] sm:w-[400px]`

## Testing Matrix

### ✅ Completed Tests

| Test Case                          | Status | Expected Result                          |
|------------------------------------|--------|------------------------------------------|
| Visit public routes (not signed in) | ✅    | Pages load without authentication        |
| Visit protected routes (not signed in) | ✅ | Redirect to Clerk sign-in               |
| Navigation shows public links      | ✅    | Always visible                           |
| Navigation shows auth links (signed in) | ✅ | Visible when authenticated              |
| Navigation hides auth links (signed out) | ✅ | Hidden when not authenticated          |
| Navigation shows admin links (admin role) | ✅ | Visible when role = "admin"           |
| Navigation hides admin links (no role) | ✅ | Hidden when role ≠ "admin"             |
| Mobile menu toggles correctly      | ✅    | Opens/closes on hamburger click          |
| Confirmation dialog opens/closes   | ✅    | Controlled by open prop                  |
| Confirmation dialog confirms action | ✅   | Calls onConfirm and closes              |
| Confirmation dialog cancels action | ✅    | Only closes, no callback                |
| Destructive styling applies        | ✅    | Red button when isDestructive=true       |

## Summary

### Created:
- ✅ 1 new reusable component (`ConfirmDialog`)
- ✅ 3 new page routes (`business/settings`, `admin/users`, `admin/audit`)
- ✅ 3 new navigation sections (properly organized)
- ✅ Admin role detection system
- ✅ Complete documentation

### Updated:
- ✅ Navigation component with all routes
- ✅ Added 3 new Lucide icons
- ✅ Mobile navigation structure

### Total Routes: 11
### Total Components: 1 new UI component
### Total Icons: 3 new icons
### Documentation Files: 3

**All routes are accessible and navigation is complete!** 🎉
