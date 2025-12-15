const InventoryService = require("../services/inventory.service");
const logger = require("../config/logger");

class InventoryBusinessController {
  /**
   * Bulk stock availability check
   */
  async bulkStockCheck(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      const result = await InventoryService.bulkStockCheck(items);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error in bulk stock check:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(req, res) {
    try {
      const { product_id, quantity, order_id } = req.body;

      if (!product_id || !quantity || !order_id) {
        return res.status(400).json({
          success: false,
          message: "product_id, quantity, and order_id are required",
        });
      }

      const inventory = await InventoryService.reserveStock(
        product_id,
        quantity,
        order_id
      );

      res.json({
        success: true,
        message: "Stock reserved successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Error reserving stock:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Release reserved stock (cancelled order)
   */
  async releaseStock(req, res) {
    try {
      const { product_id, quantity, order_id } = req.body;

      if (!product_id || !quantity || !order_id) {
        return res.status(400).json({
          success: false,
          message: "product_id, quantity, and order_id are required",
        });
      }

      const inventory = await InventoryService.releaseReservedStock(
        product_id,
        quantity,
        order_id
      );

      res.json({
        success: true,
        message: "Stock released successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Error releasing stock:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Confirm stock deduction (order shipped)
   */
  async confirmDeduction(req, res) {
    try {
      const { product_id, quantity, order_id } = req.body;

      if (!product_id || !quantity || !order_id) {
        return res.status(400).json({
          success: false,
          message: "product_id, quantity, and order_id are required",
        });
      }

      const inventory = await InventoryService.confirmStockDeduction(
        product_id,
        quantity,
        order_id
      );

      res.json({
        success: true,
        message: "Stock deducted successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Error confirming stock deduction:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Return stock to inventory
   */
  async returnStock(req, res) {
    try {
      const { product_id, quantity, order_id } = req.body;

      if (!product_id || !quantity || !order_id) {
        return res.status(400).json({
          success: false,
          message: "product_id, quantity, and order_id are required",
        });
      }

      const inventory = await InventoryService.receiveStock(
        product_id,
        quantity,
        order_id,
        `Stock returned from order #${order_id}`
      );

      res.json({
        success: true,
        message: "Stock returned successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Error returning stock:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Receive stock from supplier
   */
  async receiveStock(req, res) {
    try {
      const { product_id, quantity, supplier_order_id, notes } = req.body;

      if (!product_id || !quantity || !supplier_order_id) {
        return res.status(400).json({
          success: false,
          message: "product_id, quantity, and supplier_order_id are required",
        });
      }

      const inventory = await InventoryService.receiveStock(
        product_id,
        quantity,
        supplier_order_id,
        notes
      );

      res.json({
        success: true,
        message: "Stock received successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Error receiving stock:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get low stock alerts - returns items that are below reorder level
   */
  async getLowStockAlerts(req, res) {
    try {
      const db = require("../config/database");
      const ProductServiceClient = require("../clients/productService.client");

      // Get all inventory items where available stock <= reorder level
      const query = `
        SELECT 
          i.*,
          (i.quantity - COALESCE(i.reserved_quantity, 0)) as available_quantity
        FROM inventory i
        WHERE (i.quantity - COALESCE(i.reserved_quantity, 0)) <= i.reorder_level
          AND (i.quantity - COALESCE(i.reserved_quantity, 0)) >= 0
        ORDER BY 
          CASE 
            WHEN (i.quantity - COALESCE(i.reserved_quantity, 0)) = 0 THEN 0
            ELSE 1
          END,
          (i.quantity - COALESCE(i.reserved_quantity, 0)) ASC
      `;

      const result = await db.query(query);

      // Enrich with product details using batch fetch to avoid N+1 queries
      let productMap = {};
      try {
        // Collect unique product IDs
        const productIds = [
          ...new Set(result.rows.map((item) => item.product_id)),
        ];

        if (productIds.length > 0) {
          // Batch fetch all products
          const products = await ProductServiceClient.getProductsByIds(
            productIds
          );
          productMap = (products || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      } catch (error) {
        logger.error("Error batch fetching product details:", error.message);
        // Continue with empty productMap, will use fallback values
      }

      // Map inventory items with product details
      const enrichedData = result.rows.map((item) => {
        const product = productMap[item.product_id];
        return {
          ...item,
          product_name: product?.name || "Unknown Product",
          product_sku: product?.sku || item.sku,
          unit_price: product?.unit_price || 0,
        };
      });

      res.json({
        success: true,
        count: enrichedData.length,
        data: enrichedData,
      });
    } catch (error) {
      logger.error("Error getting low stock alerts:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get reorder suggestions
   */
  async getReorderSuggestions(req, res) {
    try {
      const { status = "pending" } = req.query;

      const query = `
        SELECT * FROM reorder_suggestions
        WHERE status = $1
        ORDER BY created_at DESC
      `;

      const db = require("../config/database");
      const result = await db.query(query, [status]);

      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Error getting reorder suggestions:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get inventory analytics
   */
  async getAnalytics(req, res) {
    try {
      const analytics = await InventoryService.getInventoryAnalytics();

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error("Error getting inventory analytics:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get stock history for a product
   */
  async getStockHistory(req, res) {
    try {
      const { productId } = req.params;
      const { limit = 50 } = req.query;

      const history = await InventoryService.getStockHistory(
        productId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Error getting stock history:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new InventoryBusinessController();
