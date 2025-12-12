import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    unit_price: "",
    category_id: "",
    size: "",
    color: "",
    is_active: true,
  });

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setFetching(true);
      const response = await productService.getProductById(id);
      const product = response.data;

      setFormData({
        name: product.name || "",
        description: product.description || "",
        sku: product.sku || "",
        unit_price: product.unit_price || "",
        category_id: product.category_id || "",
        size: product.size || "",
        color: product.color || "",
        is_active: product.is_active ?? true,
      });
    } catch (error) {
      toast.error("Failed to fetch product details");
      console.error("Error fetching product:", error);
      navigate("/products");
    } finally {
      setFetching(false);
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
      // Prepare data
      const productData = {
        name: formData.name,
        sku: formData.sku,
        unit_price: parseFloat(formData.unit_price),
        description: formData.description || "",
        is_active: formData.is_active,
      };

      // Add optional fields only if they have values
      if (formData.category_id) {
        productData.category_id = parseInt(formData.category_id);
      }
      if (formData.size) {
        productData.size = formData.size;
      }
      if (formData.color) {
        productData.color = formData.color;
      }

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
          <p className="text-dark-600 mt-2">Update product information</p>
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

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4"
                />
                <span className="text-sm font-medium text-dark-700">
                  Active Product
                </span>
              </label>
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
