const PurchaseOrder = require("../models/purchaseOrder.model");
const logger = require("../config/logger");

class PurchaseOrderController {
  async createPurchaseOrder(req, res) {
    try {
      const purchaseOrder = await PurchaseOrder.create(req.body);

      logger.info(`Purchase order ${purchaseOrder.id} created successfully`);

      res.status(201).json({
        success: true,
        message: "Purchase order created successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      logger.error("Create purchase order error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating purchase order",
        error: error.message,
      });
    }
  }

  async getAllPurchaseOrders(req, res) {
    try {
      const { status, supplier_id, limit } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (supplier_id) filters.supplier_id = parseInt(supplier_id);
      if (limit) filters.limit = parseInt(limit);

      const purchaseOrders = await PurchaseOrder.findAll(filters);

      logger.info(
        `Retrieved ${purchaseOrders.length} purchase orders with filters:`,
        filters
      );

      res.json({
        success: true,
        count: purchaseOrders.length,
        data: purchaseOrders,
      });
    } catch (error) {
      logger.error("Get all purchase orders error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching purchase orders",
        error: error.message,
      });
    }
  }

  async getPurchaseOrderById(req, res) {
    try {
      const { id } = req.params;

      const purchaseOrder = await PurchaseOrder.findById(id);

      if (!purchaseOrder) {
        logger.warn(`Purchase order ${id} not found`);
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      logger.info(`Retrieved purchase order ${id}`);

      res.json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error) {
      logger.error(`Get purchase order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error fetching purchase order",
        error: error.message,
      });
    }
  }

  async updatePurchaseOrder(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        logger.warn(
          `Purchase order ${id} update validation failed:`,
          errors.array()
        );
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const purchaseOrder = await PurchaseOrder.update(id, req.body);

      if (!purchaseOrder) {
        logger.warn(`Purchase order ${id} not found for update`);
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      logger.info(`Purchase order ${id} updated successfully`);

      res.json({
        success: true,
        message: "Purchase order updated successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      logger.error(`Update purchase order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error updating purchase order",
        error: error.message,
      });
    }
  }

  async updatePurchaseOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "pending",
        "approved",
        "ordered",
        "received",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        logger.warn(`Invalid status ${status} for purchase order ${id}`);
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      const purchaseOrder = await PurchaseOrder.updateStatus(id, status);

      if (!purchaseOrder) {
        logger.warn(`Purchase order ${id} not found for status update`);
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      logger.info(`Purchase order ${id} status updated to ${status}`);

      res.json({
        success: true,
        message: "Purchase order status updated successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      logger.error(
        `Update purchase order ${req.params.id} status error:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Error updating purchase order status",
        error: error.message,
      });
    }
  }

  async deletePurchaseOrder(req, res) {
    try {
      const { id } = req.params;

      const purchaseOrder = await PurchaseOrder.delete(id);

      if (!purchaseOrder) {
        logger.warn(`Purchase order ${id} not found for deletion`);
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      logger.info(`Purchase order ${id} deleted successfully`);

      res.json({
        success: true,
        message: "Purchase order deleted successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      logger.error(`Delete purchase order ${req.params.id} error:`, error);
      res.status(500).json({
        success: false,
        message: "Error deleting purchase order",
        error: error.message,
      });
    }
  }

  async getPurchaseOrderStats(req, res) {
    try {
      const { supplier_id } = req.query;
      const filters = {};
      if (supplier_id) filters.supplier_id = parseInt(supplier_id);

      const allOrders = await PurchaseOrder.findAll(filters);

      const stats = {
        total: allOrders.length,
        pending: allOrders.filter((o) => o.status === "pending").length,
        approved: allOrders.filter((o) => o.status === "approved").length,
        ordered: allOrders.filter((o) => o.status === "ordered").length,
        received: allOrders.filter((o) => o.status === "received").length,
        cancelled: allOrders.filter((o) => o.status === "cancelled").length,
        totalAmount: allOrders.reduce(
          (sum, o) => sum + parseFloat(o.total_amount || 0),
          0
        ),
      };

      logger.info("Purchase order stats retrieved", stats);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get purchase order stats error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching purchase order statistics",
        error: error.message,
      });
    }
  }
}

module.exports = new PurchaseOrderController();
