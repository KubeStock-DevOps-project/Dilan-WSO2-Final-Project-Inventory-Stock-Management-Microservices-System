import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { productService } from "../../services/productService";
import toast from "react-hot-toast";

const ProductRatings = () => {
  const [products, setProducts] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingProduct, setRatingProduct] = useState(null);
  const [ratingData, setRatingData] = useState({ rating: 5, review: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, ratingsRes] = await Promise.all([
        productService.getAllProducts(),
        fetch("http://localhost:3002/api/products/my-ratings", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }).then((r) => r.json()),
      ]);

      setProducts(productsRes.data || []);
      setMyRatings(ratingsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleRateProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:3002/api/products/${ratingProduct.id}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(ratingData),
        }
      );

      if (!response.ok) throw new Error("Failed to rate product");

      toast.success("Product rated successfully!");
      setRatingProduct(null);
      setRatingData({ rating: 5, review: "" });
      fetchData();
    } catch (error) {
      console.error("Error rating product:", error);
      toast.error("Failed to rate product");
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={i < rating ? "fill-yellow-500 text-yellow-500" : "text-gray-300"}
      />
    ));
  };

  if (loading) return <LoadingSpinner text="Loading products..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-dark-900">Product Ratings</h1>
        <p className="text-dark-600 mt-2">Rate products you supply</p>
      </div>

      {/* My Ratings */}
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">My Ratings</h2>
        {myRatings.length === 0 ? (
          <p className="text-dark-600">You haven't rated any products yet.</p>
        ) : (
          <div className="space-y-4">
            {myRatings.map((rating) => (
              <div
                key={rating.id}
                className="flex items-center justify-between p-4 bg-dark-50 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{rating.product_name}</h3>
                  <p className="text-sm text-dark-600">SKU: {rating.sku}</p>
                  {rating.review && (
                    <p className="text-sm text-dark-700 mt-2">{rating.review}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(rating.rating)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Products to Rate */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Rate Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const myRating = myRatings.find((r) => r.product_id === product.id);
            return (
              <div
                key={product.id}
                className="p-4 border border-dark-200 rounded-lg hover:border-primary transition-colors"
              >
                <h3 className="font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-dark-600 mb-2">SKU: {product.sku}</p>
                <p className="text-sm text-dark-700 mb-3">
                  ${parseFloat(product.unit_price).toFixed(2)}
                </p>
                {myRating ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">{renderStars(myRating.rating)}</div>
                    <span className="text-sm text-dark-600">Rated</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRatingProduct(product)}
                  >
                    Rate Product
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rating Modal */}
      {ratingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">
              Rate {ratingProduct.name}
            </h2>
            <form onSubmit={handleRateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setRatingData((prev) => ({ ...prev, rating: star }))
                      }
                      className="focus:outline-none"
                    >
                      <Star
                        size={32}
                        className={
                          star <= ratingData.rating
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-gray-300"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Review (Optional)"
                name="review"
                value={ratingData.review}
                onChange={(e) =>
                  setRatingData((prev) => ({ ...prev, review: e.target.value }))
                }
                placeholder="Share your experience with this product..."
                multiline
                rows={3}
              />
              <div className="flex gap-3">
                <Button type="submit" variant="primary">
                  Submit Rating
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRatingProduct(null);
                    setRatingData({ rating: 5, review: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductRatings;
