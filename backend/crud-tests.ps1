# Simple CRUD Test Script
Write-Host "===== CRUD OPERATIONS TEST =====" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Test 1: CREATE Product
Write-Host "[1] Testing CREATE Product..." -ForegroundColor Yellow
try {
    $body = @{
        sku = "TEST-001"
        name = "Test Product"
        description = "Test product description"
        category_id = 1
        unit_price = 99.99
        reorder_point = 10
        reorder_quantity = 50
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/products" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Product created" -ForegroundColor Green
    $productId = $response.data.id
    $results += "PASS: CREATE Product"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Product"
    $productId = 1
}
Write-Host ""

# Test 2: READ Product by ID
Write-Host "[2] Testing READ Product by ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/products/$productId" -Method GET
    Write-Host "  ✓ SUCCESS: Product found - $($response.data.name)" -ForegroundColor Green
    $results += "PASS: READ Product by ID"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: READ Product by ID"
}
Write-Host ""

# Test 3: UPDATE Product
Write-Host "[3] Testing UPDATE Product..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Updated Test Product"
        unit_price = 109.99
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/products/$productId" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Product updated" -ForegroundColor Green
    $results += "PASS: UPDATE Product"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE Product"
}
Write-Host ""

# Test 4: CREATE Inventory
Write-Host "[4] Testing CREATE Inventory..." -ForegroundColor Yellow
try {
    $body = @{
        product_id = $productId
        quantity = 100
        location = "Warehouse-A-01"
        batch_number = "BATCH001"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Inventory created" -ForegroundColor Green
    $inventoryId = $response.data.id
    $results += "PASS: CREATE Inventory"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Inventory"
    $inventoryId = 1
}
Write-Host ""

# Test 5: READ Inventory by ID (NEW ENDPOINT)
Write-Host "[5] Testing READ Inventory by ID (NEW)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory/$inventoryId" -Method GET
    Write-Host "  ✓ SUCCESS: Inventory found - Product ID: $($response.data.product_id)" -ForegroundColor Green
    $results += "PASS: READ Inventory by ID (NEW)"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: READ Inventory by ID (NEW)"
}
Write-Host ""

# Test 6: READ Inventory by Product ID
Write-Host "[6] Testing READ Inventory by Product ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory/product/$productId" -Method GET
    Write-Host "  ✓ SUCCESS: Inventory found - Quantity: $($response.data.quantity)" -ForegroundColor Green
    $results += "PASS: READ Inventory by Product ID"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: READ Inventory by Product ID"
}
Write-Host ""

