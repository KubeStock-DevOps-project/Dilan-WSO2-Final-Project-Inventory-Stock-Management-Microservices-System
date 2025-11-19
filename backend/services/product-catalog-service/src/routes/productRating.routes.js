const express = require("express");
const router = express.Router();
const productRatingController = require("../controllers/productRating.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Supplier routes (protected)
router.post(
  "/:productId/rate",
  authMiddleware,
  productRatingController.rateProduct
);

router.get(
  "/my-ratings",
  authMiddleware,
  productRatingController.getMyRatings
);

// Public routes
router.get("/:productId/ratings", productRatingController.getProductRatings);

module.exports = router;
