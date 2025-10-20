# Supplier & Procurement Service

Complete Node.js microservice for supplier management and purchase order processing.

## API Endpoints

### Suppliers
- POST /api/suppliers - Create supplier
- GET /api/suppliers - List all suppliers
- GET /api/suppliers/:id - Get supplier details
- PUT /api/suppliers/:id - Update supplier
- DELETE /api/suppliers/:id - Delete supplier

### Purchase Orders
- POST /api/purchase-orders - Create PO
- GET /api/purchase-orders - List all POs
- GET /api/purchase-orders/:id - Get PO details
- PUT /api/purchase-orders/:id - Update PO
- PUT /api/purchase-orders/:id/receive - Mark as received (updates inventory)
- DELETE /api/purchase-orders/:id - Delete PO

## Features
- Supplier management with ratings
- Purchase order lifecycle management
- Automatic inventory updates on PO receipt
- Inter-service communication with Product and Inventory services
- Transaction support for data consistency

## Environment Variables
```
PORT=3004
DB_HOST=postgres
DB_NAME=supplier_db
PRODUCT_SERVICE_URL=http://product-catalog-service:3002
INVENTORY_SERVICE_URL=http://inventory-service:3003
```
