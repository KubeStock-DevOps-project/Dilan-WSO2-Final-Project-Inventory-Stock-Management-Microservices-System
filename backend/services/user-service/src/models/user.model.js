const db = require("../config/database");
const logger = require("../config/logger");

class User {
  static async create(userData) {
    const { username, email, password_hash, full_name, role } = userData;

    const query = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, is_active, created_at, updated_at
    `;

    try {
      const result = await db.query(query, [
        username,
        email,
        password_hash,
        full_name,
        role,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = "SELECT * FROM users WHERE id = $1";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding user by ID:", error);
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM users WHERE email = $1";

    try {
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findByUsername(username) {
    const query = "SELECT * FROM users WHERE username = $1";

    try {
      const result = await db.query(query, [username]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding user by username:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query =
      "SELECT id, username, email, full_name, role, is_active, created_at, updated_at FROM users WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (filters.role) {
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    query += " ORDER BY created_at DESC";

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error("Error finding all users:", error);
      throw error;
    }
  }

  static async update(id, userData) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    if (userData.username) {
      fields.push(`username = $${paramCount}`);
      params.push(userData.username);
      paramCount++;
    }

    if (userData.email) {
      fields.push(`email = $${paramCount}`);
      params.push(userData.email);
      paramCount++;
    }

    if (userData.full_name) {
      fields.push(`full_name = $${paramCount}`);
      params.push(userData.full_name);
      paramCount++;
    }

    if (userData.role) {
      fields.push(`role = $${paramCount}`);
      params.push(userData.role);
      paramCount++;
    }

    if (userData.is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      params.push(userData.is_active);
      paramCount++;
    }

    if (userData.password_hash) {
      fields.push(`password_hash = $${paramCount}`);
      params.push(userData.password_hash);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, username, email, full_name, role, is_active, created_at, updated_at
    `;

    try {
      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating user:", error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM users WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw error;
    }
  }
}

module.exports = User;
