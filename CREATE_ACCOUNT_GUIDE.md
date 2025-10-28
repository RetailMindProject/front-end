# Create Account Implementation Guide

## Overview
I've implemented a reusable `CreateAccountForm` component that can be used in 3 different scenarios:
1. **CEO** can create: Inventory Manager, Store Manager, or Cashier accounts
2. **Store Manager** can create: Cashier accounts only
3. **Customer** can register: Customer account

## Files Created/Modified

### New Files
1. **`src/types/user.ts`** - Type definitions for user roles and form data
2. **`src/components/CreateAccountForm.tsx`** - The main reusable form component
3. **`src/pages/CreateAccountPage.tsx`** - Page for CEO and Store Manager to create accounts
4. **`src/examples/CreateAccountExamples.tsx`** - Usage examples
5. **`CREATE_ACCOUNT_GUIDE.md`** - This documentation

### Modified Files
1. **`src/pages/RegisterPage.tsx`** - Added alternative customer registration using CreateAccountForm
2. **`src/components/index.ts`** - Exported new components

## Component Structure

### CreateAccountForm Component
```tsx
<CreateAccountForm
  allowedRoles={UserRole[]}  // Roles that can be selected
  title?: string             // Optional title
  onSubmit?: (data: CreateAccountFormData) => void  // Custom submit handler
/>
```

### Form Fields
- **first_name** (required, text input)
- **last_name** (required, text input)
- **email** (required, email validation)
- **phone** (required, tel input)
- **address** (required, textarea)
- **role** (required, dropdown - only shown if multiple roles allowed)

### User Roles
```typescript
type UserRole = 'CUSTOMER' | 'CASHIER' | 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO';
```

## Usage Examples

### 1. CEO Creating Accounts (can create any role except CEO/Customer)
```tsx
import CreateAccountForm from '../components/CreateAccountForm';
import type { CreateAccountFormData } from '../types/user';

function CEOPage() {
  const handleSubmit = async (data: CreateAccountFormData) => {
    await fetch('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return (
    <CreateAccountForm
      allowedRoles={['INVENTORY_MANAGER', 'STORE_MANAGER', 'CASHIER']}
      title="Create Employee Account"
      onSubmit={handleSubmit}
    />
  );
}
```

### 2. Store Manager Creating Cashier Accounts
```tsx
function StoreManagerPage() {
  const handleSubmit = async (data: CreateAccountFormData) => {
    await fetch('/api/cashiers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return (
    <CreateAccountForm
      allowedRoles={['CASHIER']}
      title="Create Cashier Account"
      onSubmit={handleSubmit}
    />
  );
}
```

### 3. Customer Self-Registration
```tsx
function CustomerRegisterPage() {
  const handleSubmit = async (data: CreateAccountFormData) => {
    await fetch('/api/customers/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  };

  return (
    <CreateAccountForm
      allowedRoles={['CUSTOMER']}
      title="Create Your Account"
      onSubmit={handleSubmit}
    />
  );
}
```

## Features

### Validation
- All fields are required
- Email format validation
- Real-time error display
- Form submission is disabled during processing

### UI/UX
- Clean, modern design consistent with existing app
- Responsive layout
- Clear error messages
- Loading state during submission

### Flexibility
- Role dropdown only appears when multiple roles are allowed
- Single role scenario: role is auto-set and dropdown is hidden
- Custom submit handler for different API endpoints
- Optional title prop for customization

## Integration Steps

### Step 1: Add Routes (if using React Router)
```tsx
// In your router configuration
<Route path="/ceo/create-account" element={<CEOCreateAccountPage />} />
<Route path="/store-manager/create-cashier" element={<StoreManagerCreateCashierPage />} />
```

### Step 2: Connect to Backend API
Replace the `onSubmit` handler with your actual API calls:
```tsx
const handleSubmit = async (data: CreateAccountFormData) => {
  try {
    const response = await fetch('your-api-endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Failed to create account');
    
    // Handle success
    alert('Account created successfully');
  } catch (error) {
    // Handle error
    alert('Failed to create account');
  }
};
```

### Step 3: Add to Navigation
Add links/buttons in your navigation to access these pages:
```tsx
// For CEO
<Link to="/ceo/create-account">Create Employee</Link>

// For Store Manager  
<Link to="/store-manager/create-cashier">Create Cashier</Link>
```

## Page Components Available

From `src/pages/CreateAccountPage.tsx`:
- `<CreateAccountPage creatorRole="CEO" />` - For CEO
- `<CreateAccountPage creatorRole="STORE_MANAGER" />` - For Store Manager
- `<CEOCreateAccountPage />` - Convenience export for CEO
- `<StoreManagerCreateCashierPage />` - Convenience export for Store Manager

From `src/pages/RegisterPage.tsx`:
- `<Register />` - Original customer registration
- `<RegisterWithCreateAccountForm />` - Customer registration using CreateAccountForm

## Notes

1. **Password Field**: The current implementation doesn't include password fields as it's typically handled separately or via password reset emails.

2. **Address Field**: Uses a textarea for multi-line addresses.

3. **Phone Format**: Currently accepts any phone format. You may want to add country code validation if needed.

4. **Role Permissions**: The component only restricts which roles can be selected, not which roles can access which pages. You'll need to add authorization checks in your router/navigation logic.

5. **Styling**: Uses Tailwind CSS classes consistent with your existing design system (blue color scheme, rounded corners, etc.)

## Next Steps

1. **Connect to Backend**: Replace the mock `onSubmit` handlers with actual API calls
2. **Add Authentication**: Ensure only authorized users can access the create account pages
3. **Add Success/Error Feedback**: Implement toast notifications or success modals
4. **Add Password Management**: If passwords need to be set during account creation
5. **Add Email Verification**: If email verification is required

## Testing

To test the components, you can temporarily import them in your main.tsx:
```tsx
import { CEOCreateAccountPage } from './pages/CreateAccountPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CEOCreateAccountPage />
  </React.StrictMode>,
)
```

Or use the StoreManagerCreateCashierPage or RegisterWithCreateAccountForm for other scenarios.


