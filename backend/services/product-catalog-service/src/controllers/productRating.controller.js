const db = require("../config/database");
const logger = require("../config/logger");
const { getSupplierIdFromUser } = require("../utils/supplierLookup");

class ProductRatingController {
  // Add or update product rating
  async rateProduct(req, res) {
    const client = await db.getClient();
    try {
      const { productId } = req.params;
      const { rating, review } = req.body;

      // Get supplier ID from authenticated user (supports Asgardeo and legacy auth)
      const supplierId = await getSupplierIdFromUser(req.user);

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      await client.query("BEGIN");

      // Insert or update rating
      const ratingResult = await client.query(
        `INSERT INTO product_ratings (product_id, supplier_id, rating, review)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (product_id, supplier_id)
         DO UPDATE SET rating = $3, review = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [productId, supplierId, rating, review]
      );

      // Update product average rating
      const avgResult = await client.query(
        `SELECT 
          AVG(rating)::DECIMAL(3,2) as avg_rating,
          COUNT(*) as total_ratings
         FROM product_ratings
         WHERE product_id = $1`,
        [productId]
      );

      await client.query(
        `UPDATE products 
         SET average_rating = $1, total_ratings = $2
         WHERE id = $3`,
        [
          avgResult.rows[0].avg_rating,
          avgResult.rows[0].total_ratings,
          productId,
        ]
      );

      await client.query("COMMIT");

      logger.info(
        `Product ${productId} rated ${rating} by supplier ${supplierId}`
      );

      res.json({
        success: true,
        message: "Product rated successfully",
        data: {
          ...ratingResult.rows[0],
          product_average_rating: avgResult.rows[0].avg_rating,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Rate product error:", error);
      res.status(500).json({
        success: false,
        message: "Error rating product",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }

  // Get product ratings
  async getProductRatings(req, res) {
    try {
      const { productId } = req.params;

      const result = await db.query(
        `SELECT pr.*, p.name as product_name, p.average_rating, p.total_ratings
         FROM product_ratings pr
         JOIN products p ON p.id = pr.product_id
         WHERE pr.product_id = $1
         ORDER BY pr.created_at DESC`,
        [productId]
      );

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get product ratings error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching product ratings",
        error: error.message,
      });
    }
  }

  // Get supplier's ratings
  async getMyRatings(req, res) {
    try {
      // Get supplier ID from authenticated user (supports Asgardeo and legacy auth)
      const supplierId = await getSupplierIdFromUser(req.user);

      const result = await db.query(
        `SELECT pr.*, p.name as product_name, p.sku
         FROM product_ratings pr
         JOIN products p ON p.id = pr.product_id
         WHERE pr.supplier_id = $1
         ORDER BY pr.updated_at DESC`,
        [supplierId]
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get my ratings error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching ratings",
        error: error.message,
      });
    }
  }
}

module.exports = new ProductRatingController();
