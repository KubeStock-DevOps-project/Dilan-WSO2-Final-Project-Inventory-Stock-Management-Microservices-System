import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPackage, FiSave, FiX } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { inventoryService } from "../../services/inventoryService";
import { productService } from "../../services/productService";

const StockAdjustment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [inventory, setInventory] = useState(null);
  const [formData, setFormData] = useState({
    quantity: "",
    warehouse_location: "",
    reorder_level: "",
    max_stock_level: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Pre-select product if passed via navigation state
  useEffect(() => {
    if (location.state?.productId && products.length > 0) {
      const productId = location.state.productId.toString();
      // Fetch inventory for this product
      fetchInventoryForProduct(productId);
    }
  }, [location.state, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getAllProducts();
      const activeProducts = (res.data || []).filter(
        (p) => p.lifecycle_state === "active"
      );
      setProducts(activeProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryForProduct = async (productId) => {
    setSelectedProduct(productId);

    if (!productId) {
      setInventory(null);
      setFormData({
        quantity: "",
        warehouse_location: "",
        reorder_level: "",
        max_stock_level: "",
      });
      return;
    }

    // Fetch inventory for selected product
    try {
      const res = await inventoryService.getInventoryByProduct(productId);
      if (res.success && res.data) {
        setInventory(res.data);
        setFormData({
          quantity: res.data.quantity || 0,
          warehouse_location: res.data.warehouse_location || "",
          reorder_level: res.data.reorder_level || 20,
          max_stock_level: res.data.max_stock_level || 500,
        });
      } else {
        // No inventory exists yet
        setInventory(null);
        toast.info("No inventory record found. Creating new record.");
        setFormData({
          quantity: 0,
          warehouse_location: "",
          reorder_level: 20,
          max_stock_level: 500,
        });
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      // Inventory might not exist yet - that's okay
      setInventory(null);
      setFormData({
        quantity: "",
        warehouse_location: "",
        reorder_level: 20,
        max_stock_level: 500,
      });
    }
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    fetchInventoryForProduct(productId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    const selectedProductData = products.find(
      (p) => p.id === parseInt(selectedProduct)
    );

    try {
      setSubmitting(true);

      const updateData = {
        quantity: parseInt(formData.quantity) || 0,
        warehouse_location: formData.warehouse_location || "",
        reorder_level: parseInt(formData.reorder_level) || 20,
        max_stock_level: parseInt(formData.max_stock_level) || 500,
      };

      if (inventory) {
        // Update existing inventory
        await inventoryService.updateInventory(inventory.id, updateData);
      } else {
        // Create new inventory
        const createData = {
          product_id: parseInt(selectedProduct),
          sku: selectedProductData?.sku || "",
          ...updateData,
        };
        await inventoryService.createInventory(createData);
      }

      // Refresh inventory data for selected product
      try {
        const refreshRes = await inventoryService.getInventoryByProduct(
          selectedProduct
        );
        if (refreshRes.success && refreshRes.data) {
          setInventory(refreshRes.data);
          setFormData({
            quantity: refreshRes.data.quantity || 0,
            warehouse_location: refreshRes.data.warehouse_location || "",
            reorder_level: refreshRes.data.reorder_level || 20,
            max_stock_level: refreshRes.data.max_stock_level || 500,
          });
        }
      } catch (err) {
        console.error("Error refreshing inventory:", err);
      }

      // Show success message with option to continue or go back
      toast.success(
        `${
          inventory ? "Updated" : "Created"
        } successfully! You can adjust another product or view the dashboard.`,
        { duration: 3000 }
      );
    } catch (error) {
      console.error("Error updating inventory:", error);
      const errorMsg =
        error?.response?.data?.message || "Failed to update inventory";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-900">Stock Adjustment</h1>
        <p className="text-dark-600 mt-2">
          Update inventory quantities and warehouse settings
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-2">
              Select Product *
            </label>
            <select
              value={selectedProduct}
              onChange={handleProductChange}
              className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">-- Choose a product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) - Current:{" "}
                  {product.quantity || "N/A"}
                </option>
              ))}
            </select>
            <p className="text-sm text-dark-500 mt-1">
              Only active products are shown
            </p>
          </div>

          {selectedProduct && (
            <>
              {/* Current Status */}
              {inventory && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FiPackage /> Current Inventory Status
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-dark-600">Total Quantity</p>
                      <p className="font-semibold text-dark-900">
                        {inventory.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-600">Reserved</p>
                      <p className="font-semibold text-dark-900">
                        {inventory.reserved_quantity || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-600">Available</p>
                      <p className="font-semibold text-success">
                        {(inventory.quantity || 0) -
                          (inventory.reserved_quantity || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-600">Location</p>
                      <p className="font-semibold text-dark-900">
                        {inventory.warehouse_location || "Not set"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Adjustment Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    New Total Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 100"
                    required
                  />
                  <p className="text-sm text-dark-500 mt-1">
                    Total stock quantity in warehouse
                  </p>
                </div>

                {/* Warehouse Location */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    name="warehouse_location"
                    value={formData.warehouse_location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., A-15-B, Aisle 3"
                  />
                  <p className="text-sm text-dark-500 mt-1">
                    Physical location in warehouse
                  </p>
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    value={formData.reorder_level}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 20"
                    required
                  />
                  <p className="text-sm text-dark-500 mt-1">
                    Alert when stock falls below this level
                  </p>
                </div>

                {/* Max Stock Level */}
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Max Stock Level *
                  </label>
                  <input
                    type="number"
                    name="max_stock_level"
                    value={formData.max_stock_level}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 500"
                    required
                  />
                  <p className="text-sm text-dark-500 mt-1">
                    Maximum storage capacity
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2"
                  >
                    <FiSave />
                    {submitting
                      ? "Saving..."
                      : inventory
                      ? "Update Inventory"
                      : "Create Inventory"}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSelectedProduct("");
                      setInventory(null);
                      setFormData({
                        quantity: "",
                        warehouse_location: "",
                        reorder_level: "",
                        max_stock_level: "",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <FiX />
                    Clear Form
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/inventory")}
                  className="flex items-center gap-2"
                >
                  <FiPackage />
                  View Dashboard
                </Button>
              </div>
            </>
          )}

          {!selectedProduct && (
            <div className="text-center py-12 text-dark-500">
              <FiPackage size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a product to adjust its inventory</p>
            </div>
          )}
        </form>
      </Card>

      {/* Quick Guide */}
      <Card className="mt-6">
        <h3 className="font-semibold text-dark-900 mb-3">Quick Guide</h3>
        <ul className="space-y-2 text-sm text-dark-600">
          <li>
            • <strong>Quantity:</strong> Total stock available in warehouse
          </li>
          <li>
            • <strong>Reserved Quantity:</strong> Stock reserved for pending
            orders (auto-managed)
          </li>
          <li>
            • <strong>Available:</strong> Quantity - Reserved (can be ordered)
          </li>
          <li>
            • <strong>Reorder Level:</strong> Low stock alert threshold
          </li>
          <li>
            • <strong>Max Stock Level:</strong> Maximum warehouse capacity
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default StockAdjustment;
