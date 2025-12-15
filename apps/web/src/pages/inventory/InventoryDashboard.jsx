import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiPackage,
  FiTrendingDown,
  FiTrendingUp,
} from "react-icons/fi";
import Badge from "../../components/common/Badge";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Table from "../../components/common/Table";
import { inventoryService } from "../../services/inventoryService";

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getAllInventory();
      const inventoryData = res.data || [];
      setInventory(inventoryData);

      // Calculate stats
      const totalItems = inventoryData.length;
      const lowStock = inventoryData.filter(
        (item) =>
          Number(item.available_quantity || 0) <=
            Number(item.reorder_level || 0) &&
          Number(item.available_quantity || 0) > 0
      ).length;
      const outOfStock = inventoryData.filter(
        (item) => Number(item.available_quantity || 0) === 0
      ).length;

      setStats({
        totalItems,
        lowStock,
        outOfStock,
        totalValue: inventoryData.reduce(
          (sum, item) =>
            sum +
            Number(item.available_quantity || 0) *
              parseFloat(item.unit_price || 0),
          0
        ),
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    if (Number(item.available_quantity || 0) === 0) {
      return { label: "Out of Stock", variant: "danger" };
    } else if (
      Number(item.available_quantity || 0) <= Number(item.reorder_level || 0)
    ) {
      return { label: "Low Stock", variant: "warning" };
    } else if (
      Number(item.available_quantity || 0) >=
      item.max_stock_level * 0.9
    ) {
      return { label: "Overstock", variant: "info" };
    } else {
      return { label: "In Stock", variant: "success" };
    }
  };

  const columns = [
    {
      header: "SKU",
      accessor: "sku",
      cell: (row) => (
        <span className="font-medium text-dark-900">{row.sku}</span>
      ),
    },
    {
      header: "Product ID",
      accessor: "product_id",
    },
    {
      header: "Location",
      accessor: "warehouse_location",
    },
    {
      header: "Available",
      accessor: "available_quantity",
      cell: (row) => (
        <span className="font-semibold text-primary">
          {row.available_quantity}
        </span>
      ),
    },
    {
      header: "Reserved",
      accessor: "reserved_quantity",
      cell: (row) => (
        <span className="text-dark-600">{row.reserved_quantity}</span>
      ),
    },
    {
      header: "Total",
      accessor: "quantity",
      cell: (row) => <span className="font-medium">{row.quantity}</span>,
    },
    {
      header: "Reorder Level",
      accessor: "reorder_level",
    },
    {
      header: "Max Stock",
      accessor: "max_stock_level",
    },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => {
        const status = getStockStatus(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-900 mb-8">
        Inventory Dashboard
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-600 text-sm mb-1">Total Items</p>
              <p className="text-3xl font-bold text-dark-900">
                {stats.totalItems}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <FiPackage size={24} className="text-primary" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-600 text-sm mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-warning">
                {stats.lowStock}
              </p>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <FiAlertTriangle size={24} className="text-warning" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-600 text-sm mb-1">Out of Stock</p>
              <p className="text-3xl font-bold text-danger">
                {stats.outOfStock}
              </p>
            </div>
            <div className="p-3 bg-danger/10 rounded-lg">
              <FiTrendingDown size={24} className="text-danger" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-600 text-sm mb-1">Total Value</p>
              <p className="text-3xl font-bold text-success">
                ${stats.totalValue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <FiTrendingUp size={24} className="text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-dark-900">
            Current Inventory
          </h2>
          <p className="text-dark-600 text-sm">
            Real-time stock levels across all warehouses
          </p>
        </div>
        <Table columns={columns} data={inventory} />
      </Card>
    </div>
  );
};

export default InventoryDashboard;
