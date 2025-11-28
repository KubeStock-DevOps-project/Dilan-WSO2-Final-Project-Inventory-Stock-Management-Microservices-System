const db = require("../config/database");
const logger = require("../config/logger");

class Supplier {
  static async create(supplierData) {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      country,
      payment_terms,
      rating,
      is_active = true,
    } = supplierData;

    const query = `
      INSERT INTO suppliers (name, contact_person, email, phone, address, country, payment_terms, rating, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      name,
      contact_person,
      email,
      phone,
      address,
      country,
      payment_terms,
      rating,
      is_active,
    ];

    try {
      const result = await db.query(query, values);
      logger.info(
        `Supplier created: ${result.rows[0].name} (ID: ${result.rows[0].id})`
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating supplier:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = "SELECT * FROM suppliers WHERE 1=1";
    const values = [];
    let paramCount = 1;

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.is_active);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching suppliers:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = "SELECT * FROM suppliers WHERE id = $1";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching supplier ${id}:`, error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = "SELECT * FROM suppliers WHERE user_id = $1";

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching supplier for user ${userId}:`, error);
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = "SELECT * FROM suppliers WHERE email = $1";

    try {
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching supplier for email ${email}:`, error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = [
      "name",
      "contact_person",
      "email",
      "phone",
      "address",
      "country",
      "payment_terms",
      "rating",
      "is_active",
    ];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE suppliers 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Supplier ${id} updated successfully`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating supplier ${id}:`, error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM suppliers WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Supplier ${id} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting supplier ${id}:`, error);
      throw error;
    }
  }
}

module.exports = Supplier;
