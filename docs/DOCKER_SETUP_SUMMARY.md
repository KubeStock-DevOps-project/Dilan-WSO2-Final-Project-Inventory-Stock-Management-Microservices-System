# Docker Setup Summary - Inventory Stock Management System

## ✅ Setup Completed Successfully

**Date:** October 27, 2025

---

## 🐳 Running Containers

All 6 containers are up and healthy:

| Container Name | Status | Port Mapping | Health Status |
|---------------|---------|--------------|---------------|
| **ims-postgres** | Running | 5432:5432 | ✅ Healthy |
| **user-service** | Running | 3001:3001 | ✅ Healthy |
| **product-catalog-service** | Running | 3002:3002 | ✅ Healthy |
| **inventory-service** | Running | 3003:3003 | ✅ Healthy |
| **supplier-service** | Running | 3004:3004 | ✅ Healthy |
| **order-service** | Running | 3005:3005 | ✅ Healthy |

---

## 🗄️ Database Configuration

### PostgreSQL Server
- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** postgres
- **Container:** ims-postgres

### Five Service Databases Created

| Database Name | Service | Tables | Purpose |
|--------------|---------|--------|---------|
| **user_service_db** | User Service (3001) | `users` | Authentication, authorization, user management |
| **product_catalog_db** | Product Catalog (3002) | `categories`, `products` | Product and category management |
| **inventory_db** | Inventory Service (3003) | `inventory`, `stock_movements` | Stock tracking and movements |
| **supplier_db** | Supplier Service (3004) | `suppliers`, `purchase_orders`, `purchase_order_items` | Supplier and procurement management |
| **order_db** | Order Service (3005) | `orders`, `order_items` | Sales order processing |

---

## 🔍 Database Details

### 1. User Service Database (`user_service_db`)
```sql
Tables:
  - users (id, username, email, password_hash, role, is_active, created_at, updated_at)

Indexes:
  - idx_users_email
  - idx_users_username
  - idx_users_role
```

### 2. Product Catalog Database (`product_catalog_db`)
```sql
Tables:
  - categories (id, name, description, created_at, updated_at)
  - products (id, sku, name, description, category_id, unit_price, attributes, is_active)

Indexes:
  - idx_products_sku
  - idx_products_category
  - idx_products_name
```

### 3. Inventory Database (`inventory_db`)
```sql
Tables:
  - inventory (id, product_id, sku, quantity, reserved_quantity, available_quantity, warehouse_location, reorder_level)
  - stock_movements (id, product_id, sku, movement_type, quantity, reference_type, notes, performed_by)

Indexes:
  - idx_inventory_product
  - idx_inventory_sku
  - idx_stock_movements_product
  - idx_stock_movements_type
```

### 4. Supplier Database (`supplier_db`)
```sql
Tables:
  - suppliers (id, name, contact_person, email, phone, address, rating, is_active)
  - purchase_orders (id, po_number, supplier_id, status, order_date, expected_delivery_date, total_amount)
  - purchase_order_items (id, po_id, product_id, sku, quantity, unit_price, received_quantity)

Indexes:
  - idx_suppliers_name
  - idx_purchase_orders_supplier
  - idx_purchase_orders_status
```

### 5. Order Database (`order_db`)
```sql
Tables:
  - orders (id, order_number, customer_id, status, order_date, total_amount, shipping_address, payment_status)
  - order_items (id, order_id, product_id, sku, product_name, quantity, unit_price)

Indexes:
  - idx_orders_customer
  - idx_orders_status
  - idx_orders_number
```

---

## 🌐 Service Endpoints

### Health Check Endpoints (All Working ✅)

```bash
# User Service
curl http://localhost:3001/health

# Product Catalog Service
curl http://localhost:3002/health

# Inventory Service
curl http://localhost:3003/health

# Supplier Service
curl http://localhost:3004/health

# Order Service
curl http://localhost:3005/health
```

### API Base URLs

- **User Service API:** http://localhost:3001/api
- **Product Catalog API:** http://localhost:3002/api
- **Inventory API:** http://localhost:3003/api
- **Supplier API:** http://localhost:3004/api
- **Order API:** http://localhost:3005/api

---

## 🔧 Docker Commands

### View Running Containers
```powershell
docker ps
```

### View Container Logs
```powershell
docker logs <container-name>
docker logs user-service
docker logs inventory-service --tail 50
docker logs -f product-catalog-service  # Follow logs
```

### Stop All Services
```powershell
cd backend
docker-compose down
```

### Start All Services
```powershell
cd backend
docker-compose up -d
```

