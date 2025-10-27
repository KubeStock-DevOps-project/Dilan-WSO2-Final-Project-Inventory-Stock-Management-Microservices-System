const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrder.controller");
// const { purchaseOrderValidation } = require("../middlewares/validation.middleware");

// Create a new purchase order
router.post("/", purchaseOrderController.createPurchaseOrder);

// Get all purchase orders (with optional filters)
router.get("/", purchaseOrderController.getAllPurchaseOrders);

// Get purchase order statistics
router.get("/stats", purchaseOrderController.getPurchaseOrderStats);

// Get purchase order by ID
router.get("/:id", purchaseOrderController.getPurchaseOrderById);

// Update purchase order
router.put("/:id", purchaseOrderController.updatePurchaseOrder);

// Update purchase order status
router.patch("/:id/status", purchaseOrderController.updatePurchaseOrderStatus);

// Delete purchase order
router.delete("/:id", purchaseOrderController.deletePurchaseOrder);

module.exports = router;
