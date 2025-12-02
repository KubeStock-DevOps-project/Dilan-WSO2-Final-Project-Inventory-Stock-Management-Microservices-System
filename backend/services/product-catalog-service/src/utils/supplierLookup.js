const { Pool } = require("pg");
const logger = require("../config/logger");

// Separate pool for supplier database lookups
const supplierPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: "supplier_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Find supplier by email (for Asgardeo authenticated users)
 * @param {string} email - Supplier email address
 * @returns {Promise<Object|null>} Supplier object or null
 */
async function findSupplierByEmail(email) {
  try {
    const result = await supplierPool.query(
      "SELECT id, name, email, is_active FROM suppliers WHERE email = $1",
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error("Error finding supplier by email:", error);
    throw error;
  }
}

/**
 * Find supplier by Asgardeo subject ID
 * @param {string} asgardeoSub - Asgardeo subject ID
 * @returns {Promise<Object|null>} Supplier object or null
 */
async function findSupplierByAsgardeoSub(asgardeoSub) {
  try {
    const result = await supplierPool.query(
      "SELECT id, name, email, is_active FROM suppliers WHERE asgardeo_sub = $1",
      [asgardeoSub]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error("Error finding supplier by asgardeo_sub:", error);
    throw error;
  }
}

/**
 * Get supplier ID from authenticated user
 * @param {Object} user - req.user object from authentication middleware
 * @returns {Promise<number|null>} Supplier database ID or null
 */
async function getSupplierIdFromUser(user) {
  // Try email-based lookup first (primary method)
  const userEmail = user.email || user.username;
  if (userEmail) {
    const supplier = await findSupplierByEmail(userEmail);
    if (supplier) {
      if (!supplier.is_active) {
        const error = new Error("Supplier account is not active");
        error.statusCode = 403;
        throw error;
      }
      return supplier.id;
    }
  }

  // Fallback to asgardeo_sub lookup
  const asgardeoSub = user.sub;
  if (asgardeoSub) {
    const supplier = await findSupplierByAsgardeoSub(asgardeoSub);
    if (supplier) {
      if (!supplier.is_active) {
        const error = new Error("Supplier account is not active");
        error.statusCode = 403;
        throw error;
      }
      return supplier.id;
    }
  }

  // No supplier found
  const error = new Error("Supplier profile not found");
  error.statusCode = 404;
  throw error;
}

module.exports = {
  findSupplierByEmail,
  findSupplierByAsgardeoSub,
  getSupplierIdFromUser,
  supplierPool,
};
