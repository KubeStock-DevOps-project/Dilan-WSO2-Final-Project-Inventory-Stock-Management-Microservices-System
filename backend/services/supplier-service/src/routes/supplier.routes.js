const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplier.controller");
const {
  authenticateAsgardeo,
  authorizeRoles,
} = require("../middlewares/asgardeo.middleware");

// Create a new supplier
router.post("/", supplierController.createSupplier);

// Get all suppliers
router.get("/", supplierController.getAllSuppliers);

// IMPORTANT: Specific routes must come BEFORE parameterized routes like /:id

// Get current supplier's profile (for supplier users) - protected route
router.get(
  "/profile/me",
  authenticateAsgardeo,
  supplierController.getMyProfile
);

// Update supplier profile (for supplier users) - protected route
router.put(
  "/profile/me",
  authenticateAsgardeo,
  supplierController.updateMyProfile
);

// Get supplier by ID
router.get("/:id", supplierController.getSupplierById);

// Get supplier performance metrics
router.get("/:id/performance", supplierController.getSupplierPerformance);

// Update supplier
router.put("/:id", supplierController.updateSupplier);

// Delete supplier
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
