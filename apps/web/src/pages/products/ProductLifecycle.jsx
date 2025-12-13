import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { productService } from "../../services/productService";
import apiClient from "../../utils/axios";
import { API } from "../../utils/constants";

const ProductLifecycleManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [products, setProducts] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [lifecycleStats, setLifecycleStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    unit_price: "",
    description: "",
    size: "",
    color: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, pendingRes, productsRes, categoriesRes] =
        await Promise.all([
          productService.getProductLifecycleStats(),
          productService.getPendingApprovals(),
          productService.getAllProducts(),
          productService.getAllCategories(),
        ]);

      setLifecycleStats(statsRes.data || {});
      setPendingApprovals(pendingRes.data || []);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(API.product.lifecycle(), {
        ...formData,
        category_id: formData.category_id
          ? parseInt(formData.category_id)
          : null,
        unit_price: parseFloat(formData.unit_price),
        created_by: user?.sub || user?.email || "system",
      });
      toast.success("Product created successfully in DRAFT state!");
      setShowCreateModal(false);
      setFormData({
        name: "",
        category_id: "",
        unit_price: "",
        description: "",
        size: "",
        color: "",
      });
      fetchData();
    } catch (error) {
      toast.error("Error creating product: " + error.response?.data?.message);
    }
  };

  const handleTransition = async (productId, action) => {
    try {
      await apiClient.post(API.product.transition(productId, action), {
        userId: user?.sub || user?.email || "system",
        notes: `${action.replace(/-/g, " ")} by ${user?.username || "admin"}`,
      });
      toast.success(`Product ${action} successfully!`);
      fetchData();
    } catch (error) {
      toast.error(`Error: ${error.response?.data?.message}`);
    }
  };

  const viewHistory = async (product) => {
    try {
      const res = await apiClient.get(API.product.lifecycleHistory(product.id));
      setHistory(res.data.data || []);
      setSelectedProduct(product);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error("Error fetching history: " + error.message);
    }
  };

  const getStateColor = (state) => {
    const colors = {
      draft: "gray",
      pending_approval: "yellow",
      approved: "blue",
      active: "green",
      discontinued: "red",
      archived: "gray",
    };
    return colors[state] || "gray";
  };

  const getAvailableActions = (state) => {
    const allActions = {
      draft: ["submit-for-approval"],
      pending_approval: ["approve"],
      approved: ["activate"],
      active: ["discontinue"],
      discontinued: ["activate", "archive"],
    };

    const actions = allActions[state] || [];

    // Filter actions based on role
    // Only admins can perform lifecycle actions (approve, activate, discontinue, archive)
    // Warehouse staff can only create drafts and submit for approval (handled in creation flow)
    if (!isAdmin) {
      return [];
    }

    return actions;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Product Lifecycle Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage products through approval workflow
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Create Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {Object.entries(lifecycleStats).map(([state, count]) => (
          <Card key={state} className="p-4">
            <div className="text-sm text-gray-600 capitalize">
              {state.replace(/_/g, " ")}
            </div>
            <div className="text-2xl font-bold mt-1">{count}</div>
          </Card>
        ))}
      </div>

      {/* Pending Approvals - Admin Only */}
      {isAdmin && pendingApprovals.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              Pending Approvals ({pendingApprovals.length})
            </h2>
            <div className="space-y-3">
              {pendingApprovals.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      SKU: {product.sku} | Category: {product.category_name}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleTransition(product.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => viewHistory(product)}
                    >
                      View History
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* All Products */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">All Products</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.category_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{product.sku}</td>
                    <td className="px-6 py-4 text-sm">
                      ${parseFloat(product.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={getStateColor(product.lifecycle_state)}>
                        {product.lifecycle_state}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {getAvailableActions(product.lifecycle_state).map(
                          (action) => (
                            <Button
                              key={action}
                              size="sm"
                              onClick={() =>
                                handleTransition(product.id, action)
                              }
                            >
                              {action.replace(/-/g, " ")}
                            </Button>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => viewHistory(product)}
                        >
                          History
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Create New Product (Draft)
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <Input
                  label="Product Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Unit Price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({ ...formData, unit_price: e.target.value })
                  }
                  required
                />
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
                <Input
                  label="Size (optional)"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                />
                <Input
                  label="Color (optional)"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Product</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Lifecycle History: {selectedProduct?.name}
              </h2>
              <div className="space-y-3">
                {history.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          {event.old_state ? (
                            <>
                              <Badge color={getStateColor(event.old_state)}>
                                {event.old_state}
                              </Badge>
                              <span className="mx-2">→</span>
                              <Badge color={getStateColor(event.new_state)}>
                                {event.new_state}
                              </Badge>
                            </>
                          ) : (
                            <Badge color={getStateColor(event.new_state)}>
                              {event.new_state}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {event.notes}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 text-right">
                        <div>User ID: {event.changed_by}</div>
                        <div>{new Date(event.changed_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowHistoryModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductLifecycleManagement;
