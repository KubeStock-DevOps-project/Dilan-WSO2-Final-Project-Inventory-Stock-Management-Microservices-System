import { ArrowLeft, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { productService } from "../../services/productService";

const ProductEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    unit_price: "",
    category_id: "",
    size: "",
    color: "",
    lifecycle_state: "",
  });

  const fetchProduct = useCallback(async () => {
    try {
      setFetching(true);
      const [productRes, categoriesRes] = await Promise.all([
        productService.getProductById(id),
        productService.getAllCategories(),
      ]);
      const product = productRes.data;

      setFormData({
        name: product.name || "",
        description: product.description || "",
        sku: product.sku || "",
        unit_price: product.unit_price || "",
        category_id: product.category_id || "",
        size: product.size || "",
        color: product.color || "",
        lifecycle_state: product.lifecycle_state || "draft",
      });
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast.error("Failed to fetch product details");
      console.error("Error fetching product:", error);
      navigate("/products");
    } finally {
      setFetching(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

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
      // Prepare data - only basic info, lifecycle state is managed separately
      const productData = {
        name: formData.name,
        sku: formData.sku,
        unit_price: parseFloat(formData.unit_price) || 0,
        description: formData.description || "",
        category_id: formData.category_id
          ? parseInt(formData.category_id, 10)
          : null,
        size: formData.size || "",
        color: formData.color || "",
      };

      await productService.updateProduct(id, productData);
      toast.success("Product updated successfully");
      navigate("/products");
    } catch (error) {
      toast.error("Failed to update product");
      console.error("Error updating product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <LoadingSpinner text="Loading product details..." />;
  }

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
          <h1 className="text-3xl font-bold text-dark-900">Edit Product</h1>
          <p className="text-dark-600 mt-2">
            Update product information (use Product Lifecycle page to change
            status)
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

            <Input
              label="SKU"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              required
              placeholder="Enter SKU"
            />

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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Lifecycle State
              </label>
              <div className="flex items-center gap-2">
                <Badge
                  color={
                    formData.lifecycle_state === "active"
                      ? "green"
                      : formData.lifecycle_state === "draft"
                      ? "gray"
                      : "yellow"
                  }
                >
                  {formData.lifecycle_state}
                </Badge>
                <span className="text-sm text-gray-500">
                  (Managed via Product Lifecycle page)
                </span>
              </div>
            </div>

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
              Update Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductEdit;
