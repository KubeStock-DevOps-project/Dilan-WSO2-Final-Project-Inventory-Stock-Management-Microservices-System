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

router.post("/", validateCreateInventory, inventoryController.createInventory);
router.get("/", inventoryController.getAllInventory);
router.get("/product/:productId", inventoryController.getInventoryByProduct);
router.put(
  "/product/:productId",
  validateUpdateInventory,
  inventoryController.updateInventory
);

router.post("/adjust", validateAdjustStock, inventoryController.adjustStock);
router.post("/reserve", validateReserveStock, inventoryController.reserveStock);
router.post("/release", validateReleaseStock, inventoryController.releaseStock);

router.get("/movements", inventoryController.getStockMovements);

module.exports = router;
