const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");
const ProductServiceClient = require("../services/productService.client");
const db = require("../config/database");
const logger = require("../config/logger");

class InventoryController {
  async createInventory(req, res) {
    try {
      const {
        product_id,
        sku,
        quantity,
        warehouse_location,
        reorder_level,
        max_stock_level,
      } = req.body;

      // Verify product exists
      await ProductServiceClient.getProductById(product_id);

      // Check if inventory already exists
      const existing = await Inventory.findByProductId(product_id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Inventory already exists for this product",
        });
      }

      const inventory = await Inventory.create({
        product_id,
        sku,
        quantity,
        warehouse_location,
        reorder_level,
        max_stock_level,
      });

      // Record initial stock if quantity > 0
      if (quantity > 0) {
        await StockMovement.create({
          product_id,
          sku,
          movement_type: "in",
          quantity,
          reference_type: "initial_stock",
          notes: "Initial inventory creation",
        });
      }

      logger.info(`Inventory created for product ${product_id}`);

      res.status(201).json({
        success: true,
        message: "Inventory created successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Create inventory error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating inventory",
        error: error.message,
      });
    }
  }

  async getAllInventory(req, res) {
    try {
      const { low_stock } = req.query;

      const filters = {};
      if (low_stock === "true") filters.low_stock = true;

      const inventory = await Inventory.findAll(filters);

      res.json({
        success: true,
        count: inventory.length,
        data: inventory,
      });
    } catch (error) {
      logger.error("Get all inventory error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching inventory",
        error: error.message,
      });
    }
  }

  async getInventoryByProduct(req, res) {
    try {
      const { productId } = req.params;

      const inventory = await Inventory.findByProductId(productId);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found for this product",
        });
      }

      // Get product details
      const product = await ProductServiceClient.getProductById(productId);

      res.json({
        success: true,
        data: {
          ...inventory,
          product_name: product.name,
          product_sku: product.sku,
        },
      });
    } catch (error) {
      logger.error("Get inventory by product error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching inventory",
        error: error.message,
      });
    }
  }

  async adjustStock(req, res) {
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      const { product_id, sku, movement_type, quantity, notes, performed_by } =
        req.body;

      // Verify inventory exists
      const inventory = await Inventory.findByProductId(product_id);
      if (!inventory) {
        throw new Error("Inventory not found for this product");
      }

      // Calculate quantity change
      let quantityChange = quantity;
      if (["out", "damaged", "expired"].includes(movement_type)) {
        quantityChange = -Math.abs(quantity);
      } else if (["in", "returned"].includes(movement_type)) {
        quantityChange = Math.abs(quantity);
      }

      // Update inventory
      const updatedInventory = await Inventory.updateQuantity(
        product_id,
        quantityChange,
        client
      );

      // Record stock movement
      await client.query(
        `INSERT INTO stock_movements (product_id, sku, movement_type, quantity, notes, performed_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          product_id,
          sku,
          movement_type,
          Math.abs(quantity),
          notes,
          performed_by,
        ]
      );

      await client.query("COMMIT");

      logger.info(
        `Stock adjusted for product ${product_id}: ${movement_type} ${quantity}`
      );

      res.json({
        success: true,
        message: "Stock adjusted successfully",
        data: updatedInventory,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Adjust stock error:", error);
      res.status(500).json({
        success: false,
        message: "Error adjusting stock",
        error: error.message,
      });
    } finally {
      client.release();
    }
  }

  async reserveStock(req, res) {
    try {
      const { product_id, quantity } = req.body;

      const inventory = await Inventory.reserveStock(product_id, quantity);

      logger.info(
        `Stock reserved for product ${product_id}: ${quantity} units`
      );

      res.json({
        success: true,
        message: "Stock reserved successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Reserve stock error:", error);
      res.status(500).json({
        success: false,
        message: "Error reserving stock",
        error: error.message,
      });
    }
  }

  async releaseStock(req, res) {
    try {
      const { product_id, quantity } = req.body;

      const inventory = await Inventory.releaseStock(product_id, quantity);

      logger.info(
        `Stock released for product ${product_id}: ${quantity} units`
      );

      res.json({
        success: true,
        message: "Stock released successfully",
        data: inventory,
      });
    } catch (error) {
      logger.error("Release stock error:", error);
      res.status(500).json({
        success: false,
        message: "Error releasing stock",
        error: error.message,
      });
    }
  }

  async getStockMovements(req, res) {
    try {
      const { product_id, movement_type, start_date, end_date } = req.query;

      const filters = {};
      if (product_id) filters.product_id = parseInt(product_id);
      if (movement_type) filters.movement_type = movement_type;
      if (start_date) filters.start_date = start_date;
      if (end_date) filters.end_date = end_date;

      const movements = await StockMovement.findAll(filters);

      res.json({
        success: true,
        count: movements.length,
        data: movements,
      });
    } catch (error) {
      logger.error("Get stock movements error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching stock movements",
        error: error.message,
      });
    }
  }

  async updateInventory(req, res) {
    try {
      const { productId } = req.params;
      const updateData = req.body;

      const updatedInventory = await Inventory.update(productId, updateData);

      if (!updatedInventory) {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      logger.info(`Inventory updated for product ${productId}`);

      res.json({
        success: true,
        message: "Inventory updated successfully",
        data: updatedInventory,
      });
    } catch (error) {
      logger.error("Update inventory error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating inventory",
        error: error.message,
      });
    }
  }
}

module.exports = new InventoryController();
