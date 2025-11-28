const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrder.controller");
const { authenticateAsgardeo } = require("../middlewares/asgardeo.middleware");
// const { purchaseOrderValidation } = require("../middlewares/validation.middleware");

// Create a new purchase order
router.post("/", purchaseOrderController.createPurchaseOrder);

// Get all purchase orders (with optional filters)
router.get("/", purchaseOrderController.getAllPurchaseOrders);

// Get purchase order statistics
router.get("/stats", purchaseOrderController.getPurchaseOrderStats);

// NEW: Get pending requests for a specific supplier
router.get(
  "/supplier/:supplier_id/pending",
  purchaseOrderController.getSupplierPendingRequests
);

// Get purchase order by ID
router.get("/:id", purchaseOrderController.getPurchaseOrderById);

// Update purchase order
router.put("/:id", purchaseOrderController.updatePurchaseOrder);

// Update purchase order status
router.patch("/:id/status", purchaseOrderController.updatePurchaseOrderStatus);

// NEW: Supplier responds to purchase request (approve/reject)
router.patch(
  "/:id/respond",
  authenticateAsgardeo,
  purchaseOrderController.respondToPurchaseRequest
);

// NEW: Supplier updates shipment status
router.patch(
  "/:id/ship",
  authenticateAsgardeo,
  purchaseOrderController.updateShipmentStatus
);

// NEW: Warehouse confirms receipt
router.patch(
  "/:id/receive",
  authenticateAsgardeo,
  purchaseOrderController.confirmReceipt
);

// Delete purchase order
router.delete("/:id", purchaseOrderController.deletePurchaseOrder);

module.exports = router;
