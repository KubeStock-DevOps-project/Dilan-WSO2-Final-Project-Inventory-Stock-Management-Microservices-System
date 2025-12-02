import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider as AsgardeoAuthProvider } from "@asgardeo/auth-react";
import { AuthProvider } from "./context/AsgardeoAuthContext";
import asgardeoConfig from "./config/asgardeo.config";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RootRedirect from "./components/auth/RootRedirect";

// Layouts
import DashboardLayout from "./layouts/DashboardLayout";

// Auth Pages (simplified - only Login needed, Asgardeo handles the rest)
import Login from "./pages/auth/Login";

// Dashboard Pages
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import WarehouseDashboard from "./pages/dashboards/WarehouseDashboard";
import SupplierDashboard from "./pages/dashboards/SupplierDashboard";

// Product Pages
import ProductList from "./pages/products/ProductList";
import ProductAdd from "./pages/products/ProductAdd";
import ProductEdit from "./pages/products/ProductEdit";
import CategoryList from "./pages/products/CategoryList";
import ProductLifecycle from "./pages/products/ProductLifecycle";
import PricingCalculator from "./pages/products/PricingCalculator";

// Inventory Pages
import InventoryDashboard from "./pages/inventory/InventoryDashboard";
import StockMovements from "./pages/inventory/StockMovements";
import StockAdjustment from "./pages/inventory/StockAdjustment";
import LowStockAlerts from "./pages/inventory/LowStockAlerts";

// Supplier Pages
import SupplierList from "./pages/suppliers/SupplierList";
import PurchaseOrders from "./pages/suppliers/PurchaseOrders";
import PurchaseRequests from "./pages/suppliers/PurchaseRequests";

// Order Pages
import OrderList from "./pages/orders/OrderList";
import OrderDetails from "./pages/orders/OrderDetails";
import OrderCreate from "./pages/orders/OrderCreate";

// System Pages
import HealthMonitoring from "./pages/system/HealthMonitoring";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AsgardeoAuthProvider config={asgardeoConfig}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: "#363636", color: "#fff" },
              success: { duration: 3000 },
            }}
          />

          <Routes>
            {/* Login - redirects to Asgardeo */}
            <Route path="/login" element={<Login />} />

            {/* Protected Dashboard Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboards */}
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/warehouse"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <WarehouseDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/supplier"
                element={
                  <ProtectedRoute allowedRoles={["admin", "supplier"]}>
                    <SupplierDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Products */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <ProductList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/add"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <ProductAdd />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <ProductEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/lifecycle"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <ProductLifecycle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/pricing"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <PricingCalculator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <CategoryList />
                  </ProtectedRoute>
                }
              />

              {/* Inventory */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <InventoryDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/movements"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <StockMovements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/adjust"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <StockAdjustment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/alerts"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <LowStockAlerts />
                  </ProtectedRoute>
                }
              />

              {/* Suppliers */}
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <SupplierList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <PurchaseOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-requests"
                element={
                  <ProtectedRoute allowedRoles={["supplier"]}>
                    <PurchaseRequests />
                  </ProtectedRoute>
                }
              />

              {/* Orders */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <OrderList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/create"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <OrderCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={["admin", "warehouse_staff"]}>
                    <OrderDetails />
                  </ProtectedRoute>
                }
              />

              {/* System */}
              <Route
                path="/health"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <HealthMonitoring />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Root redirect based on auth state */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </AsgardeoAuthProvider>
  );
}

export default App;
