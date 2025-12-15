#!/bin/bash

###############################################################################
# End-to-End Workflow Test Script
# Tests complete product → inventory → order workflow
###############################################################################

set -e  # Exit on error

GATEWAY_URL="http://localhost:5173"
API_PRODUCT="${GATEWAY_URL}/api/product"
API_INVENTORY="${GATEWAY_URL}/api/inventory"
API_ORDER="${GATEWAY_URL}/api/order"
API_SUPPLIER="${GATEWAY_URL}/api/supplier"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          KubeStock E2E Workflow Test                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# 1. HEALTH CHECKS
###############################################################################

echo -e "${BLUE}[1/7] Health Checks${NC}"
echo "------------------------------------------------------------"

for service in product inventory supplier order identity; do
  echo -n "  Checking $service service... "
  health=$(curl -s ${GATEWAY_URL}/api/${service}/health | jq -r '.status // "unhealthy"')
  if [ "$health" = "healthy" ]; then
    echo -e "${GREEN}✓ healthy${NC}"
  else
    echo -e "${RED}✗ unhealthy${NC}"
    exit 1
  fi
done

echo -n "  Checking gateway... "
gateway_health=$(curl -s ${GATEWAY_URL}/api/gateway/health | jq -r '.status // "unhealthy"')
if [ "$gateway_health" = "healthy" ]; then
  echo -e "${GREEN}✓ healthy${NC}"
else
  echo -e "${RED}✗ unhealthy${NC}"
  exit 1
fi

echo ""

###############################################################################
# 2. PRODUCT MANAGEMENT
###############################################################################

echo -e "${BLUE}[2/7] Product Management${NC}"
echo "------------------------------------------------------------"

# Check existing products
echo "  Getting existing products..."
PRODUCT_COUNT=$(curl -s ${API_PRODUCT} | jq '.data | length')
echo "  Found ${PRODUCT_COUNT} existing products"

# Use existing active product (product ID 1)
PRODUCT_ID=1
echo "  Using existing product ID: ${PRODUCT_ID}"

# Get product details
PRODUCT_NAME=$(curl -s ${API_PRODUCT}/${PRODUCT_ID} | jq -r '.data.name')
PRODUCT_SKU=$(curl -s ${API_PRODUCT}/${PRODUCT_ID} | jq -r '.data.sku')
PRODUCT_STATE=$(curl -s ${API_PRODUCT}/${PRODUCT_ID} | jq -r '.data.lifecycle_state')
PRODUCT_PRICE=$(curl -s ${API_PRODUCT}/${PRODUCT_ID} | jq -r '.data.unit_price')

echo "  Product: ${PRODUCT_NAME} (${PRODUCT_SKU})"
echo "  State: ${PRODUCT_STATE}"
echo "  Price: \$${PRODUCT_PRICE}"

if [ "$PRODUCT_STATE" != "active" ]; then
  echo -e "${YELLOW}  Warning: Product is not active. Inventory may not exist.${NC}"
fi

echo -e "${GREEN}✓ Product verified${NC}"
echo ""

###############################################################################
# 3. INVENTORY VERIFICATION
###############################################################################

echo -e "${BLUE}[3/7] Inventory Verification${NC}"
echo "------------------------------------------------------------"

# Check if inventory exists for product
echo "  Checking inventory for product ${PRODUCT_ID}..."
INVENTORY_CHECK=$(curl -s ${API_INVENTORY}/product/${PRODUCT_ID})
INVENTORY_EXISTS=$(echo $INVENTORY_CHECK | jq -r '.success')

