import { useState, useEffect } from "react";
import {
  Package,
  TrendingUp,
  AlertCircle,
  Activity,
  Box,
  ShoppingCart,
} from "lucide-react";
import Card from "../../components/common/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { productService } from "../../services/productService";
import { inventoryService } from "../../services/inventoryService";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    lowStockItems: 0,
    activeCategories: 0,
  });
  const [stockMovements, setStockMovements] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [products, inventory, categories, movements] = await Promise.all([
        productService.getAllProducts(),
        inventoryService.getAllInventory(),
        productService.getAllCategories().catch(() => ({ data: [] })),
        inventoryService
          .getStockMovements({ limit: 6 })
          .catch(() => ({ data: [] })),
      ]);

      // Calculate stats
      setStats({
        totalProducts: products.data?.length || 0,
        totalInventory:
          inventory.data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        lowStockItems:
          inventory.data?.filter((item) => item.quantity < item.min_quantity)
            .length || 0,
        activeCategories: categories.data?.length || 0,
      });

      // Process stock movements for chart
      if (movements.data && movements.data.length > 0) {
        const movementsByMonth = {};
        movements.data.forEach((movement) => {
          const month = new Date(movement.created_at).toLocaleDateString(
            "en-US",
            { month: "short" }
          );
          movementsByMonth[month] =
            (movementsByMonth[month] || 0) + Math.abs(movement.quantity);
        });
        setStockMovements(
          Object.entries(movementsByMonth).map(([name, value]) => ({
            name,
            value,
          }))
        );
      } else {
        // Default data
        setStockMovements([
          { name: "Jan", value: 4000 },
          { name: "Feb", value: 3000 },
          { name: "Mar", value: 2000 },
          { name: "Apr", value: 2780 },
          { name: "May", value: 1890 },
          { name: "Jun", value: 2390 },
        ]);
      }

      // Process category data for chart
      if (products.data && products.data.length > 0) {
        const categoryCounts = {};
        products.data.forEach((product) => {
          const category = product.category_name || "Uncategorized";
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        setCategoryData(
          Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value,
          }))
        );
      } else {
        setCategoryData([
          { name: "Electronics", value: 12 },
          { name: "Clothing", value: 8 },
          { name: "Food", value: 15 },
        ]);
      }

      // Recent activities
      if (movements.data && movements.data.length > 0) {
        setRecentActivities(
          movements.data.slice(0, 3).map((movement) => ({
            type: movement.movement_type,
            product: `Product #${movement.product_id}`,
            quantity: movement.quantity,
            time: new Date(movement.created_at).toLocaleTimeString(),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-900">Admin Dashboard</h1>
        <p className="text-dark-600 mt-2">
          Welcome back! Here's what's happening in your inventory.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-primary text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Products</p>
              <h3 className="text-3xl font-bold mt-2">{stats.totalProducts}</h3>
            </div>
            <Package size={40} className="opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-dark text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Inventory</p>
              <h3 className="text-3xl font-bold mt-2">
                {stats.totalInventory}
              </h3>
            </div>
            <Box size={40} className="opacity-80" />
          </div>
        </Card>

        <Card className="bg-gradient-orange text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Low Stock Items</p>
              <h3 className="text-3xl font-bold mt-2">{stats.lowStockItems}</h3>
            </div>
            <AlertCircle size={40} className="opacity-80" />
          </div>
        </Card>

        <Card className="bg-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Categories</p>
              <h3 className="text-3xl font-bold mt-2">{stats.activeCategories}</h3>
            </div>
            <ShoppingCart size={40} className="opacity-80" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center">
            <TrendingUp size={20} className="mr-2 text-primary" />
            Stock Movements
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stockMovements}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F97316"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center">
            <Activity size={20} className="mr-2 text-primary" />
            Products by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-semibold text-dark-900 mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center p-3 bg-dark-50 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                  <Activity size={20} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-dark-900">
                    {activity.type === "IN"
                      ? "Stock Added"
                      : activity.type === "OUT"
                      ? "Stock Removed"
                      : "Stock Adjusted"}
                    : {activity.product} ({Math.abs(activity.quantity)} units)
                  </p>
                  <p className="text-xs text-dark-500">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-dark-500 py-4">
              No recent activities
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
