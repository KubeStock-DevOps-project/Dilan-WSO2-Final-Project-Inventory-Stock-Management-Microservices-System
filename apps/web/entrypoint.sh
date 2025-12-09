#!/bin/sh
# =============================================================================
# Entrypoint script for frontend container
# Injects runtime environment variables into config.js
# =============================================================================

CONFIG_FILE="/usr/share/nginx/html/config.js"

# Replace placeholders with actual environment variable values
# Use empty string as default if env var is not set
sed -i "s|__VITE_ASGARDEO_CLIENT_ID__|${VITE_ASGARDEO_CLIENT_ID:-}|g" $CONFIG_FILE
sed -i "s|__VITE_ASGARDEO_ORG_NAME__|${VITE_ASGARDEO_ORG_NAME:-}|g" $CONFIG_FILE
sed -i "s|__VITE_ASGARDEO_BASE_URL__|${VITE_ASGARDEO_BASE_URL:-https://api.asgardeo.io/t/kubestock}|g" $CONFIG_FILE
sed -i "s|__VITE_APP_URL__|${VITE_APP_URL:-}|g" $CONFIG_FILE
sed -i "s|__VITE_API_GATEWAY_URL__|${VITE_API_GATEWAY_URL:-}|g" $CONFIG_FILE

echo "✅ Runtime config injected:"
cat $CONFIG_FILE

# Start nginx
exec nginx -g "daemon off;"