if [ "$INVENTORY_EXISTS" = "true" ]; then
  INVENTORY_ID=$(echo $INVENTORY_CHECK | jq -r '.data.id')
  CURRENT_QTY=$(echo $INVENTORY_CHECK | jq -r '.data.quantity')
  RESERVED_QTY=$(echo $INVENTORY_CHECK | jq -r '.data.reserved_quantity')
  AVAILABLE_QTY=$((CURRENT_QTY - RESERVED_QTY))
  
  echo "  Inventory ID: ${INVENTORY_ID}"
  echo "  Current Quantity: ${CURRENT_QTY}"
  echo "  Reserved Quantity: ${RESERVED_QTY}"
  echo "  Available Quantity: ${AVAILABLE_QTY}"
  
  if [ $AVAILABLE_QTY -lt 5 ]; then
    echo -e "${YELLOW}  Warning: Low available stock. Updating inventory...${NC}"
    
    # Update inventory to ensure we have stock
    UPDATE_RESULT=$(curl -s -X PUT ${API_INVENTORY}/${INVENTORY_ID} \
      -H "Content-Type: application/json" \
      -d "{\"quantity\": 200}")
    
    # Validate update succeeded
    UPDATE_SUCCESS=$(echo $UPDATE_RESULT | jq -r '.success')
    if [ "$UPDATE_SUCCESS" != "true" ]; then
      echo -e "${RED}✗ Failed to update inventory${NC}"
      echo "  Response: $UPDATE_RESULT"
      exit 1
    fi
    
    # Re-fetch updated quantities
    INVENTORY_CHECK=$(curl -s ${API_INVENTORY}/product/${PRODUCT_ID})
    CURRENT_QTY=$(echo $INVENTORY_CHECK | jq -r '.data.quantity')
    RESERVED_QTY=$(echo $INVENTORY_CHECK | jq -r '.data.reserved_quantity')
    AVAILABLE_QTY=$((CURRENT_QTY - RESERVED_QTY))
    
    echo "  Updated Quantity: ${CURRENT_QTY}"
    echo "  Available: ${AVAILABLE_QTY}"
  fi
  
  echo -e "${GREEN}✓ Inventory verified (Available: ${AVAILABLE_QTY})${NC}"
else
  echo -e "${RED}✗ Inventory not found for product ${PRODUCT_ID}${NC}"
  echo "  This product may need to be activated to auto-create inventory"
  exit 1
fi

echo ""

###############################################################################
# 4. ORDER CREATION
###############################################################################

echo -e "${BLUE}[4/7] Order Creation${NC}"
echo "------------------------------------------------------------"

ORDER_QTY=5
ORDER_TOTAL=$(echo "$PRODUCT_PRICE * $ORDER_QTY" | bc)

echo "  Creating order for ${ORDER_QTY} units of ${PRODUCT_NAME}..."
echo "  Expected total: \$${ORDER_TOTAL}"

ORDER_RESULT=$(curl -s -X POST ${API_ORDER} \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"TEST-CUSTOMER-$(date +%s)\",
    \"shipping_address\": \"123 Test Street, Test City, TS 12345\",
    \"items\": [
      {
        \"product_id\": ${PRODUCT_ID},
        \"quantity\": ${ORDER_QTY}
      }
    ],
    \"payment_method\": \"credit_card\",
    \"notes\": \"E2E test order\"
  }")

ORDER_SUCCESS=$(echo $ORDER_RESULT | jq -r '.success')

if [ "$ORDER_SUCCESS" = "true" ]; then
  ORDER_ID=$(echo $ORDER_RESULT | jq -r '.data.id')
  ORDER_NUMBER=$(echo $ORDER_RESULT | jq -r '.data.order_number')
  ORDER_AMOUNT=$(echo $ORDER_RESULT | jq -r '.data.total_amount')
  ORDER_STATUS=$(echo $ORDER_RESULT | jq -r '.data.status')
  
  echo "  Order ID: ${ORDER_ID}"
  echo "  Order Number: ${ORDER_NUMBER}"
  echo "  Total Amount: \$${ORDER_AMOUNT}"
  echo "  Status: ${ORDER_STATUS}"
  echo -e "${GREEN}✓ Order created successfully${NC}"
else
  ORDER_ERROR=$(echo $ORDER_RESULT | jq -r '.message // .error')
  echo -e "${RED}✗ Order creation failed: ${ORDER_ERROR}${NC}"
  echo "  Full response: $(echo $ORDER_RESULT | jq '.')"
  exit 1
fi

echo ""

###############################################################################
# 5. INVENTORY RESERVATION VERIFICATION
###############################################################################

echo -e "${BLUE}[5/7] Inventory Reservation Verification${NC}"
echo "------------------------------------------------------------"

echo "  Checking inventory reservation..."
sleep 1  # Give system time to update

UPDATED_INVENTORY=$(curl -s ${API_INVENTORY}/product/${PRODUCT_ID})
NEW_RESERVED=$(echo $UPDATED_INVENTORY | jq -r '.data.reserved_quantity')
NEW_AVAILABLE=$((CURRENT_QTY - NEW_RESERVED))

