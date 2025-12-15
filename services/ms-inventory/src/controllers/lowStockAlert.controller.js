const db = require("../config/database");
const logger = require("../config/logger");

class LowStockAlertController {
  // Get active low stock alerts - items below reorder level
  async getLowStockAlerts(req, res) {
    try {
      const ProductServiceClient = require("../services/productService.client");

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

      // Enrich with product details
      const enrichedData = await Promise.all(
        result.rows.map(async (item) => {
          try {
            const product = await ProductServiceClient.getProductById(
              item.product_id
            );
            return {
              ...item,
              product_name: product?.name || "Unknown Product",
              product_sku: product?.sku || item.sku,
              unit_price: product?.unit_price || 0,
            };
          } catch (error) {
            logger.warn(
              `Could not fetch product details for product_id: ${item.product_id}`
            );
            return {
              ...item,
              product_name: "Unknown Product",
              product_sku: item.sku,
              unit_price: 0,
            };
          }
        })
      );

      res.json({
        success: true,
        count: enrichedData.length,
        data: enrichedData,
      });
    } catch (error) {
      logger.error("Get low stock alerts error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching low stock alerts",
        error: error.message,
      });
    }
  }

  // Check and create alerts for low stock items
  async checkLowStock(req, res) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      // Find inventory items below reorder level
      const lowStockItems = await client.query(
        `SELECT 
          i.product_id,
          i.sku,
          i.quantity as current_quantity,
          i.reorder_level
         FROM inventory i
         WHERE i.quantity <= i.reorder_level
         AND i.product_id NOT IN (
           SELECT product_id 
           FROM low_stock_alerts 
           WHERE status = 'active'
         )`
      );

      // Create alerts for each low stock item
      const alerts = [];
      for (const item of lowStockItems.rows) {
        const alertResult = await client.query(
          `INSERT INTO low_stock_alerts 
           (product_id, sku, current_quantity, reorder_level, status)
           VALUES ($1, $2, $3, $4, 'active')
           RETURNING *`,
          [item.product_id, item.sku, item.current_quantity, item.reorder_level]
        );
        alerts.push(alertResult.rows[0]);
      }

      await client.query("COMMIT");

      logger.info(`Created ${alerts.length} new low stock alerts`);

      res.json({
        success: true,
        message: `Found ${alerts.length} low stock items`,
        data: alerts,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Check low stock error:", error);
      res.status(500).json({
        success: false,
        message: "Error checking low stock",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }

  // Resolve alert - alerts are auto-resolved when inventory is updated
  // Frontend should call PUT /inventory/:id to update stock levels
  async resolveAlert(req, res) {
    return res.status(410).json({
      success: false,
      message:
        "This endpoint is deprecated. Use PUT /inventory/:id to update stock levels directly.",
    });
  }

  // Get reorder suggestions
  async getReorderSuggestions(req, res) {
    try {
      const result = await db.query(
        `SELECT 
          i.product_id,
          i.sku,
          i.quantity,
          i.reserved_quantity,
          (i.quantity - COALESCE(i.reserved_quantity, 0)) as available_quantity,
          i.reorder_level,
          i.max_stock_level,
          GREATEST(i.max_stock_level - (i.quantity - COALESCE(i.reserved_quantity, 0)), 0) as suggested_order_quantity,
          i.warehouse_location
         FROM inventory i
         WHERE (i.quantity - COALESCE(i.reserved_quantity, 0)) <= i.reorder_level
         ORDER BY (i.reorder_level - (i.quantity - COALESCE(i.reserved_quantity, 0))) DESC
         LIMIT 50`
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      logger.error("Get reorder suggestions error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching reorder suggestions",
        error: error.message,
      });
    }
  }

  // Get alert statistics
  async getAlertStats(req, res) {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE (quantity - COALESCE(reserved_quantity, 0)) <= reorder_level) as active_alerts,
          COUNT(*) FILTER (WHERE (quantity - COALESCE(reserved_quantity, 0)) = 0) as critical_alerts,
          COUNT(*) FILTER (WHERE (quantity - COALESCE(reserved_quantity, 0)) > reorder_level) as resolved_alerts,
          COUNT(*) as total_items
         FROM inventory`
      );

      // Convert counts to numbers for frontend
      const stats = {
        active_alerts: parseInt(result.rows[0].active_alerts) || 0,
        critical_alerts: parseInt(result.rows[0].critical_alerts) || 0,
        resolved_alerts: parseInt(result.rows[0].resolved_alerts) || 0,
        total_items: parseInt(result.rows[0].total_items) || 0,
        ignored_alerts: 0, // We don't track ignored alerts anymore
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get alert stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching alert statistics",
        error: error.message,
      });
    }
  }
}

module.exports = new LowStockAlertController();
