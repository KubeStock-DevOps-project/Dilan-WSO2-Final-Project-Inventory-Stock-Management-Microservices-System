import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import { useAuth } from "../../hooks/useAuth";
import { productService } from "../../services/productService";
import apiClient from "../../utils/axios";
import { API } from "../../utils/constants";

const ProductAdd = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    unit_price: "",
    category_id: "",
    size: "",
    color: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await productService.getAllCategories();
      setCategories(response?.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create product through lifecycle workflow (starts in DRAFT)
      const productData = {
        name: formData.name,
        unit_price: parseFloat(formData.unit_price),
        description: formData.description || "",
        category_id: formData.category_id
          ? parseInt(formData.category_id)
          : null,
        size: formData.size || "",
        color: formData.color || "",
        created_by: user?.sub || user?.email || "system",
      };

      await apiClient.post(API.product.lifecycle(), productData);
      toast.success(
        "Product created successfully in DRAFT state! It will need approval before activation."
      );
      navigate("/products/lifecycle");
    } catch (error) {
      toast.error("Failed to create product");
      console.error("Error creating product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/products")}
          className="mr-4"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Add New Product</h1>
          <p className="text-dark-600 mt-2">
            Create a new product (starts in DRAFT state for approval workflow)
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Product Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter product name"
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories?.length > 0 &&
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>

            <Input
              label="Unit Price"
              name="unit_price"
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={handleChange}
              required
              placeholder="0.00"
            />

            <Input
              label="Size"
              name="size"
              type="text"
              value={formData.size}
              onChange={handleChange}
              placeholder="e.g., Small, Medium, Large"
            />

            <Input
              label="Color"
              name="color"
              type="text"
              value={formData.color}
              onChange={handleChange}
              placeholder="e.g., Red, Blue, Green"
            />

            <div className="md:col-span-2">
              <Input
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter product description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/products")}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              <Save size={18} className="mr-2" />
              Save Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductAdd;
