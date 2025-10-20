import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboard Pages
import AdminDashboard from './pages/dashboards/AdminDashboard';
import WarehouseDashboard from './pages/dashboards/WarehouseDashboard';
import SupplierDashboard from './pages/dashboards/SupplierDashboard';

// Product Pages
import ProductList from './pages/products/ProductList';
import ProductAdd from './pages/products/ProductAdd';
import ProductEdit from './pages/products/ProductEdit';
import CategoryList from './pages/products/CategoryList';

// Inventory Pages
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import StockMovements from './pages/inventory/StockMovements';
import StockAdjustment from './pages/inventory/StockAdjustment';

// Supplier Pages
import SupplierList from './pages/suppliers/SupplierList';
import PurchaseOrders from './pages/suppliers/PurchaseOrders';

// Order Pages
import OrderList from './pages/orders/OrderList';
import OrderDetails from './pages/orders/OrderDetails';

// System Pages
import HealthMonitoring from './pages/system/HealthMonitoring';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#F97316',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            {/* Dashboard Routes */}
            <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/warehouse" element={<ProtectedRoute allowedRoles={['admin', 'warehouse_staff']}><WarehouseDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/supplier" element={<ProtectedRoute allowedRoles={['admin', 'supplier']}><SupplierDashboard /></ProtectedRoute>} />

            {/* Product Routes */}
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/add" element={<ProtectedRoute allowedRoles={['admin', 'warehouse_staff']}><ProductAdd /></ProtectedRoute>} />
            <Route path="/products/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'warehouse_staff']}><ProductEdit /></ProtectedRoute>} />
            <Route path="/categories" element={<CategoryList />} />

            {/* Inventory Routes */}
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/inventory/movements" element={<StockMovements />} />
            <Route path="/inventory/adjust" element={<ProtectedRoute allowedRoles={['admin', 'warehouse_staff']}><StockAdjustment /></ProtectedRoute>} />

            {/* Supplier Routes */}
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />

            {/* Order Routes */}
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/:id" element={<OrderDetails />} />

            {/* System Routes */}
            <Route path="/health" element={<ProtectedRoute allowedRoles={['admin']}><HealthMonitoring /></ProtectedRoute>} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
