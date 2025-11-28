const express = require("express");
const router = express.Router();
const PricingController = require("../controllers/pricing.controller");
const {
  authenticateAsgardeo,
  authorizeRoles,
} = require("../middlewares/asgardeo.middleware");

/**
 * Production-Grade Pricing Routes
 * All advanced pricing business logic endpoints
 * RESTRICTED: Admin and Warehouse Staff only
 * Suppliers should NOT have access to pricing logic (business intelligence protection)
 */

// ============================================================================
// PRICE CALCULATION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/pricing/calculate
 * @desc    Calculate price with all applicable discounts
 * @access  Admin, Warehouse Staff Only
 * @body    { productId, quantity, customerId }
 */
router.post(
  "/calculate",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  PricingController.calculatePrice
);

/**
 * @route   POST /api/pricing/calculate-bundle
 * @desc    Calculate bundle pricing for multiple products
 * @access  Admin, Warehouse Staff Only
 * @body    { items: [{ productId, quantity, customerId }] }
 */
router.post(
  "/calculate-bundle",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  PricingController.calculateBundlePrice
);

/**
 * @route   POST /api/pricing/compare
 * @desc    Compare our price with competitors
 * @access  Admin, Warehouse Staff Only
 * @body    { productId, competitorPrices: [{ name, price }] }
 */
router.post(
  "/compare",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  PricingController.compareCompetitors
);

// ============================================================================
// PRICING RULES MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/pricing/rules
 * @desc    Get all pricing rules with optional filters
 * @access  Admin, Warehouse Staff Only
 * @query   rule_type, is_active
 */
router.get(
  "/rules",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  PricingController.getAllPricingRules
);

/**
 * @route   POST /api/pricing/rules
 * @desc    Create new pricing rule
 * @access  Admin Only
 * @body    { rule_name, rule_type, product_id, category_id, discount_percentage, ... }
 */
router.post(
  "/rules",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  PricingController.createPricingRule
);

/**
 * @route   PUT /api/pricing/rules/:id
 * @desc    Update pricing rule
 * @access  Admin Only
 * @body    { rule_name, discount_percentage, is_active, ... }
 */
router.put(
  "/rules/:id",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  PricingController.updatePricingRule
);

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/pricing/history/:productId
 * @desc    Get price history for a product
 * @access  Admin, Warehouse Staff Only
 * @query   days (default: 30)
 */
router.get(
  "/history/:productId",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  PricingController.getPriceHistory
);

module.exports = router;
