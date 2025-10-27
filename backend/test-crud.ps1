# CRUD Testing Script for All Microservices
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CRUD Operations Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrls = @{
    "User Service" = "http://localhost:3001/api"
    "Product Catalog Service" = "http://localhost:3002/api"
    "Inventory Service" = "http://localhost:3003/api"
    "Supplier Service" = "http://localhost:3004/api"
    "Order Service" = "http://localhost:3005/api"
}

$testResults = @()

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Description,
        [hashtable]$Body = $null,
        [hashtable]$Headers = @{"Content-Type" = "application/json"}
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "  ➤ $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "  Body: $($params.Body)" -ForegroundColor DarkGray
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor DarkGreen
        Write-Host ""
        
        return @{
            Test = $Description
            Status = "PASS"
            Method = $Method
            Url = $Url
            Response = $response
        }
    }
    catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor DarkRed
        Write-Host ""
        
        return @{
            Test = $Description
            Status = "FAIL"
            Method = $Method
            Url = $Url
            Error = $_.Exception.Message
        }
    }
}

# ============================================
# 1. USER SERVICE TESTS (Port 3001)
# ============================================
Write-Host "`n==== USER SERVICE CRUD TESTS ====" -ForegroundColor Magenta

# CREATE User
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['User Service'])/users/register" -Description "CREATE User" -Body @{
    username = "testuser_$(Get-Date -Format 'HHmmss')"
    email = "testuser_$(Get-Date -Format 'HHmmss')@example.com"
    password = "Test123456!"
    role = "warehouse_manager"
    full_name = "Test User"
}

# READ Users (List)
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['User Service'])/users" -Description "READ Users (List)"

# READ User by ID (will use ID 1 if exists)
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['User Service'])/users/1" -Description "READ User by ID"

# UPDATE User
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['User Service'])/users/1" -Description "UPDATE User" -Body @{
    full_name = "Updated Test User"
    is_active = $true
}

# DELETE User (skip to avoid breaking test user)
# $testResults += Test-Endpoint -Method "DELETE" -Url "$($baseUrls['User Service'])/users/999" -Description "DELETE User"

# ============================================
# 2. PRODUCT CATALOG SERVICE TESTS (Port 3002)
# ============================================
Write-Host "`n==== PRODUCT CATALOG SERVICE CRUD TESTS ====" -ForegroundColor Magenta

# CREATE Category
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Product Catalog Service'])/categories" -Description "CREATE Category" -Body @{
    name = "Test Category $(Get-Date -Format 'HHmmss')"
    description = "Test category for CRUD testing"
}

# READ Categories
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Product Catalog Service'])/categories" -Description "READ Categories (List)"

# CREATE Product
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Product Catalog Service'])/products" -Description "CREATE Product" -Body @{
    sku = "TEST-SKU-$(Get-Date -Format 'HHmmss')"
    name = "Test Product $(Get-Date -Format 'HHmmss')"
    description = "Test product for CRUD testing"
    category_id = 1
    unit_price = 99.99
    reorder_point = 10
    reorder_quantity = 50
}

# READ Products
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Product Catalog Service'])/products" -Description "READ Products (List)"

# READ Product by ID
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Product Catalog Service'])/products/1" -Description "READ Product by ID"

# UPDATE Product
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['Product Catalog Service'])/products/1" -Description "UPDATE Product" -Body @{
    name = "Updated Product Name"
    unit_price = 109.99
}

# DELETE Product (will use a test product)
# $testResults += Test-Endpoint -Method "DELETE" -Url "$($baseUrls['Product Catalog Service'])/products/999" -Description "DELETE Product"

# ============================================
# 3. INVENTORY SERVICE TESTS (Port 3003)
# ============================================
Write-Host "`n==== INVENTORY SERVICE CRUD TESTS ====" -ForegroundColor Magenta

# CREATE Inventory
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Inventory Service'])/inventory" -Description "CREATE Inventory" -Body @{
    product_id = 1
    quantity = 100
    location = "Warehouse-A-01"
    batch_number = "BATCH-$(Get-Date -Format 'HHmmss')"
}

# READ Inventory (List)
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Inventory Service'])/inventory" -Description "READ Inventory (List)"

# READ Inventory by ID (NEW ENDPOINT)
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Inventory Service'])/inventory/1" -Description "READ Inventory by ID (NEW)"

# READ Inventory by Product ID
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Inventory Service'])/inventory/product/1" -Description "READ Inventory by Product ID"

# UPDATE Inventory
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['Inventory Service'])/inventory/product/1" -Description "UPDATE Inventory" -Body @{
    quantity = 150
    location = "Warehouse-A-02"
}

# Stock Movement
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Inventory Service'])/inventory/product/1/movement" -Description "CREATE Stock Movement" -Body @{
    quantity = 10
    movement_type = "adjustment"
    reason = "CRUD test adjustment"
}

