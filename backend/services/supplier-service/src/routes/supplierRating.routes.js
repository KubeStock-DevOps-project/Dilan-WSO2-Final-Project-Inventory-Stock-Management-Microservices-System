const express = require("express");
const router = express.Router();
const supplierRatingController = require("../controllers/supplierRating.controller");
const { authenticateAsgardeo } = require("../middlewares/asgardeo.middleware");

// All rating endpoints require authentication
router.use(authenticateAsgardeo);

// Create rating for a supplier (admin/warehouse staff only)
router.post("/:supplier_id/ratings", supplierRatingController.createRating);

// Get all ratings for a supplier
router.get(
  "/:supplier_id/ratings",
  supplierRatingController.getSupplierRatings
);

// Get rating statistics for a supplier
router.get(
  "/:supplier_id/rating-stats",
  supplierRatingController.getSupplierStats
);

// Update a rating
router.put("/ratings/:rating_id", supplierRatingController.updateRating);

// Delete a rating
router.delete("/ratings/:rating_id", supplierRatingController.deleteRating);

module.exports = router;
