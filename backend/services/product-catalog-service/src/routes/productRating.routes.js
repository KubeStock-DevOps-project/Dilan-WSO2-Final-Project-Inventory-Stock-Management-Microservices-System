const express = require("express");
const router = express.Router();
const productRatingController = require("../controllers/productRating.controller");
const { authenticateAsgardeo } = require("../middlewares/asgardeo.middleware");

// Supplier routes (protected)
router.post(
  "/:productId/rate",
  authenticateAsgardeo,
  productRatingController.rateProduct
);

router.get(
  "/my-ratings",
  authenticateAsgardeo,
  productRatingController.getMyRatings
);

// Public routes
router.get("/:productId/ratings", productRatingController.getProductRatings);

module.exports = router;