# READ Stock Movements
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Inventory Service'])/inventory/movements" -Description "READ Stock Movements"

# DELETE Inventory (NEW ENDPOINT - will test with non-existent product to avoid breaking data)
$testResults += Test-Endpoint -Method "DELETE" -Url "$($baseUrls['Inventory Service'])/inventory/product/9999" -Description "DELETE Inventory (NEW - expected to fail)"

# ============================================
# 4. SUPPLIER SERVICE TESTS (Port 3004)
# ============================================
Write-Host "`n==== SUPPLIER SERVICE CRUD TESTS ====" -ForegroundColor Magenta

# CREATE Supplier
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Supplier Service'])/suppliers" -Description "CREATE Supplier" -Body @{
    name = "Test Supplier $(Get-Date -Format 'HHmmss')"
    contact_person = "John Doe"
    email = "supplier_$(Get-Date -Format 'HHmmss')@example.com"
    phone = "+1234567890"
    address = "123 Test Street"
    payment_terms = "Net 30"
}

# READ Suppliers
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Supplier Service'])/suppliers" -Description "READ Suppliers (List)"

# READ Supplier by ID
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Supplier Service'])/suppliers/1" -Description "READ Supplier by ID"

# UPDATE Supplier
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['Supplier Service'])/suppliers/1" -Description "UPDATE Supplier" -Body @{
    name = "Updated Supplier Name"
    payment_terms = "Net 45"
}

# CREATE Purchase Order
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Supplier Service'])/purchase-orders" -Description "CREATE Purchase Order" -Body @{
    supplier_id = 1
    expected_delivery_date = "2024-12-31"
    items = @(
        @{
            product_id = 1
            quantity = 100
            unit_price = 50.00
        }
    )
}

# READ Purchase Orders
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Supplier Service'])/purchase-orders" -Description "READ Purchase Orders (List)"

# READ Purchase Order by ID
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Supplier Service'])/purchase-orders/1" -Description "READ Purchase Order by ID"

# UPDATE Purchase Order (NEW ENDPOINT)
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['Supplier Service'])/purchase-orders/1" -Description "UPDATE Purchase Order (NEW)" -Body @{
    expected_delivery_date = "2025-01-15"
    notes = "Updated delivery date"
}

# UPDATE Purchase Order Status
$testResults += Test-Endpoint -Method "PATCH" -Url "$($baseUrls['Supplier Service'])/purchase-orders/1/status" -Description "UPDATE PO Status" -Body @{
    status = "approved"
}

# DELETE Purchase Order (NEW ENDPOINT - will test with non-existent)
$testResults += Test-Endpoint -Method "DELETE" -Url "$($baseUrls['Supplier Service'])/purchase-orders/9999" -Description "DELETE Purchase Order (NEW - expected to fail)"

# ============================================
# 5. ORDER SERVICE TESTS (Port 3005)
# ============================================
Write-Host "`n==== ORDER SERVICE CRUD TESTS ====" -ForegroundColor Magenta

# CREATE Order
$testResults += Test-Endpoint -Method "POST" -Url "$($baseUrls['Order Service'])/orders" -Description "CREATE Order" -Body @{
    customer_name = "Test Customer"
    customer_email = "customer@example.com"
    shipping_address = "456 Test Avenue"
    items = @(
        @{
            product_id = 1
            quantity = 5
            unit_price = 99.99
        }
    )
}

# READ Orders
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Order Service'])/orders" -Description "READ Orders (List)"

# READ Order by ID
$testResults += Test-Endpoint -Method "GET" -Url "$($baseUrls['Order Service'])/orders/1" -Description "READ Order by ID"

# UPDATE Order (NEW ENDPOINT)
$testResults += Test-Endpoint -Method "PUT" -Url "$($baseUrls['Order Service'])/orders/1" -Description "UPDATE Order (NEW)" -Body @{
    shipping_address = "789 Updated Street"
    notes = "Address updated via CRUD test"
}

# UPDATE Order Status
$testResults += Test-Endpoint -Method "PATCH" -Url "$($baseUrls['Order Service'])/orders/1/status" -Description "UPDATE Order Status" -Body @{
    status = "processing"
}

# DELETE Order (will use cancel endpoint)
# $testResults += Test-Endpoint -Method "DELETE" -Url "$($baseUrls['Order Service'])/orders/9999" -Description "DELETE Order (expected to fail)"

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 2))%" -ForegroundColor Yellow

if ($failedTests -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  ✗ $($_.Test)" -ForegroundColor Red
        Write-Host "    Method: $($_.Method) | URL: $($_.Url)" -ForegroundColor DarkRed
        Write-Host "    Error: $($_.Error)" -ForegroundColor DarkRed
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
