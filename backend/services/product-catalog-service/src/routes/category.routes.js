const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category.controller");
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require("../middlewares/validation.middleware");

router.post("/", validateCreateCategory, categoryController.createCategory);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", validateUpdateCategory, categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
