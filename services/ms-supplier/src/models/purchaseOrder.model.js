const db = require("../config/database");
const logger = require("../config/logger");

// Allowed supplier response values matching DB CHECK constraint
const SUPPLIER_RESPONSES = [
  "pending",
  "approved",
  "rejected",
  "partially_approved",
];

class PurchaseOrder {
  static async create(poData) {
    const {
      supplier_id,
      total_amount,
      order_date,
      expected_delivery_date,
      status = "draft",
      notes,
    } = poData;

    // Generate unique PO number
    const poNumber = `PO-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const query = `
      INSERT INTO purchase_orders (po_number, supplier_id, total_amount, order_date, expected_delivery_date, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      poNumber,
      supplier_id,
      total_amount,
      order_date,
      expected_delivery_date,
      status,
      notes,
    ];

    try {
      const result = await db.query(query, values);
      logger.info(
        `Purchase order created: ${poNumber} for supplier ${supplier_id}`
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating purchase order:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT po.*
      FROM purchase_orders po
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND po.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.supplier_id) {
      query += ` AND po.supplier_id = $${paramCount}`;
      values.push(filters.supplier_id);
      paramCount++;
    }

    if (
      filters.supplier_response !== undefined &&
      filters.supplier_response !== null
    ) {
      if (SUPPLIER_RESPONSES.includes(filters.supplier_response)) {
        query += ` AND po.supplier_response = $${paramCount}`;
        values.push(filters.supplier_response);
        paramCount++;
      } else {
        logger.warn(
          `Invalid supplier_response value: ${
            filters.supplier_response
          }. Allowed values: ${SUPPLIER_RESPONSES.join(", ")}`
        );
      }
    }

    query += " ORDER BY po.created_at DESC";

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    try {
      const result = await db.query(query, values);
      logger.info(
        `Retrieved ${result.rows.length} purchase orders with filters:`,
        filters
      );
      return result.rows;
    } catch (error) {
      logger.error("Error fetching purchase orders:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT po.*
      FROM purchase_orders po
      WHERE po.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error fetching purchase order ${id}:`, error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = [
      "status",
      "total_amount",
      "order_date",
      "expected_delivery_date",
      "actual_delivery_date",
      "notes",
      "supplier_response",
      "requested_quantity",
      "approved_quantity",
      "rejection_reason",
      "estimated_delivery_date",
      "tracking_number",
      "supplier_notes",
      "responded_at",
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
      UPDATE purchase_orders 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Purchase order ${id} updated successfully`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating purchase order ${id}:`, error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE purchase_orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Purchase order ${id} status updated to ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating purchase order ${id} status:`, error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM purchase_orders WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info(`Purchase order ${id} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting purchase order ${id}:`, error);
      throw error;
    }
  }
}

module.exports = PurchaseOrder;
