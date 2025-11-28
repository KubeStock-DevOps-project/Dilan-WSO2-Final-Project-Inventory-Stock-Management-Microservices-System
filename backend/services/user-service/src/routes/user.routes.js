const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const {
  authenticateAsgardeo,
  authorizeRoles,
} = require("../middlewares/asgardeo.middleware");
const {
  validateCreateUser,
  validateUpdateUser,
} = require("../middlewares/validation.middleware");

// All routes require authentication and admin role
router.use(authenticateAsgardeo);
router.use(authorizeRoles("admin"));

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", validateCreateUser, userController.createUser);
router.put("/:id", validateUpdateUser, userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;
