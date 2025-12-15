const express = require("express");
const router = express.Router();
const lowStockAlertController = require("../controllers/lowStockAlert.controller");
const { authenticate } = require("../middlewares/token.middleware");

// Get low stock alerts - no auth required for read-only
router.get("/", lowStockAlertController.getLowStockAlerts);

// Check for low stock and create alerts
router.post("/check", authenticate, lowStockAlertController.checkLowStock);

// Get reorder suggestions
router.get(
  "/reorder-suggestions",
  authenticate,
  lowStockAlertController.getReorderSuggestions
);

// Get alert statistics - no auth required for read-only
router.get("/stats", lowStockAlertController.getAlertStats);

// Resolve alert
router.patch(
  "/:id/resolve",
  authenticate,
  lowStockAlertController.resolveAlert
);

module.exports = router;
