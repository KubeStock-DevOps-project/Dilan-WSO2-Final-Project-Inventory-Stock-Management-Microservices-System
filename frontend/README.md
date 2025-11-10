# Inventory Management System - Frontend# React + Vite



## 🎨 OverviewThis template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.



Modern, responsive React frontend for the Inventory Management System with real-time updates, role-based dashboards, and comprehensive CRUD operations.Currently, two official plugins are available:



Built with:- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh

- **React 18** - Modern React with Hooks- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- **Vite** - Lightning-fast build tool

- **Tailwind CSS** - Utility-first styling## React Compiler

- **React Router v6** - Client-side routing

- **react-hot-toast** - Beautiful toast notificationsThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

- **Axios** - HTTP client

- **Context API** - Global state management## Expanding the ESLint configuration



## 📁 Project StructureIf you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


```
frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, fonts, icons
│   ├── components/        # Reusable components
│   │   ├── auth/         # Authentication components
│   │   ├── common/       # Common UI components
│   │   └── layout/       # Layout components (Navbar, Sidebar)
│   ├── context/          # React Context (AuthContext)
│   ├── layouts/          # Page layouts
│   ├── pages/            # Page components
│   │   ├── auth/        # Login, Register, ForgotPassword
│   │   ├── dashboards/  # Role-based dashboards
│   │   ├── inventory/   # Inventory management pages
│   │   ├── orders/      # Order management pages
│   │   ├── products/    # Product & category pages
│   │   ├── suppliers/   # Supplier & PO pages
│   │   └── system/      # System monitoring
│   ├── services/         # API service modules
│   ├── utils/            # Utilities (axios config, constants)
│   ├── App.jsx           # Main app component
│   ├── App.css           # Global styles
│   ├── main.jsx          # App entry point
│   └── index.css         # Tailwind imports
├── docs/                  # Documentation
├── scripts/              # Utility scripts
├── tests/                # Test files
├── .env.example          # Environment template
├── eslint.config.js      # ESLint configuration
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies & scripts
├── Dockerfile            # Docker image definition
├── nginx.conf            # Nginx server config
├── QUICKSTART.md         # Quick setup guide
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- Backend services running (see backend/README.md)

### Installation

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will open at **http://localhost:5173**

### Default Login Credentials

```
Email: admin@ims.com
Password: admin123
Role: Admin
```

## 🎯 Available Features

### Authentication & Authorization
- ✅ Login / Register / Logout
- ✅ JWT token management
- ✅ Protected routes
- ✅ Role-based access (Admin, Warehouse Staff, Supplier)
- ✅ Profile management

### Product Management
- ✅ Product CRUD operations
- ✅ Category management with auto-generated codes
- ✅ Product lifecycle workflow (Draft → Review → Approved → Active)
- ✅ Dynamic pricing calculator with discount tiers
- ✅ SKU-based inventory tracking

### Inventory Management
- ✅ Real-time stock dashboard with statistics
- ✅ Stock adjustment (In, Out, Damaged, Expired, Returns)
- ✅ Stock movement history
- ✅ Low stock alerts
- ✅ Reorder suggestions
- ✅ Stock reservation for orders
- ✅ Warehouse location tracking

### Order Management
- ✅ Order creation with product selection
- ✅ Order lifecycle (Pending → Confirmed → Processing → Shipped → Delivered)
- ✅ Order status tracking
- ✅ Order details view
- ✅ Customer information management

### Supplier Management
- ✅ Supplier CRUD operations
- ✅ Purchase order creation
- ✅ PO status workflow (Draft → Submitted → Approved → Received)
- ✅ Supplier ratings
- ✅ Payment terms tracking

### Dashboards
- ✅ **Admin Dashboard** - System overview, analytics, user management
- ✅ **Warehouse Dashboard** - Inventory status, stock movements, alerts
- ✅ **Supplier Dashboard** - PO management, delivery tracking

### UI Components
- ✅ Reusable Table component with sorting
- ✅ Button variants (primary, secondary, danger, success)
- ✅ Input fields with validation
- ✅ Card components
- ✅ Badge components for status display
- ✅ Loading spinners
- ✅ Toast notifications (success, error, warning)
- ✅ Responsive navigation with sidebar

## 📦 NPM Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Build
npm run build           # Production build
npm run preview         # Preview production build

# Linting
npm run lint            # Run ESLint
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```env
# API Base URLs
VITE_USER_SERVICE_URL=http://localhost:3001
VITE_PRODUCT_SERVICE_URL=http://localhost:3002
VITE_INVENTORY_SERVICE_URL=http://localhost:3003
VITE_SUPPLIER_SERVICE_URL=http://localhost:3004
VITE_ORDER_SERVICE_URL=http://localhost:3005

# App Configuration
VITE_APP_NAME=Inventory Management System
VITE_APP_VERSION=1.0.0
```

## 🎨 Component Patterns

### Functional Component with Hooks

```jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const MyComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.getData();
      setData(response.data);
      toast.success('Data loaded successfully');
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return <div>{/* JSX */}</div>;
};

export default MyComponent;
```

### API Service Pattern

```javascript
// src/services/productService.js
import axios from '../utils/axios';

export const productService = {
  getAll: () => axios.get('/api/products'),
  getById: (id) => axios.get(`/api/products/${id}`),
  create: (data) => axios.post('/api/products', data),
  update: (id, data) => axios.put(`/api/products/${id}`, data),
  delete: (id) => axios.delete(`/api/products/${id}`)
};
```

## 🛡️ Authentication

### Using Auth Context

```javascript
import { useAuth } from './context/AuthContext';

const MyComponent = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Protected Routes

```jsx
import { ProtectedRoute } from './components/auth/ProtectedRoute';

<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardLayout />
  </ProtectedRoute>
} />
```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Fast setup for new developers
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Detailed development workflow
- **[Test Documentation](tests/README.md)** - Testing setup and guidelines
- **[Scripts Documentation](scripts/README.md)** - Utility scripts reference

## 🗂️ Folder Organization

- **`/src`** - Application source code
- **`/docs`** - Project documentation
- **`/scripts`** - Utility scripts for development
- **`/tests`** - Test files and test utilities
- **`/public`** - Static assets

## 🐳 Docker Deployment

### Build Docker Image

```bash
docker build -t ims-frontend .
```

### Run Container

```bash
docker run -d -p 80:80 --name ims-frontend ims-frontend
```

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173 (Windows)
npsh kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

### Module Not Found

```bash
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
```

### Build Errors

```bash
# Check Node version (should be 18+)
node --version

# Clear Vite cache
Remove-Item -Recurse -Force node_modules/.vite

# Rebuild
npm run build
```

## 🛠️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Library |
| Vite | 7.1.11 | Build Tool |
| React Router | 6.x | Routing |
| Tailwind CSS | 3.x | Styling |
| react-hot-toast | 2.4.1 | Notifications |
| Axios | 1.x | HTTP Client |
| ESLint | 9.x | Code Linting |

## 🔒 Security Best Practices

- ✅ JWT stored securely in AuthContext
- ✅ Protected routes with authentication checks
- ✅ Input validation on all forms
- ✅ XSS protection with React's automatic escaping
- ✅ HTTPS in production
- ✅ CORS configuration

## 🤝 Contributing

1. Create feature branch
2. Follow existing component patterns
3. Write meaningful commit messages
4. Test thoroughly before PR
5. Update documentation as needed

## 📝 License

ISC

## 📧 Support

For issues and questions, please open an issue in the repository.

---

**Frontend Version**: 1.0.0  
**Last Updated**: November 10, 2025
