const express = require("express");
const router = express.Router();
const ProductLifecycleController = require("../controllers/productLifecycle.controller");
const {
  authenticateAsgardeo,
  authorizeRoles,
} = require("../middlewares/asgardeo.middleware");

/**
 * Production-Grade Product Lifecycle Routes
 * All lifecycle management and approval workflow endpoints
 *
 * BUSINESS LOGIC ROLE SEPARATION:
 * - Admin: Full product lifecycle control (approve, activate, discontinue, archive)
 * - Warehouse Staff: Create drafts, submit for approval, request discontinuation
 * - Supplier: View only
 */

// ============================================================================
// PRODUCT LIFECYCLE CREATION & TRANSITIONS
// ============================================================================

/**
 * @route   POST /api/products/lifecycle
 * @desc    Create new product with lifecycle management (starts in DRAFT)
 * @access  Admin, Warehouse Staff
 * @body    { name, category_id, unit_price, sku, ... }
 */
router.post(
  "/lifecycle",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  ProductLifecycleController.createProduct
);

/**
 * @route   POST /api/products/:id/transition
 * @desc    Transition product to new lifecycle state
 * @access  Admin Only
 * @body    { newState, notes, userId }
 */
router.post(
  "/:id/transition",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.transitionState
);

// ============================================================================
// APPROVAL WORKFLOW ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/products/pending-approvals
 * @desc    Get all products pending approval
 * @access  Admin Only
 */
router.get(
  "/pending-approvals",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.getPendingApprovals
);

/**
 * @route   POST /api/products/:id/submit-for-approval
 * @desc    Submit product for approval (draft → pending_approval)
 * @access  Admin, Warehouse Staff
 * @body    { userId, notes }
 */
router.post(
  "/:id/submit-for-approval",
  authenticateAsgardeo,
  authorizeRoles("admin", "warehouse_staff"),
  ProductLifecycleController.submitForApproval
);

/**
 * @route   POST /api/products/:id/approve
 * @desc    Approve product (pending_approval → approved)
 * @access  Admin Only
 * @body    { userId, notes }
 */
router.post(
  "/:id/approve",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.approveProduct
);

/**
 * @route   POST /api/products/bulk-approve
 * @desc    Bulk approve multiple products
 * @access  Admin Only
 * @body    { productIds: [1, 2, 3], userId, notes }
 */
router.post(
  "/bulk-approve",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.bulkApprove
);

// ============================================================================
// STATE MANAGEMENT SHORTCUTS
// ============================================================================

/**
 * @route   POST /api/products/:id/activate
 * @desc    Activate product (make available for sale)
 * @access  Admin Only
 * @body    { userId, notes }
 */
router.post(
  "/:id/activate",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.activateProduct
);

/**
 * @route   POST /api/products/:id/discontinue
 * @desc    Discontinue product (stop selling)
 * @access  Admin Only
 * @body    { userId, notes }
 */
router.post(
  "/:id/discontinue",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.discontinueProduct
);

/**
 * @route   POST /api/products/:id/archive
 * @desc    Archive product (permanently remove from active catalog)
 * @access  Admin Only
 * @body    { userId, notes }
 */
router.post(
  "/:id/archive",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.archiveProduct
);

// ============================================================================
// LIFECYCLE QUERY ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/products/by-state/:state
 * @desc    Get all products in a specific lifecycle state
 * @access  Public
 * @query   category_id
 * @params  state (draft, pending_approval, approved, active, discontinued, archived)
 */
router.get("/by-state/:state", ProductLifecycleController.getProductsByState);

/**
 * @route   GET /api/products/:id/lifecycle-history
 * @desc    Get lifecycle history for a product
 * @access  Public
 * @query   limit (default: 50)
 */
router.get(
  "/:id/lifecycle-history",
  ProductLifecycleController.getLifecycleHistory
);

/**
 * @route   GET /api/products/lifecycle-stats
 * @desc    Get statistics for product lifecycle states
 * @access  Admin Only
 */
router.get(
  "/lifecycle-stats",
  authenticateAsgardeo,
  authorizeRoles("admin"),
  ProductLifecycleController.getLifecycleStats
);

module.exports = router;
