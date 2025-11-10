# 🚀 Quick Start Guide - Frontend

## Starting the Frontend

### Option 1: Development Mode (Recommended for Development)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:5173**

### Option 2: Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔐 Login Credentials

Use these demo credentials to test the application:

**Admin User:**
```
Email: admin@ims.com
Password: admin123
Role: admin
```

## 🎯 First Steps After Login

1. **Dashboard**: View system overview and statistics
2. **Products**: Browse and manage product catalog
3. **Inventory**: Check stock levels
4. **Health Monitor** (Admin only): Check all microservices status

## 📡 Backend Connection

Make sure your backend services are running:

```bash
# In the backend directory
cd ../backend
docker-compose up -d
```

The frontend expects these services:
- User Service: http://localhost:3001
- Product Service: http://localhost:3002
- Inventory Service: http://localhost:3003
- Supplier Service: http://localhost:3004
- Order Service: http://localhost:3005

## 🎨 Features to Explore

### ✅ Fully Functional
- Login/Register/Forgot Password
- Role-based dashboards
- Product listing and search
- Add new products
- Health monitoring dashboard
- Responsive sidebar navigation

### 🚧 Ready for Expansion
- Inventory management
- Stock movements
- Supplier management
- Purchase orders
- Order management

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Change port in vite.config.js
server: {
  port: 5174, // Change to any available port
}
```

### API Connection Errors
Check `.env` file has correct backend URLs:
```env
VITE_API_BASE_URL=http://localhost:3001
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Mobile Testing

The app is fully responsive. Test on mobile by accessing:
```
http://YOUR_IP:5173
```

## 🐳 Docker Quick Start

```bash
# Build image
docker build -t inventory-frontend .

# Run container
docker run -p 80:80 inventory-frontend
```

Access at **http://localhost**

---

**Ready to start development!** 🎉
