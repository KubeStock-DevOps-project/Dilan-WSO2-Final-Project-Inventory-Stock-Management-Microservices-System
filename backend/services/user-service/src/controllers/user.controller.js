const User = require("../models/user.model");
const logger = require("../config/logger");
const bcrypt = require("bcrypt");

class UserController {
  async getAllUsers(req, res) {
    try {
      const { role, is_active } = req.query;

      const filters = {};
      if (role) filters.role = role;
      if (is_active !== undefined) filters.is_active = is_active === "true";

      const users = await User.findAll(filters);

      res.json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      logger.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching users",
        error: error.message,
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      logger.error("Get user by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching user",
        error: error.message,
      });
    }
  }

  async createUser(req, res) {
    try {
      const { username, email, password, full_name, role } = req.body;

      // Check if user already exists
      const existingUserByEmail = await User.findByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const existingUserByUsername = await User.findByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        email,
        password_hash,
        full_name,
        role,
      });

      logger.info(`New user created by admin: ${user.email}`);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("Create user error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating user",
        error: error.message,
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, full_name, role, is_active } = req.body;

      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (full_name) updateData.full_name = full_name;
      if (role) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;

      const updatedUser = await User.update(id, updateData);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(`User updated: ${updatedUser.email}`);

      res.json({
        success: true,
        message: "User updated successfully",
        data: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          is_active: updatedUser.is_active,
        },
      });
    } catch (error) {
      logger.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating user",
        error: error.message,
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const deletedUser = await User.delete(id);

      if (!deletedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      logger.info(`User deleted: ${deletedUser.email}`);

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting user",
        error: error.message,
      });
    }
  }
}

module.exports = new UserController();
