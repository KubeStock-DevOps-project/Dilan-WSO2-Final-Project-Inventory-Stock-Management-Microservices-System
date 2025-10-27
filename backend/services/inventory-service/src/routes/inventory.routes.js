const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const {
  validateCreateInventory,
  validateAdjustStock,
  validateReserveStock,
  validateReleaseStock,
  validateUpdateInventory,
} = require("../middlewares/validation.middleware");

// Create
router.post("/", validateCreateInventory, inventoryController.createInventory);

// Read - specific routes MUST come before parameterized routes
router.get("/", inventoryController.getAllInventory);
router.get("/movements", inventoryController.getStockMovements);
router.get("/product/:productId", inventoryController.getInventoryByProduct);
router.get("/:id", inventoryController.getInventoryById);

// Update
router.put(
  "/product/:productId",
  validateUpdateInventory,
  inventoryController.updateInventory
);

// Delete
router.delete("/product/:productId", inventoryController.deleteInventory);

// Stock operations
router.post("/adjust", validateAdjustStock, inventoryController.adjustStock);
router.post("/reserve", validateReserveStock, inventoryController.reserveStock);
router.post("/release", validateReleaseStock, inventoryController.releaseStock);

module.exports = router;
