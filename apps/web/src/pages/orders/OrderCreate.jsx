import { useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import { orderService } from "../../services/orderService";

const OrderCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: "",
    total_amount: "",
    shipping_address: "",
    payment_method: "credit_card",
    payment_status: "pending",
    notes: "",
  });

  const [orderItems, setOrderItems] = useState([
    { product_id: "", sku: "", product_name: "", quantity: "", unit_price: "" },
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);

    // Auto-calculate total amount
    const total = newItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
    setFormData((prev) => ({ ...prev, total_amount: total.toFixed(2) }));
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: "",
        sku: "",
        product_name: "",
        quantity: "",
        unit_price: "",
      },
    ]);
  };

  const removeOrderItem = (index) => {
    if (orderItems.length > 1) {
      const newItems = orderItems.filter((_, i) => i !== index);
      setOrderItems(newItems);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customer_id || !formData.total_amount) {
      toast("Please fill in all required fields", { icon: "⚠️" });
      return;
    }

    const hasValidItems = orderItems.every(
      (item) =>
        item.product_id &&
        item.sku &&
        item.product_name &&
        item.quantity &&
        item.unit_price
    );
    if (!hasValidItems) {
      toast("Please complete all order item details", { icon: "⚠️" });
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        ...formData,
        customer_id: parseInt(formData.customer_id),
        total_amount: parseFloat(formData.total_amount),
        items: orderItems.map((item) => ({
          product_id: parseInt(item.product_id),
          sku: item.sku,
          product_name: item.product_name,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      };

      await orderService.createOrder(orderData);
      toast.success("Order created successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          <FiArrowLeft className="mr-2" /> Back
        </Button>
        <h1 className="text-3xl font-bold text-dark-900">Create New Order</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-dark-900 mb-4">
              Order Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer ID *"
                name="customer_id"
                type="number"
                value={formData.customer_id}
                onChange={handleInputChange}
                required
                placeholder="Enter customer ID"
              />
              <Input
                label="Total Amount *"
                name="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={handleInputChange}
                required
                disabled
                placeholder="Auto-calculated"
              />
              <div className="md:col-span-2">
                <Input
                  label="Shipping Address *"
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter shipping address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Payment Method
                </label>
                <select
                  name="payment_method"
                  className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                >
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="paypal">PayPal</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Payment Status
                </label>
                <select
                  name="payment_status"
                  className="w-full px-3 py-2 border border-dark-300 rounded-lg"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
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
                  placeholder="Additional order notes..."
                />
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card className="lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-dark-900">
                Order Items
              </h2>
              <Button type="button" size="sm" onClick={addOrderItem}>
                <FiPlus className="mr-2" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <Input
                    label="Product ID *"
                    type="number"
                    value={item.product_id}
                    onChange={(e) =>
                      handleItemChange(index, "product_id", e.target.value)
                    }
                    required
                    placeholder="Product ID"
                  />
                  <Input
                    label="SKU *"
                    type="text"
                    value={item.sku}
                    onChange={(e) =>
                      handleItemChange(index, "sku", e.target.value)
                    }
                    required
                    placeholder="SKU"
                  />
                  <Input
                    label="Product Name *"
                    type="text"
                    value={item.product_name}
                    onChange={(e) =>
                      handleItemChange(index, "product_name", e.target.value)
                    }
                    required
                    placeholder="Product Name"
                  />
                  <Input
                    label="Quantity *"
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    required
                    placeholder="Quantity"
                  />
                  <Input
                    label="Unit Price *"
                    type="number"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      handleItemChange(index, "unit_price", e.target.value)
                    }
                    required
                    placeholder="Price"
                  />
                  <div className="flex items-end">
                    <div className="w-full">
                      <label className="block text-sm font-medium text-dark-700 mb-2">
                        Subtotal
                      </label>
                      <div className="px-3 py-2 bg-white border border-dark-300 rounded-lg font-semibold">
                        $
                        {(
                          (parseFloat(item.quantity) || 0) *
                          (parseFloat(item.unit_price) || 0)
                        ).toFixed(2)}
                      </div>
                    </div>
                    {orderItems.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="ml-2"
                        onClick={() => removeOrderItem(index)}
                      >
                        <FiTrash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Submit */}
          <Card className="lg:col-span-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-dark-600">Total Order Amount:</p>
                <p className="text-3xl font-bold text-primary">
                  ${formData.total_amount || "0.00"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/orders")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;
