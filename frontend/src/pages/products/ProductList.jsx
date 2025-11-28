import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { productService } from "../../services/productService";
import { formatCurrency } from "../../utils/helpers";
import { useAuth } from "../../context/AsgardeoAuthContext";

const ProductList = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const canManageProducts =
    user?.role === "admin" || user?.role === "warehouse_staff";

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productService.getAllProducts();
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Products</h1>
          <p className="text-dark-600 mt-2">Manage your product catalog</p>
        </div>
        {canManageProducts && (
          <Link to="/products/add">
            <Button variant="primary">
              <Plus size={20} className="mr-2" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="mb-0"
            />
          </div>
          <Button variant="outline">
            <Filter size={20} className="mr-2" />
            Filters
          </Button>
          <Button variant="ghost">
            <Search size={20} className="mr-2" />
            Advanced Search
          </Button>
        </div>
      </Card>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} hover>
            <div className="mb-4">
              <div className="w-full h-48 bg-dark-100 rounded-lg flex items-center justify-center">
                <span className="text-4xl text-dark-400">📦</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-dark-900 mb-2">
              {product.name}
            </h3>
            <p className="text-sm text-dark-600 mb-2">SKU: {product.sku}</p>
            <p className="text-sm text-dark-500 mb-4 line-clamp-2">
              {product.description}
            </p>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold text-primary">
                {formatCurrency(product.unit_price)}
              </span>
              <Badge variant={product.is_active ? "success" : "danger"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {canManageProducts ? (
              <Link to={`/products/edit/${product.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" className="w-full" disabled>
                View Only
              </Button>
            )}
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-dark-500">No products found</p>
        </Card>
      )}
    </div>
  );
};

export default ProductList;
