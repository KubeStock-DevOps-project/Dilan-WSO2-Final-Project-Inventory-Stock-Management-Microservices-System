const express = require("express");
const router = express.Router();
const lowStockAlertController = require("../controllers/lowStockAlert.controller");
const { authenticateAsgardeo } = require("../middlewares/asgardeo.middleware");

// Protected routes - require authentication
// Get low stock alerts
router.get(
  "/",
  authenticateAsgardeo,
  lowStockAlertController.getLowStockAlerts
);

// Check for low stock and create alerts
router.post(
  "/check",
  authenticateAsgardeo,
  lowStockAlertController.checkLowStock
);

// Get reorder suggestions
router.get(
  "/reorder-suggestions",
  authenticateAsgardeo,
  lowStockAlertController.getReorderSuggestions
);

// Get alert statistics
router.get(
  "/stats",
  authenticateAsgardeo,
  lowStockAlertController.getAlertStats
);

// Resolve alert
router.patch(
  "/:id/resolve",
  authenticateAsgardeo,
  lowStockAlertController.resolveAlert
);

module.exports = router;
