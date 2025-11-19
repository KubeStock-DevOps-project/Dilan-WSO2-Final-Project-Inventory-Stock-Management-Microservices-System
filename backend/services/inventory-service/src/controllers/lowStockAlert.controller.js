const db = require("../config/database");
const logger = require("../config/logger");

class LowStockAlertController {
  // Get active low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const { status = "active" } = req.query;

      const result = await db.query(
        `SELECT 
          lsa.*,
          i.warehouse_location,
          i.reorder_level
         FROM low_stock_alerts lsa
         JOIN inventory i ON i.product_id = lsa.product_id
         WHERE lsa.status = $1
         ORDER BY lsa.alerted_at DESC`,
        [status]
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
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
          [
            item.product_id,
            item.sku,
            item.current_quantity,
            item.reorder_level,
          ]
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

  // Resolve alert (mark as resolved)
  async resolveAlert(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const result = await db.query(
        `UPDATE low_stock_alerts
         SET status = 'resolved',
             resolved_at = CURRENT_TIMESTAMP,
             resolved_by = $2
         WHERE id = $1
         RETURNING *`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Alert not found",
        });
      }

      logger.info(`Low stock alert ${id} resolved by user ${userId}`);

      res.json({
        success: true,
        message: "Alert resolved successfully",
        data: result.rows[0],
      });
    } catch (error) {
      logger.error("Resolve alert error:", error);
      res.status(500).json({
        success: false,
        message: "Error resolving alert",
        error: error.message,
      });
    }
  }

  // Get reorder suggestions
  async getReorderSuggestions(req, res) {
    try {
      const result = await db.query(
        `SELECT 
          i.product_id,
          i.sku,
          i.quantity as current_quantity,
          i.reorder_level,
          i.max_stock_level,
          (i.max_stock_level - i.quantity) as suggested_order_quantity,
          i.warehouse_location
         FROM inventory i
         WHERE i.quantity <= i.reorder_level
         ORDER BY (i.reorder_level - i.quantity) DESC
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
          COUNT(*) FILTER (WHERE status = 'active') as active_alerts,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved_alerts,
          COUNT(*) FILTER (WHERE status = 'ignored') as ignored_alerts,
          COUNT(*) as total_alerts
         FROM low_stock_alerts
         WHERE alerted_at >= CURRENT_DATE - INTERVAL '30 days'`
      );

      res.json({
        success: true,
        data: result.rows[0],
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
