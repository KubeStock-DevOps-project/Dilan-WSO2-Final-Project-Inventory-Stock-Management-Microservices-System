const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { asgardeo } = require('../config/asgardeo.config');

/**
 * Asgardeo Authentication Middleware
 * Validates OAuth 2.0 access tokens from Asgardeo
 */

// Initialize JWKS client for token signature verification
const client = jwksClient({
  jwksUri: asgardeo.jwksUri || `${asgardeo.baseUrl}/oauth2/jwks`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10
});

// Get signing key from JWKS
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verify and decode Asgardeo access token
 */
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: asgardeo.audience,
        issuer: asgardeo.issuer,
        algorithms: ['RS256'],
        clockTolerance: asgardeo.tokenValidation.clockTolerance
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
}

/**
 * Get user info from Asgardeo userinfo endpoint
 */
async function getUserInfo(accessToken) {
  try {
    const response = await axios.get(`${asgardeo.baseUrl}/oauth2/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user info:', error.message);
    return null;
  }
}

/**
 * Main authentication middleware
 */
const authenticateAsgardeo = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = await verifyToken(token);

    // Get additional user info from userinfo endpoint
    const userInfo = await getUserInfo(token);

    // Attach user information to request
    req.user = {
      sub: decoded.sub,
      username: decoded.username || userInfo?.username,
      email: decoded.email || userInfo?.email,
      roles: decoded.groups || decoded.roles || [],
      scope: decoded.scope,
      ...userInfo
    };

    req.accessToken = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(role => 
      userRoles.includes(role) || 
      userRoles.includes(role.toLowerCase())
    );

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredRoles: allowedRoles,
        userRoles: userRoles
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);
      const userInfo = await getUserInfo(token);
      
      req.user = {
        sub: decoded.sub,
        username: decoded.username || userInfo?.username,
        email: decoded.email || userInfo?.email,
        roles: decoded.groups || decoded.roles || [],
        scope: decoded.scope,
        ...userInfo
      };
      
      req.accessToken = token;
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

module.exports = {
  authenticateAsgardeo,
  authorizeRoles,
  optionalAuth,
  verifyToken,
  getUserInfo
};
