/**
 * Token Decoder Middleware
 * 
 * IMPORTANT: This middleware DOES NOT validate JWT signatures.
 * Token validation is handled by Istio at the service mesh level.
 * 
 * This middleware simply decodes the JWT payload to extract user claims
 * for use in the application logic.
 * 
 * @module tokenDecoder
 */

/**
 * Decode JWT token and attach user info to request
 * Trusts that Istio has already validated the token
 */
const decodeToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    // Decode payload without verification (Istio handles validation)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    );

    // Attach user info to request
    req.user = {
      sub: payload.sub,                                    // Asgardeo unique ID
      email: payload.email,
      username: payload.username || payload.preferred_username || payload.email?.split('@')[0],
      fullName: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
      roles: payload.groups || payload.roles || [],
      scope: payload.scope
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token format'
    });
  }
};

/**
 * Optional token decoder - doesn't fail if no token present
 * Useful for routes that work with or without authentication
 */
const optionalDecodeToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const parts = token.split('.');

    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8')
      );

      req.user = {
        sub: payload.sub,
        email: payload.email,
        username: payload.username || payload.preferred_username || payload.email?.split('@')[0],
        fullName: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
        roles: payload.groups || payload.roles || [],
        scope: payload.scope
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
};

/**
 * Role-based authorization middleware
 * Must be used after decodeToken
 * 
 * @param {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/admin', decodeToken, requireRoles('admin'), handler);
 * router.get('/staff', decodeToken, requireRoles('admin', 'warehouse_staff'), handler);
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];
    
    // Check if user has any of the allowed roles
    // Supports both exact match and partial match (e.g., 'Admin' matches 'admin')
    const hasRole = allowedRoles.some(allowedRole =>
      userRoles.some(userRole =>
        userRole.toLowerCase() === allowedRole.toLowerCase() ||
        userRole.toLowerCase().includes(allowedRole.toLowerCase())
      )
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Helper to get user identifier (prefers email, falls back to sub)
 * Useful for database lookups
 * 
 * @param {Object} user - User object from req.user
 * @returns {string} User identifier
 */
const getUserIdentifier = (user) => {
  return user?.email || user?.sub || null;
};

module.exports = {
  decodeToken,
  optionalDecodeToken,
  requireRoles,
  getUserIdentifier
};