### Restart a Specific Service
```powershell
docker restart <service-name>
docker restart inventory-service
```

### Rebuild and Restart All
```powershell
cd backend
docker-compose up -d --build
```

### Access PostgreSQL Database
```powershell
# Connect to PostgreSQL container
docker exec -it ims-postgres psql -U postgres

# List all databases
docker exec -it ims-postgres psql -U postgres -c "\l"

# Connect to a specific database
docker exec -it ims-postgres psql -U postgres -d user_service_db

# View tables in a database
docker exec -it ims-postgres psql -U postgres -d inventory_db -c "\dt"
```

---

## 🎨 Frontend

The React frontend is running on:
- **URL:** http://localhost:5173/
- **Alternative Networks:** 
  - http://172.27.192.1:5173/
  - http://192.168.56.1:5173/
  - http://192.168.8.133:5173/
  - http://172.28.128.1:5173/

---

## 📊 Database Connection Details for Each Service

### Connection Pattern (Used by all services)
```javascript
{
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "<service_specific_db>",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
}
```

### Environment Variables per Service

**User Service (Port 3001):**
- DB_HOST=postgres
- DB_NAME=user_service_db
- DB_USER=postgres
- DB_PASSWORD=postgres

**Product Catalog Service (Port 3002):**
- DB_HOST=postgres
- DB_NAME=product_catalog_db
- DB_USER=postgres
- DB_PASSWORD=postgres

**Inventory Service (Port 3003):**
- DB_HOST=postgres
- DB_NAME=inventory_db
- DB_USER=postgres
- DB_PASSWORD=postgres

**Supplier Service (Port 3004):**
- DB_HOST=postgres
- DB_NAME=supplier_db
- DB_USER=postgres
- DB_PASSWORD=postgres

**Order Service (Port 3005):**
- DB_HOST=postgres
- DB_NAME=order_db
- DB_USER=postgres
- DB_PASSWORD=postgres

---

## 🔐 AWS RDS Migration Preparation

When migrating to AWS RDS, you'll need to:

1. **Create RDS PostgreSQL Instance**
   - Engine: PostgreSQL 15.x
   - Instance class: Based on your needs (e.g., db.t3.micro for development)
   - Storage: At least 20 GB
   - Enable Multi-AZ for production
   - Configure security groups to allow access from your services

2. **Update Environment Variables**
   - Change `DB_HOST` from `postgres` to your RDS endpoint (e.g., `myinstance.xxxxx.us-east-1.rds.amazonaws.com`)
   - Update `DB_PASSWORD` to your secure RDS password
   - Keep `DB_PORT=5432`
   - Keep service-specific `DB_NAME` values

3. **Initialize RDS Databases**
   ```bash
   # Connect to RDS
   psql -h <rds-endpoint> -U postgres -p 5432
   
   # Run the init.sql script
   psql -h <rds-endpoint> -U postgres -p 5432 -f backend/database/init.sql
   ```

4. **Update docker-compose.yml**
   - Remove the `postgres` service definition
   - Update all service environment variables to point to RDS
   - Or use AWS Secrets Manager for credentials

---

## 📝 Issues Fixed During Setup

1. **Dockerfile npm ci Issue:** Changed from `npm ci --only=production` to `npm install` since package-lock.json files were not present
2. **Inventory Service Route Error:** Fixed route handler name from `getProductById` to `getInventoryByProduct` in `inventory.routes.js`

---

## ✅ Verification Checklist

- [x] PostgreSQL container running and healthy
- [x] All 5 service databases created
- [x] All database tables and indexes created
- [x] All 5 microservices running and healthy
- [x] All health endpoints responding with 200 OK
- [x] Frontend running on port 5173
- [x] Inter-service communication configured
- [x] Database connections established for all services

---

## 🚀 Next Steps

1. **Test API Endpoints:** Use the API_TESTING_GUIDE.md to test all endpoints
2. **Configure AWS RDS:** Follow the AWS RDS migration guide above
3. **Set up Monitoring:** Integrate Prometheus and Grafana for monitoring
4. **Deploy to Kubernetes:** Use the DEVOPS_INTEGRATION.md guide
5. **Configure CI/CD:** Set up ArgoCD for continuous deployment

---

## 📚 Additional Documentation

- `README.md` - Complete setup and usage guide
- `QUICKSTART.md` - Quick start guide
- `API_TESTING_GUIDE.md` - API endpoint testing
- `DEVOPS_INTEGRATION.md` - Kubernetes, ArgoCD, Prometheus setup
- `PRODUCTION_CHECKLIST.md` - Production deployment checklist

---

**System Status:** ✅ All services operational and ready for development
