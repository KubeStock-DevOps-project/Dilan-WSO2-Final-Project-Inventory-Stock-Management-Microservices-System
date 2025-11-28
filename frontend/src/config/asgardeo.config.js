/**
 * Asgardeo Frontend Configuration
 *
 * Setup Instructions:
 * 1. Go to https://console.asgardeo.io
 * 2. Create a Single Page Application
 * 3. Configure authorized redirect URLs
 * 4. Copy Client ID to .env file
 */

// Debug: Log environment variables
console.log("🔧 Asgardeo Config Debug:");
console.log(
  "  VITE_ASGARDEO_BASE_URL:",
  import.meta.env.VITE_ASGARDEO_BASE_URL
);
console.log(
  "  VITE_ASGARDEO_CLIENT_ID:",
  import.meta.env.VITE_ASGARDEO_CLIENT_ID
);
console.log("  VITE_APP_URL:", import.meta.env.VITE_APP_URL);

const baseUrl =
  import.meta.env.VITE_ASGARDEO_BASE_URL ||
  "https://api.asgardeo.io/t/dilanorg";
const clientID = import.meta.env.VITE_ASGARDEO_CLIENT_ID;
const redirectURL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

if (!clientID) {
  console.error(
    "❌ VITE_ASGARDEO_CLIENT_ID is not set in environment variables!"
  );
}

export const asgardeoConfig = {
  // Your Asgardeo organization name (from yourorg.asgardeo.io)
  baseUrl: baseUrl,

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
  storage: "sessionStorage", // or 'localStorage'

  // Disable default session validation
  validateIDTokenIssuer: true,

  // Clock tolerance for token validation (in seconds)
  clockTolerance: 60,
};

console.log("✅ Asgardeo Config Created:");
console.log("  Base URL:", asgardeoConfig.baseUrl);
console.log("  Client ID:", asgardeoConfig.clientID ? "Set ✓" : "Missing ✗");
console.log("  Redirect URL:", asgardeoConfig.signInRedirectURL);

export default asgardeoConfig;
