const Category = require("../models/category.model");
const logger = require("../config/logger");

class CategoryController {
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      const category = await Category.create({ name, description });

      logger.info(`Category created: ${category.name}`);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      logger.error("Create category error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating category",
        error: error.message,
      });
    }
  }

  async getAllCategories(req, res) {
    try {
      const categories = await Category.findAll();

      res.json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } catch (error) {
      logger.error("Get all categories error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      logger.error("Get category by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching category",
        error: error.message,
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const updatedCategory = await Category.update(id, { name, description });

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      logger.info(`Category updated: ${updatedCategory.name}`);

      res.json({
        success: true,
        message: "Category updated successfully",
        data: updatedCategory,
      });
    } catch (error) {
      logger.error("Update category error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating category",
        error: error.message,
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const deletedCategory = await Category.delete(id);

      if (!deletedCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      logger.info(`Category deleted: ${deletedCategory.name}`);

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      logger.error("Delete category error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting category",
        error: error.message,
      });
    }
  }
}

module.exports = new CategoryController();
