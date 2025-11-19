import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import Input from "../../components/common/Input";
import { supplierService } from "../../services/supplierService";
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiStar } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const PurchaseOrders = () => {
  const { user } = useAuth();
  const canManagePO =
    user?.role === "admin" || user?.role === "warehouse_staff";
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedPOForRating, setSelectedPOForRating] = useState(null);
  const [editingPO, setEditingPO] = useState(null);
  const [filter, setFilter] = useState({ status: "", supplier_id: "" });
  const [ratingData, setRatingData] = useState({
    rating: 5,
    quality_rating: 5,
    delivery_rating: 5,
    communication_rating: 5,
    comments: "",
  });
  const [formData, setFormData] = useState({
    supplier_id: "",
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery_date: "",
    total_amount: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poResponse, supplierResponse] = await Promise.all([
        supplierService.getAllPurchaseOrders(),
        supplierService.getAllSuppliers(),
      ]);
      setPurchaseOrders(poResponse.data || []);
      setSuppliers(supplierResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.supplier_id) params.supplier_id = filter.supplier_id;

      const response = await supplierService.getAllPurchaseOrders(params);
      setPurchaseOrders(response.data || []);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery_date: "",
      total_amount: "",
      status: "draft",
      notes: "",
    });
    setEditingPO(null);
    setShowAddModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const poData = {
        ...formData,
        supplier_id: parseInt(formData.supplier_id),
        total_amount: parseFloat(formData.total_amount),
      };

      if (editingPO) {
        await supplierService.updatePurchaseOrder(editingPO.id, poData);
        toast.success("Purchase order updated successfully!");
      } else {
        await supplierService.createPurchaseOrder(poData);
        toast.success("Purchase order created successfully!");
      }
      resetForm();
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error saving purchase order:", error);
      toast.error(
        error.response?.data?.message || "Failed to save purchase order"
      );
    }
  };

  const handleEdit = (po) => {
    setEditingPO(po);
    setFormData({
      supplier_id: po.supplier_id,
      order_date: po.order_date?.split("T")[0] || "",
      expected_delivery_date: po.expected_delivery_date?.split("T")[0] || "",
      total_amount: po.total_amount,
      status: po.status,
      notes: po.notes || "",
    });
    setShowAddModal(true);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      // If marking as received, use the special endpoint that updates inventory
      if (newStatus === "received") {
        await fetch(`http://localhost:3004/api/purchase-orders/${id}/receive`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            notes: "Shipment received by warehouse",
          }),
        });
        toast.success("Order received! Inventory has been updated.");
      } else {
        await supplierService.updatePOStatus(id, newStatus);
        toast.success(`Status updated to ${newStatus}`);
      }
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this purchase order?")
    ) {
      try {
        await supplierService.deletePurchaseOrder(id);
        fetchPurchaseOrders();
      } catch (error) {
        console.error("Error deleting purchase order:", error);
        toast.error("Failed to delete purchase order");
      }
    }
  };

  const handleRateSupplier = (po) => {
    setSelectedPOForRating(po);
    setRatingData({
      rating: 5,
      quality_rating: 5,
      delivery_rating: 5,
      communication_rating: 5,
      comments: "",
    });
    setShowRatingModal(true);
  };

  const submitRating = async (e) => {
    e.preventDefault();
    try {
      await supplierService.createSupplierRating(
        selectedPOForRating.supplier_id,
        {
          purchase_order_id: selectedPOForRating.id,
          ...ratingData,
        }
      );
      toast.success("Supplier rated successfully!");
      setShowRatingModal(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error("Error rating supplier:", error);
      toast.error(error.response?.data?.message || "Failed to rate supplier");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      approved: "info",
      ordered: "primary",
      received: "success",
      cancelled: "danger",
      confirmed: "info",
      shipped: "primary",
      rejected: "danger",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.name : `Supplier #${supplierId}`;
  };

  const columns = [
    {
      header: "PO ID",
      accessor: "id",
      render: (row) => `PO-${row.id}`,
    },
    {
      header: "Supplier",
      accessor: "supplier_id",
      render: (row) => (
        <span className="font-semibold">
          {getSupplierName(row.supplier_id)}
        </span>
      ),
    },
    {
      header: "Order Date",
      accessor: "order_date",
      render: (row) => new Date(row.order_date).toLocaleDateString(),
    },
    {
      header: "Expected Delivery",
      accessor: "expected_delivery_date",
      render: (row) =>
        row.expected_delivery_date
          ? new Date(row.expected_delivery_date).toLocaleDateString()
          : "N/A",
    },
    {
      header: "Total Amount",
      accessor: "total_amount",
      render: (row) => `$${parseFloat(row.total_amount).toFixed(2)}`,
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            <FiEdit className="mr-1" /> Edit
          </Button>
          {row.status === "confirmed" && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleStatusUpdate(row.id, "preparing")}
            >
              Mark Preparing
            </Button>
          )}
          {row.status === "shipped" && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleStatusUpdate(row.id, "received")}
            >
              Confirm Receipt
            </Button>
          )}
          {row.status === "received" && canManagePO && (
            <Button
              size="sm"
              variant="warning"
              onClick={() => handleRateSupplier(row)}
            >
              <FiStar className="mr-1" /> Rate
            </Button>
          )}
          {canManagePO && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDelete(row.id)}
            >
              <FiTrash2 />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-dark-900">Purchase Orders</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FiFilter className="mr-2" /> Filters
          </Button>
          {canManagePO && (
            <Button onClick={() => setShowAddModal(true)}>
              <FiPlus className="mr-2" /> Create PO
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                value={filter.status}
                onChange={(e) =>
                  setFilter({ ...filter, status: e.target.value })
                }
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-2">
                Supplier
              </label>
              <select
                className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                value={filter.supplier_id}
                onChange={(e) =>
                  setFilter({ ...filter, supplier_id: e.target.value })
                }
              >
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchPurchaseOrders} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <p className="text-dark-600">
            Total Purchase Orders:{" "}
            <span className="font-semibold">{purchaseOrders.length}</span>
          </p>
        </div>
        <Table columns={columns} data={purchaseOrders} />
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">
              {editingPO ? "Edit Purchase Order" : "Create Purchase Order"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {canManagePO && (
                  <div>
                    <label className="block text-sm font-medium text-dark-700 mb-2">
                      Supplier *
                    </label>
                    <select
                      name="supplier_id"
                      className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {canManagePO && (
                  <Input
                    label="Total Amount *"
                    name="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                  />
                )}
                {canManagePO && (
                  <Input
                    label="Order Date *"
                    name="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={handleInputChange}
                    required
                  />
                )}
                <Input
                  label="Expected Delivery Date"
                  name="expected_delivery_date"
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={handleInputChange}
                />
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-dark-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                    rows="3"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPO
                    ? "Update Purchase Order"
                    : "Create Purchase Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-lg w-full m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Rate Supplier</h2>
              <form onSubmit={submitRating}>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">PO:</span>{" "}
                    {selectedPOForRating?.po_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Supplier:</span>{" "}
                    {getSupplierName(selectedPOForRating?.supplier_id)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Overall Rating (1-5 stars)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setRatingData({ ...ratingData, rating: star })
                          }
                          className={`text-3xl ${
                            star <= ratingData.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Product Quality (1-5 stars)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setRatingData({
                              ...ratingData,
                              quality_rating: star,
                            })
                          }
                          className={`text-2xl ${
                            star <= ratingData.quality_rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Delivery Timeliness (1-5 stars)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setRatingData({
                              ...ratingData,
                              delivery_rating: star,
                            })
                          }
                          className={`text-2xl ${
                            star <= ratingData.delivery_rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Communication (1-5 stars)
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setRatingData({
                              ...ratingData,
                              communication_rating: star,
                            })
                          }
                          className={`text-2xl ${
                            star <= ratingData.communication_rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={ratingData.comments}
                      onChange={(e) =>
                        setRatingData({
                          ...ratingData,
                          comments: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="3"
                      placeholder="Share your experience with this supplier..."
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRatingModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Submit Rating</Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
