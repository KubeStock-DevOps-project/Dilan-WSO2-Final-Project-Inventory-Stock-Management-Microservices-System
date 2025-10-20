# Quick Start Guide

## Prerequisites
- Docker & Docker Compose installed
- Git installed

## Installation Steps

### 1. Start the System
```powershell
# Navigate to backend directory
cd "d:\WSO2\Final Project\Inventory Stock Management Microservices System\backend"

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 2. Verify Services
```powershell
# Check all services are running
docker-compose ps

# Test health endpoints
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # Product Catalog
curl http://localhost:3003/health  # Inventory
curl http://localhost:3004/health  # Supplier
curl http://localhost:3005/health  # Order
```

### 3. Test the API

**Register a User:**
```powershell
curl -X POST http://localhost:3001/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"password123\",\"role\":\"warehouse_staff\"}'
```

**Login:**
```powershell
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"password123\"}'
```

**Create a Product:**
```powershell
curl -X POST http://localhost:3002/api/products `
  -H "Content-Type: application/json" `
  -d '{\"sku\":\"PROD-001\",\"name\":\"Test Product\",\"unit_price\":99.99}'
```

### 4. Stop the System
```powershell
docker-compose down

# Remove volumes (database data)
docker-compose down -v
```

## Development Mode (Without Docker)

### 1. Install PostgreSQL
```powershell
# Install PostgreSQL 15+ and create databases
psql -U postgres -f database/init.sql
```

### 2. Install Dependencies
```powershell
cd services/user-service
npm install
cd ../..

cd services/product-catalog-service
npm install
cd ../..

cd services/inventory-service
npm install
cd ../..
```

### 3. Start Services
```powershell
# Each in separate terminal
cd services/user-service; npm run dev
cd services/product-catalog-service; npm run dev
cd services/inventory-service; npm run dev
cd services/supplier-service; npm run dev
cd services/order-service; npm run dev
```

## Troubleshooting

**Port Already in Use:**
```powershell
# Find process using port
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

**Database Connection Failed:**
```powershell
# Check PostgreSQL is running
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

**Service Not Starting:**
```powershell
# View service logs
docker-compose logs user-service

# Rebuild service
docker-compose up --build user-service
```

## Next Steps
- Read the full README.md for detailed documentation
- Check DEVOPS_INTEGRATION.md for Kubernetes deployment
- Implement full Supplier and Order service functionality
- Add unit tests
- Configure CI/CD pipeline
