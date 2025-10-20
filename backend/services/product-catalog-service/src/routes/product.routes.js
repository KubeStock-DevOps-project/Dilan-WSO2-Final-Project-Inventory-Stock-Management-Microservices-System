const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateGetProductsByIds,
} = require("../middlewares/validation.middleware");

router.post("/", validateCreateProduct, productController.createProduct);
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.get("/sku/:sku", productController.getProductBySku);
router.put("/:id", validateUpdateProduct, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);
router.post(
  "/batch",
  validateGetProductsByIds,
  productController.getProductsByIds
);

module.exports = router;
