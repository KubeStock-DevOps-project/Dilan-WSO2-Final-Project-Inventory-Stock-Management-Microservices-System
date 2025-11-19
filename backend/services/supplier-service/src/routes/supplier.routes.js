const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplier.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Create a new supplier
router.post("/", supplierController.createSupplier);

// Get all suppliers
router.get("/", supplierController.getAllSuppliers);

// Get supplier by ID
router.get("/:id", supplierController.getSupplierById);

// Get supplier performance metrics
router.get("/:id/performance", supplierController.getSupplierPerformance);

// Get current supplier's profile (for supplier users) - protected route
router.get(
  "/profile/me",
  authMiddleware,
  supplierController.getMyProfile
);

// Update supplier profile (for supplier users) - protected route
router.put(
  "/profile/me",
  authMiddleware,
  supplierController.updateMyProfile
);

// Update supplier
router.put("/:id", supplierController.updateSupplier);

// Delete supplier
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
