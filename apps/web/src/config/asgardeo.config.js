/**
 * Asgardeo Frontend Configuration
 *
 * Setup Instructions:
 * 1. Go to https://console.asgardeo.io
 * 2. Create a Single Page Application
 * 3. Configure authorized redirect URLs
 * 4. Copy Client ID to .env file
 * 
 * Runtime Config:
 * In production, environment variables are injected at container startup
 * via window.__RUNTIME_CONFIG__ (see public/config.js and entrypoint.sh)
 */

/**
 * Get config value with runtime config taking precedence over build-time env
 * @param {string} key - The config key (e.g., 'VITE_ASGARDEO_CLIENT_ID')
 * @param {string} defaultValue - Default value if not found
 */
const getConfig = (key, defaultValue = "") => {
  // Check runtime config first (injected at container startup)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__ && window.__RUNTIME_CONFIG__[key]) {
    const value = window.__RUNTIME_CONFIG__[key];
    // Skip placeholder values (not yet replaced by entrypoint.sh)
    if (!value.startsWith('__') || !value.endsWith('__')) {
      return value;
    }
  }
  // Fall back to Vite build-time env (for local development)
  return import.meta.env[key] || defaultValue;
};

// Get environment variables with proper fallbacks
const baseUrl = getConfig('VITE_ASGARDEO_BASE_URL', "https://api.asgardeo.io/t/kubestock");
const orgName = getConfig('VITE_ASGARDEO_ORG_NAME', "kubestock");
const clientID = getConfig('VITE_ASGARDEO_CLIENT_ID', "");
const redirectURL = getConfig('VITE_APP_URL', "http://localhost:5173");

// Construct baseUrl from org name if not explicitly set
const effectiveBaseUrl = baseUrl || `https://api.asgardeo.io/t/${orgName}`;

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log("🔧 Asgardeo Config:");
  console.log("  baseUrl:", effectiveBaseUrl);
  console.log("  clientID:", clientID ? "Set ✓" : "Missing ✗");
  console.log("  redirectURL:", redirectURL);
  console.log("  Runtime config available:", typeof window !== 'undefined' && !!window.__RUNTIME_CONFIG__);
}

if (!clientID) {
  console.error("❌ VITE_ASGARDEO_CLIENT_ID is not set! Check environment variables or runtime config.");
}

export const asgardeoConfig = {
  // Your Asgardeo organization name (from yourorg.asgardeo.io)
  baseUrl: effectiveBaseUrl,

  // Client ID from Asgardeo console
  clientID: clientID,

  // Redirect URLs
  signInRedirectURL: redirectURL,
  signOutRedirectURL: redirectURL,

  // OAuth scopes
  scope: ["openid", "profile", "email", "groups"],

  // Enable PKCE (recommended for SPAs)
  enablePKCE: true,

  // Response mode
  responseMode: "query",

  // Storage type
  storage: "sessionStorage",

  // Token validation
  validateIDTokenIssuer: true,

  // Clock tolerance for token validation (in seconds)
  clockTolerance: 60,
};

if (import.meta.env.DEV) {
  console.log("✅ Asgardeo Config:", {
    baseUrl: asgardeoConfig.baseUrl,
    clientID: asgardeoConfig.clientID ? "Set ✓" : "Missing ✗",
    signInRedirectURL: asgardeoConfig.signInRedirectURL,
  });
}

export default asgardeoConfig;
