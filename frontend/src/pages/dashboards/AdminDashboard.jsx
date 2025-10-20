import { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  TrendingUp, 
  AlertCircle,
  Activity,
  Box,
} from 'lucide-react';
import Card from '../../components/common/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    lowStockItems: 0,
    recentMovements: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [products, inventory] = await Promise.all([
        productService.getAllProducts(),
        inventoryService.getAllInventory(),
      ]);

      setStats({
        totalProducts: products.data?.length || 0,
        totalInventory: inventory.data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        lowStockItems: inventory.data?.filter(item => item.quantity < item.min_quantity).length || 0,
        recentMovements: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 2000 },
    { name: 'Apr', value: 2780 },
    { name: 'May', value: 1890 },
    { name: 'Jun', value: 2390 },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-900">Admin Dashboard</h1>
        <p className="text-dark-600 mt-2">Welcome back! Here's what's happening in your inventory.</p>
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
              <h3 className="text-3xl font-bold mt-2">{stats.totalInventory}</h3>
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
              <p className="text-sm opacity-90">Active Users</p>
              <h3 className="text-3xl font-bold mt-2">12</h3>
            </div>
            <Users size={40} className="opacity-80" />
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
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center">
            <Activity size={20} className="mr-2 text-primary" />
            Monthly Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
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
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center p-3 bg-dark-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                <Activity size={20} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-dark-900">Stock adjusted for Product #{item}</p>
                <p className="text-xs text-dark-500">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
