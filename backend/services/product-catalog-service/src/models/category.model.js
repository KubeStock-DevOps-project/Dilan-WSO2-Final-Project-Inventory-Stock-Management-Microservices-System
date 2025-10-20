const db = require("../config/database");
const logger = require("../config/logger");

class Category {
  static async create(data) {
    const { name, description } = data;
    const query = `
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [name, description]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating category:", error);
      throw error;
    }
  }

  static async findAll() {
    const query = "SELECT * FROM categories ORDER BY name";

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Error finding all categories:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = "SELECT * FROM categories WHERE id = $1";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding category by ID:", error);
      throw error;
    }
  }

  static async update(id, data) {
    const { name, description } = data;
    const query = `
      UPDATE categories 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await db.query(query, [name, description, id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating category:", error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM categories WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error deleting category:", error);
      throw error;
    }
  }
}

module.exports = Category;
