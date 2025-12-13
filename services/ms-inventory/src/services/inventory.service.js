const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");
const db = require("../config/database");
const logger = require("../config/logger");
const axios = require("axios");

// Service URLs from environment or defaults
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-catalog-service:3002";
const SUPPLIER_SERVICE_URL =
  process.env.SUPPLIER_SERVICE_URL || "http://supplier-service:3004";

class InventoryService {
  /**
   * Check if product has sufficient stock
   */
  static async checkStockAvailability(productId, requiredQuantity) {
    try {
      const inventory = await Inventory.findByProductId(productId);

      if (!inventory) {
        return {
          available: false,
          reason: "Product not found in inventory",
          currentStock: 0,
        };
      }

      // Check for reserved stock
      const reservedStock = inventory.reserved_quantity || 0;
      const availableStock = inventory.quantity - reservedStock;

      if (availableStock < requiredQuantity) {
        return {
          available: false,
          reason: "Insufficient stock",
          currentStock: availableStock,
          requested: requiredQuantity,
          shortage: requiredQuantity - availableStock,
        };
      }

      return {
        available: true,
        currentStock: availableStock,
        requested: requiredQuantity,
      };
    } catch (error) {
      logger.error("Error checking stock availability:", error);
      throw error;
    }
  }

  /**
   * Reserve stock for pending orders (prevents overselling)
   */
  static async reserveStock(productId, quantity, orderId) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Check availability
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        throw new Error("Product not found in inventory");
      }

      const availableStock =
        inventory.quantity - (inventory.reserved_quantity || 0);
      if (availableStock < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${availableStock}, Required: ${quantity}`
        );
      }

      // Reserve the stock
      const updateQuery = `
        UPDATE inventory 
        SET reserved_quantity = COALESCE(reserved_quantity, 0) + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [quantity, productId]);

      // Log the reservation
      await StockMovement.create(
        {
          product_id: productId,
          sku: inventory.sku,
          quantity: -quantity,
          movement_type: "out",
          reference_type: "order_reservation",
          reference_id: orderId.toString(),
          notes: `Stock reserved for order #${orderId}`,
        },
        client
      );

      await client.query("COMMIT");

      logger.info(
        `Reserved ${quantity} units of product ${productId} for order ${orderId}`
      );
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error reserving stock:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Release reserved stock (order cancelled)
   */
  static async releaseReservedStock(productId, quantity, orderId) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Get inventory SKU first
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        throw new Error("Product not found in inventory");
      }

      const updateQuery = `
        UPDATE inventory 
        SET reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - $1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [quantity, productId]);

      // Log the release
      await StockMovement.create(
        {
          product_id: productId,
          sku: inventory.sku,
          quantity: quantity,
          movement_type: "returned",
          reference_type: "order_cancellation",
          reference_id: orderId.toString(),
          notes: `Stock released from cancelled order #${orderId}`,
        },
        client
      );

      await client.query("COMMIT");

      logger.info(
        `Released ${quantity} units of product ${productId} from order ${orderId}`
      );
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error releasing reserved stock:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm stock deduction (order completed/shipped)
   */
  static async confirmStockDeduction(productId, quantity, orderId) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Get inventory SKU first
      const inventory = await Inventory.findByProductId(productId);
      if (!inventory) {
        throw new Error("Product not found in inventory");
      }

      // Deduct from both actual and reserved quantity
      const updateQuery = `
        UPDATE inventory 
        SET quantity = quantity - $1,
            reserved_quantity = GREATEST(COALESCE(reserved_quantity, 0) - $1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [quantity, productId]);
      const updatedInventory = result.rows[0];

      // Log the deduction
      await StockMovement.create(
        {
          product_id: productId,
          sku: inventory.sku,
          quantity: -quantity,
          movement_type: "out",
          reference_type: "order_fulfillment",
          reference_id: orderId.toString(),
          notes: `Stock sold - Order #${orderId} completed`,
        },
        client
      );

      await client.query("COMMIT");

      // Check if stock is low and needs reordering
      await this.checkAndAlertLowStock(updatedInventory);

      logger.info(
        `Deducted ${quantity} units of product ${productId} for completed order ${orderId}`
      );
      return updatedInventory;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error confirming stock deduction:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check for low stock and create alerts
   */
  static async checkAndAlertLowStock(inventory) {
    try {
      const availableStock =
        inventory.quantity - (inventory.reserved_quantity || 0);

      if (availableStock <= inventory.reorder_level) {
        logger.warn(
          `LOW STOCK ALERT: Product ${inventory.product_id} (SKU: ${inventory.sku}) - Available: ${availableStock}, Reorder Level: ${inventory.reorder_level}`
        );

        // Get product details
        let productName = `Product ${inventory.product_id}`;
        try {
          const productResponse = await axios.get(
            `${PRODUCT_SERVICE_URL}/${inventory.product_id}`
          );
          productName = productResponse.data.name || productName;
        } catch (error) {
          logger.warn("Could not fetch product details for alert");
        }

        // Create low stock alert record
        const alertQuery = `
          INSERT INTO stock_alerts (product_id, sku, current_quantity, reorder_level, alert_type, status)
          VALUES ($1, $2, $3, $4, 'low_stock', 'active')
          ON CONFLICT (product_id, alert_type) 
          DO UPDATE SET 
            current_quantity = $3,
            updated_at = CURRENT_TIMESTAMP,
            status = 'active'
          RETURNING *
        `;

        await db.query(alertQuery, [
          inventory.product_id,
          inventory.sku,
          availableStock,
          inventory.reorder_level,
        ]);

        // TODO: Trigger notification service
        // await this.sendLowStockNotification(inventory, productName);

        // Suggest automatic reorder
        await this.suggestAutoReorder(inventory, productName);
      }
    } catch (error) {
      logger.error("Error checking low stock:", error);
      // Don't throw - this is a background task
    }
  }

  /**
   * Suggest automatic purchase order creation
   */
  static async suggestAutoReorder(inventory, productName) {
    try {
      const reorderQuantity = inventory.max_stock_level - inventory.quantity;

      if (reorderQuantity > 0) {
        logger.info(
          `REORDER SUGGESTION: ${productName} (SKU: ${inventory.sku}) - Suggested quantity: ${reorderQuantity}`
        );

        // Create reorder suggestion record
        const suggestionQuery = `
          INSERT INTO reorder_suggestions (product_id, sku, current_quantity, suggested_quantity, status)
          VALUES ($1, $2, $3, $4, 'pending')
          RETURNING *
        `;

        await db.query(suggestionQuery, [
          inventory.product_id,
          inventory.sku,
          inventory.quantity,
          reorderQuantity,
        ]);

        // TODO: Notify purchasing team
        // TODO: Optionally auto-create purchase order
      }
    } catch (error) {
      logger.error("Error creating reorder suggestion:", error);
    }
  }

  /**
   * Bulk stock check for multiple products (for order validation)
   */
  static async bulkStockCheck(items) {
    try {
      const results = await Promise.all(
        items.map(async (item) => {
          const check = await this.checkStockAvailability(
            item.product_id,
            item.quantity
          );
          return {
            product_id: item.product_id,
            sku: item.sku,
            ...check,
          };
        })
      );

      const allAvailable = results.every((r) => r.available);
      const unavailableItems = results.filter((r) => !r.available);

      return {
        allAvailable,
        items: results,
        unavailableItems,
      };
    } catch (error) {
      logger.error("Error in bulk stock check:", error);
      throw error;
    }
  }

  /**
   * Receive stock from supplier (purchase order received)
   */
  static async receiveStock(productId, quantity, supplierOrderId, notes = "") {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      // Update inventory
      const inventory = await Inventory.updateQuantity(
        productId,
        quantity,
        client
      );

      // Log the receipt
      await StockMovement.create(
        {
          product_id: productId,
          sku: inventory.sku,
          quantity: quantity,
          movement_type: "in",
          reference_type: "purchase_order",
          reference_id: supplierOrderId,
          notes:
            notes || `Stock received from supplier order #${supplierOrderId}`,
        },
        client
      );

      await client.query("COMMIT");

      // Clear low stock alerts if stock is now sufficient
      if (inventory.quantity > inventory.reorder_level) {
        await db.query(
          `UPDATE stock_alerts SET status = 'resolved', updated_at = CURRENT_TIMESTAMP 
           WHERE product_id = $1 AND status = 'active'`,
          [productId]
        );
      }

      logger.info(
        `Received ${quantity} units of product ${productId} from supplier order ${supplierOrderId}`
      );
      return inventory;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error receiving stock:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get inventory analytics
   */
  static async getInventoryAnalytics() {
    try {
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_products,
          SUM(quantity) as total_stock,
          SUM(reserved_quantity) as total_reserved,
          COUNT(CASE WHEN quantity <= reorder_level THEN 1 END) as low_stock_products,
          COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_products,
          AVG(quantity) as avg_stock_per_product
        FROM inventory
      `;

      const result = await db.query(analyticsQuery);
      return result.rows[0];
    } catch (error) {
      logger.error("Error getting inventory analytics:", error);
      throw error;
    }
  }

  /**
   * Get stock movement history
   */
  static async getStockHistory(productId, limit = 50) {
    try {
      const query = `
        SELECT * FROM stock_movements 
        WHERE product_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;

      const result = await db.query(query, [productId, limit]);
      return result.rows;
    } catch (error) {
      logger.error("Error getting stock history:", error);
      throw error;
    }
  }
}

module.exports = InventoryService;
