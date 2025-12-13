const PurchaseOrder = require("../models/purchaseOrder.model");
const logger = require("../config/logger");
const axios = require("axios");

const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";

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
      if (supplier_id) filters.supplier_id = supplier_id; // Now a string (Asgardeo ID)
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
      if (supplier_id) filters.supplier_id = supplier_id; // Now a string (Asgardeo ID)

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

  // New: Supplier responds to purchase request (approve/reject)
  async respondToPurchaseRequest(req, res) {
    try {
      const { id } = req.params;
      const {
        response,
        approved_quantity,
        rejection_reason,
        estimated_delivery_date,
        supplier_notes,
      } = req.body;

      // Validate response
      if (!["approved", "rejected", "partially_approved"].includes(response)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid response. Must be 'approved', 'rejected', or 'partially_approved'",
        });
      }

      const updateData = {
        supplier_response: response,
        responded_at: new Date(),
        supplier_notes,
      };

      if (response === "approved" || response === "partially_approved") {
        updateData.approved_quantity = approved_quantity;
        updateData.estimated_delivery_date = estimated_delivery_date;
        updateData.status = "confirmed";
      } else if (response === "rejected") {
        updateData.rejection_reason = rejection_reason;
        updateData.status = "rejected";
      }

      const updatedPO = await PurchaseOrder.update(id, updateData);

      logger.info(`Purchase order ${id} ${response} by supplier`);

      res.json({
        success: true,
        message: `Purchase request ${response} successfully`,
        data: updatedPO,
      });
    } catch (error) {
      logger.error("Respond to purchase request error:", error);
      res.status(500).json({
        success: false,
        message: "Error responding to purchase request",
        error: error.message,
      });
    }
  }

  // New: Supplier updates shipment status
  async updateShipmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, tracking_number, actual_delivery_date } = req.body;

      const updateData = { status };
      if (tracking_number) updateData.tracking_number = tracking_number;
      if (actual_delivery_date)
        updateData.actual_delivery_date = actual_delivery_date;

      const updatedPO = await PurchaseOrder.update(id, updateData);

      logger.info(`Purchase order ${id} shipment status updated to ${status}`);

      res.json({
        success: true,
        message: "Shipment status updated successfully",
        data: updatedPO,
      });
    } catch (error) {
      logger.error("Update shipment status error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating shipment status",
        error: error.message,
      });
    }
  }

  // New: Warehouse confirms receipt
  async confirmReceipt(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      // Get the purchase order first
      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      // Get purchase order items
      const db = require("../config/database");
      const itemsResult = await db.query(
        "SELECT product_id, sku, quantity FROM purchase_order_items WHERE po_id = $1",
        [id]
      );

      const updateData = {
        status: "received",
        actual_delivery_date: new Date(),
        notes: notes || "",
      };

      const updatedPO = await PurchaseOrder.update(id, updateData);

      // Update inventory for each product
      let inventoryUpdatesSuccessful = true;
      const inventoryErrors = [];

      for (const item of itemsResult.rows) {
        try {
          await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/adjust`, {
            product_id: item.product_id,
            sku: item.sku,
            quantity: item.quantity,
            movement_type: "in",
            notes: `Received from PO ${purchaseOrder.po_number}`,
          });
          logger.info(
            `Inventory updated for product ${item.product_id}: +${item.quantity} units`
          );
        } catch (inventoryError) {
          inventoryUpdatesSuccessful = false;
          inventoryErrors.push({
            product_id: item.product_id,
            error: inventoryError.message,
          });
          logger.error(
            `Failed to update inventory for product ${item.product_id}:`,
            inventoryError
          );
        }
      }

      logger.info(`Purchase order ${id} marked as received`);

      res.json({
        success: true,
        message: "Purchase order receipt confirmed",
        data: updatedPO,
        inventory_updates: {
          successful: inventoryUpdatesSuccessful,
          errors: inventoryErrors.length > 0 ? inventoryErrors : undefined,
        },
      });
    } catch (error) {
      logger.error("Confirm receipt error:", error);
      res.status(500).json({
        success: false,
        message: "Error confirming receipt",
        error: error.message,
      });
    }
  }

  // New: Get pending requests for supplier
  async getSupplierPendingRequests(req, res) {
    try {
      const { supplier_id } = req.params;

      const pendingRequests = await PurchaseOrder.findAll({
        supplier_id: supplier_id, // Now a string (Asgardeo ID)
        supplier_response: "pending",
      });

      res.json({
        success: true,
        count: pendingRequests.length,
        data: pendingRequests,
      });
    } catch (error) {
      logger.error("Get supplier pending requests error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching pending requests",
        error: error.message,
      });
    }
  }
}

module.exports = new PurchaseOrderController();
