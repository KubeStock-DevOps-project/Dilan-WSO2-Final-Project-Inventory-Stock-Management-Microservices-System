const express = require("express");
const router = express.Router();
const lowStockAlertController = require("../controllers/lowStockAlert.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Protected routes - require authentication
// Get low stock alerts
router.get("/", authMiddleware, lowStockAlertController.getLowStockAlerts);

// Check for low stock and create alerts
router.post("/check", authMiddleware, lowStockAlertController.checkLowStock);

// Get reorder suggestions
router.get("/reorder-suggestions", authMiddleware, lowStockAlertController.getReorderSuggestions);

// Get alert statistics
router.get("/stats", authMiddleware, lowStockAlertController.getAlertStats);

// Resolve alert
router.patch("/:id/resolve", authMiddleware, lowStockAlertController.resolveAlert);

module.exports = router;