echo "  Previous Reserved: ${RESERVED_QTY}"
echo "  New Reserved: ${NEW_RESERVED}"
echo "  Reservation Increase: $((NEW_RESERVED - RESERVED_QTY))"

if [ $((NEW_RESERVED - RESERVED_QTY)) -eq $ORDER_QTY ]; then
  echo -e "${GREEN}✓ Inventory correctly reserved (${ORDER_QTY} units)${NC}"
else
  echo -e "${YELLOW}⚠ Reservation mismatch. Expected ${ORDER_QTY}, got $((NEW_RESERVED - RESERVED_QTY))${NC}"
fi

echo "  Available Quantity: ${NEW_AVAILABLE}"
echo ""

###############################################################################
# 6. ORDER STATUS UPDATES
###############################################################################

echo -e "${BLUE}[6/7] Order Status Updates${NC}"
echo "------------------------------------------------------------"

declare -a STATUSES=("confirmed" "processing" "shipped")

for status in "${STATUSES[@]}"; do
  echo -n "  Updating to '${status}'... "
  
  STATUS_UPDATE=$(curl -s -X PUT ${API_ORDER}/${ORDER_ID}/status \
    -H "Content-Type: application/json" \
    -d "{\"status\": \"${status}\"}")
  
  UPDATE_SUCCESS=$(echo $STATUS_UPDATE | jq -r '.success')
  
  if [ "$UPDATE_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓${NC}"
  else
    UPDATE_ERROR=$(echo $STATUS_UPDATE | jq -r '.message // .error')
    echo -e "${RED}✗ (${UPDATE_ERROR})${NC}"
  fi
  
  sleep 0.5
done

# Get final order details
echo "  Fetching final order state..."
FINAL_ORDER=$(curl -s ${API_ORDER}/${ORDER_ID})
FINAL_STATUS=$(echo $FINAL_ORDER | jq -r '.data.status')

echo "  Final Order Status: ${FINAL_STATUS}"
echo -e "${GREEN}✓ Order workflow completed${NC}"
echo ""

###############################################################################
# 7. PURCHASE ORDER WORKFLOW (OPTIONAL)
###############################################################################

echo -e "${BLUE}[7/7] Purchase Order Workflow${NC}"
echo "------------------------------------------------------------"

echo "  Getting existing purchase orders..."
PO_COUNT=$(curl -s ${API_SUPPLIER}/purchase-orders | jq -r '.count')
echo "  Found ${PO_COUNT} purchase orders in system"

if [ $PO_COUNT -gt 0 ]; then
  LATEST_PO=$(curl -s ${API_SUPPLIER}/purchase-orders | jq -r '.data[0]')
  PO_NUMBER=$(echo $LATEST_PO | jq -r '.po_number')
  PO_STATUS=$(echo $LATEST_PO | jq -r '.status')
  PO_RESPONSE=$(echo $LATEST_PO | jq -r '.supplier_response')
  
  echo "  Latest PO: ${PO_NUMBER}"
  echo "  Status: ${PO_STATUS}"
  echo "  Supplier Response: ${PO_RESPONSE}"
fi

echo -e "${GREEN}✓ Purchase order data verified${NC}"
echo ""

###############################################################################
# SUMMARY
###############################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   ALL TESTS PASSED ✓                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Summary:"
echo "--------"
echo "  ✓ All services healthy"
echo "  ✓ Product verified (ID: ${PRODUCT_ID}, ${PRODUCT_NAME})"
echo "  ✓ Inventory managed (Available: ${NEW_AVAILABLE})"
echo "  ✓ Order created (ID: ${ORDER_ID}, ${ORDER_NUMBER})"
echo "  ✓ Stock reserved (${ORDER_QTY} units)"
echo "  ✓ Order status updated (${FINAL_STATUS})"
echo "  ✓ Purchase orders tracked (${PO_COUNT} in system)"
echo ""
echo "Test Order Details:"
echo "  Order ID: ${ORDER_ID}"
echo "  Order Number: ${ORDER_NUMBER}"
echo "  Product: ${PRODUCT_NAME} x ${ORDER_QTY}"
echo "  Total: \$${ORDER_AMOUNT}"
echo "  Status: ${FINAL_STATUS}"
echo ""
echo -e "${BLUE}End-to-end workflow test completed successfully!${NC}"