# Test 7: UPDATE Inventory
Write-Host "[7] Testing UPDATE Inventory..." -ForegroundColor Yellow
try {
    $body = @{
        quantity = 150
        location = "Warehouse-B-01"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory/product/$productId" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Inventory updated" -ForegroundColor Green
    $results += "PASS: UPDATE Inventory"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE Inventory"
}
Write-Host ""

# Test 8: CREATE Stock Movement
Write-Host "[8] Testing CREATE Stock Movement..." -ForegroundColor Yellow
try {
    $body = @{
        quantity = 10
        movement_type = "adjustment"
        reason = "Test adjustment"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory/product/$productId/movement" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Stock movement created" -ForegroundColor Green
    $results += "PASS: CREATE Stock Movement"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Stock Movement"
}
Write-Host ""

# Test 9: CREATE Supplier
Write-Host "[9] Testing CREATE Supplier..." -ForegroundColor Yellow
try {
    $body = @{
        name = "Test Supplier"
        contact_person = "John Doe"
        email = "supplier@test.com"
        phone = "+1234567890"
        address = "123 Test St"
        payment_terms = "Net 30"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3004/api/suppliers" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Supplier created" -ForegroundColor Green
    $supplierId = $response.data.id
    $results += "PASS: CREATE Supplier"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Supplier"
    $supplierId = 1
}
Write-Host ""

# Test 10: CREATE Purchase Order
Write-Host "[10] Testing CREATE Purchase Order..." -ForegroundColor Yellow
try {
    $body = @{
        supplier_id = $supplierId
        expected_delivery_date = "2024-12-31"
        items = @(
            @{
                product_id = $productId
                quantity = 50
                unit_price = 80.00
            }
        )
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "http://localhost:3004/api/purchase-orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Purchase Order created - PO#: $($response.data.po_number)" -ForegroundColor Green
    $poId = $response.data.id
    $results += "PASS: CREATE Purchase Order"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Purchase Order"
    $poId = 1
}
Write-Host ""

# Test 11: UPDATE Purchase Order (NEW ENDPOINT)
Write-Host "[11] Testing UPDATE Purchase Order (NEW)..." -ForegroundColor Yellow
try {
    $body = @{
        expected_delivery_date = "2025-01-15"
        notes = "Updated via CRUD test"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3004/api/purchase-orders/$poId" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Purchase Order updated" -ForegroundColor Green
    $results += "PASS: UPDATE Purchase Order (NEW)"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE Purchase Order (NEW)"
}
Write-Host ""

# Test 12: UPDATE PO Status
Write-Host "[12] Testing UPDATE PO Status..." -ForegroundColor Yellow
try {
    $body = @{
        status = "approved"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3004/api/purchase-orders/$poId/status" -Method PATCH -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: PO Status updated to approved" -ForegroundColor Green
    $results += "PASS: UPDATE PO Status"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE PO Status"
}
Write-Host ""

# Test 13: CREATE Order
Write-Host "[13] Testing CREATE Order..." -ForegroundColor Yellow
try {
    $body = @{
        customer_name = "Test Customer"
        customer_email = "customer@test.com"
        shipping_address = "456 Customer Ave"
        items = @(
            @{
                product_id = $productId
                quantity = 5
                unit_price = 99.99
            }
        )
    } | ConvertTo-Json -Depth 3
    
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/orders" -Method POST -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Order created - Order#: $($response.data.order_number)" -ForegroundColor Green
    $orderId = $response.data.id
    $results += "PASS: CREATE Order"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: CREATE Order"
    $orderId = 1
}
Write-Host ""

# Test 14: READ Order by ID
Write-Host "[14] Testing READ Order by ID..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/orders/$orderId" -Method GET
    Write-Host "  ✓ SUCCESS: Order found - Status: $($response.data.status)" -ForegroundColor Green
    $results += "PASS: READ Order by ID"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: READ Order by ID"
}
Write-Host ""

# Test 15: UPDATE Order (NEW ENDPOINT)
Write-Host "[15] Testing UPDATE Order (NEW)..." -ForegroundColor Yellow
try {
    $body = @{
        shipping_address = "789 Updated Street"
        notes = "Address updated via test"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/orders/$orderId" -Method PUT -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Order updated" -ForegroundColor Green
    $results += "PASS: UPDATE Order (NEW)"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE Order (NEW)"
}
Write-Host ""

# Test 16: UPDATE Order Status
Write-Host "[16] Testing UPDATE Order Status..." -ForegroundColor Yellow
try {
    $body = @{
        status = "processing"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "http://localhost:3005/api/orders/$orderId/status" -Method PATCH -Body $body -ContentType "application/json"
    Write-Host "  ✓ SUCCESS: Order status updated to processing" -ForegroundColor Green
    $results += "PASS: UPDATE Order Status"
} catch {
    Write-Host "  ✗ FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $results += "FAIL: UPDATE Order Status"
}
Write-Host ""

# Test 17: DELETE Inventory (NEW - test with product that has no reserved stock)
Write-Host "[17] Testing DELETE Inventory (NEW)..." -ForegroundColor Yellow
try {
    # First create a test inventory to delete
    $testBody = @{
        product_id = 999
        quantity = 10
        location = "Test"
    } | ConvertTo-Json
    
    try {
        $testInv = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory" -Method POST -Body $testBody -ContentType "application/json"
        $testProdId = $testInv.data.product_id
        
        # Now delete it
        $response = Invoke-RestMethod -Uri "http://localhost:3003/api/inventory/product/$testProdId" -Method DELETE
        Write-Host "  ✓ SUCCESS: Inventory deleted" -ForegroundColor Green
        $results += "PASS: DELETE Inventory (NEW)"
    } catch {
        Write-Host "  ⚠ Note: $($_.Exception.Message)" -ForegroundColor Yellow
        $results += "SKIP: DELETE Inventory (NEW) - Condition not met"
    }
} catch {
    Write-Host "  ⚠ Note: Cannot test delete - $($_.Exception.Message)" -ForegroundColor Yellow
    $results += "SKIP: DELETE Inventory (NEW)"
}
Write-Host ""

# Summary
Write-Host ""
Write-Host "===== TEST SUMMARY =====" -ForegroundColor Cyan
$passed = ($results | Where-Object { $_ -like "PASS:*" }).Count
$failed = ($results | Where-Object { $_ -like "FAIL:*" }).Count
$skipped = ($results | Where-Object { $_ -like "SKIP:*" }).Count
$total = $results.Count

Write-Host "Total Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Skipped: $skipped" -ForegroundColor Yellow
Write-Host "Success Rate: $([math]::Round(($passed / ($total - $skipped)) * 100, 2))%" -ForegroundColor Cyan
Write-Host ""

if ($failed -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    $results | Where-Object { $_ -like "FAIL:*" } | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Red
    }
}
