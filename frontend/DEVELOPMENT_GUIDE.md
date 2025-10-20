# Frontend Development Guide

## 📐 Architecture

The frontend follows a clean, modular architecture:

```
Component Hierarchy:
App
├── AuthProvider (Context)
├── Router
    ├── Public Routes (AuthLayout)
    │   ├── Login
    │   ├── Register
    │   └── ForgotPassword
    └── Protected Routes (DashboardLayout)
        ├── Sidebar
        ├── Navbar
        └── Page Content
```

## 🎨 Design System

### WSO2-Inspired Theme

Our design follows enterprise-grade WSO2 aesthetics:

**Primary Colors:**
```javascript
Orange: #F97316 (primary actions, accents)
Dark: #111827 (backgrounds, text)
White: #F9FAFB (cards, surfaces)
```

**Gradients:**
```css
bg-gradient-primary: 111827 → F97316
bg-gradient-dark: 111827 → 1F2937
bg-gradient-orange: F97316 → C2410C
```

### Component Library

All components are in `src/components/common/`:

#### Button
```jsx
<Button variant="primary" size="md" loading={false}>
  Click Me
</Button>
```

Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`
Sizes: `sm`, `md`, `lg`

#### Input
```jsx
<Input
  label="Email"
  type="email"
  error="Invalid email"
  helperText="Enter your email address"
/>
```

#### Card
```jsx
<Card hover className="p-6">
  Content here
</Card>
```

#### Badge
```jsx
<Badge variant="success">Active</Badge>
```

Variants: `default`, `primary`, `success`, `warning`, `danger`, `info`

## 🔄 State Management

### Auth Context

```jsx
const { user, login, logout, isAuthenticated, hasRole } = useAuth();

// Check authentication
if (isAuthenticated) { }

// Check role
if (hasRole('admin')) { }
if (hasRole(['admin', 'warehouse_staff'])) { }
```

### Zustand (Ready for Use)

Create stores in `src/stores/`:

```javascript
import { create } from 'zustand';

export const useProductStore = create((set) => ({
  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
}));
```

## 📡 API Integration

### Service Pattern

All API calls go through services in `src/services/`:

```javascript
// Example: productService.js
import axios from 'axios';

export const productService = {
  getAllProducts: async () => {
    const response = await axios.get('/api/products');
    return response.data;
  },
  
  createProduct: async (data) => {
    const response = await axios.post('/api/products', data);
    return response.data;
  },
};
```

### Using in Components

```jsx
import { productService } from '../../services/productService';
import toast from 'react-hot-toast';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await productService.getAllProducts();
      // Handle success
      toast.success('Data loaded');
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
};
```

## 🛣️ Adding New Routes

### 1. Create Page Component

```jsx
// src/pages/mymodule/MyPage.jsx
const MyPage = () => {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  );
};

export default MyPage;
```

### 2. Add Route to App.jsx

```jsx
import MyPage from './pages/mymodule/MyPage';

// Inside <Route element={<DashboardLayout />}>
<Route path="/my-page" element={<MyPage />} />

// With role protection
<Route 
  path="/my-page" 
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <MyPage />
    </ProtectedRoute>
  } 
/>
```

### 3. Add to Sidebar

```jsx
// src/components/layout/Sidebar.jsx
const menuItems = [
  {
    name: 'My Page',
    path: '/my-page',
    icon: YourIcon,
    roles: ['admin'],
  },
];
```

## 🎭 Animations with Framer Motion

```jsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## 📊 Charts with Recharts

```jsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';

const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 300 },
];

<LineChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Line type="monotone" dataKey="value" stroke="#F97316" />
</LineChart>
```

## 🔔 Notifications

```jsx
import toast from 'react-hot-toast';

// Success
toast.success('Operation successful!');

// Error
toast.error('Something went wrong');

// Loading
const toastId = toast.loading('Processing...');
// Later...
toast.success('Done!', { id: toastId });

// Custom
toast.custom((t) => (
  <div>Custom content</div>
));
```

## 🧪 Form Validation

```jsx
const validate = () => {
  const errors = {};
  
  if (!formData.email) {
    errors.email = 'Email is required';
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Email is invalid';
  }
  
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }
  
  return errors;
};

const handleSubmit = (e) => {
  e.preventDefault();
  const validationErrors = validate();
  
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  // Submit form
};
```

## 🎯 Best Practices

### 1. Component Structure
```jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const MyComponent = ({ prop1, prop2 }) => {
  // State
  const [state, setState] = useState(null);
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleClick = () => {};
  
  // Render
  return <div></div>;
};

MyComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default MyComponent;
```

### 2. Error Handling
```jsx
const [error, setError] = useState(null);

try {
  await apiCall();
} catch (err) {
  setError(err.response?.data?.error || 'An error occurred');
  toast.error(error);
  console.error('Error:', err);
}
```

### 3. Loading States
```jsx
const [loading, setLoading] = useState(false);

if (loading) {
  return <LoadingSpinner />;
}
```

### 4. Conditional Rendering
```jsx
{isAuthenticated && <UserMenu />}
{products.length > 0 ? <ProductList /> : <EmptyState />}
```

## 📦 Utility Functions

### Helpers (src/utils/helpers.js)

```jsx
import { formatCurrency, formatDate, truncateText } from '@/utils/helpers';

formatCurrency(1234.56); // "$1,234.56"
formatDate(new Date()); // "Jan 20, 2025"
truncateText("Long text...", 20); // "Long text..."
```

### Class Names
```jsx
import { cn } from '@/utils/helpers';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  'additional-classes'
)} />
```

## 🔒 Authentication Flow

1. User submits login form
2. `authService.login()` sends request to backend
3. Backend returns JWT token and user data
4. Token stored in localStorage
5. User redirected based on role
6. Protected routes check for valid token
7. Token added to all API requests via Axios interceptor
8. On 401 error, user logged out automatically

## 🌐 Environment Variables

```env
# API URLs
VITE_API_BASE_URL=http://localhost:3001
VITE_USER_SERVICE_URL=http://localhost:3001
VITE_PRODUCT_SERVICE_URL=http://localhost:3002

# App Config
VITE_APP_NAME=Inventory Management System
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_HEALTH_CHECKS=true
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 🚀 Performance Tips

1. **Lazy Loading**
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
```

2. **Memoization**
```jsx
const MemoizedComponent = React.memo(MyComponent);
```

3. **useCallback**
```jsx
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

4. **Code Splitting**
Vite handles this automatically!

## 🐛 Debugging

### React DevTools
Install React DevTools browser extension

### Console Logs
```jsx
console.log('Debug:', data);
console.error('Error:', error);
console.table(arrayData);
```

### Network Tab
Check API calls in browser DevTools Network tab

---

**Happy Coding!** 🎨
