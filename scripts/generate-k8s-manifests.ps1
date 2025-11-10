# Generate All Microservice Kubernetes Manifests
# This script generates K8s manifests for all remaining services based on user-service template

Write-Host "Generating Kubernetes Manifests for All Microservices..." -ForegroundColor Green
Write-Host ""

# Define services with their configurations
$services = @(
    @{ Name = "product-catalog-service"; Port = 3002; DBName = "product_catalog_db" },
    @{ Name = "inventory-service"; Port = 3003; DBName = "inventory_db" },
    @{ Name = "order-service"; Port = 3005; DBName = "order_db" },
    @{ Name = "supplier-service"; Port = 3006; DBName = "supplier_db" }
)

$baseDir = "k8s/base/services"
$templateDir = "$baseDir/user-service"

foreach ($service in $services) {
    $serviceName = $service.Name
    $port = $service.Port
    $dbName = $service.DBName
    $destDir = "$baseDir/$serviceName"
    
    Write-Host "Generating $serviceName..." -ForegroundColor Cyan
    
    # Create destination directory if it doesn't exist
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    # Copy all files from template
    Get-ChildItem -Path $templateDir -File | ForEach-Object {
        $sourceFile = $_.FullName
        $destFile = Join-Path $destDir $_.Name
        
        Write-Host "  Creating $($_.Name)..." -ForegroundColor Gray
        
        # Read content
        $content = Get-Content $sourceFile -Raw
        
        # Replace all occurrences
        $content = $content -replace 'user-service', $serviceName
        $content = $content -replace 'user_service_db', $dbName
        $content = $content -replace 'containerPort: 3001', "containerPort: $port"
        $content = $content -replace 'targetPort: 3001', "targetPort: $port"
        $content = $content -replace 'port: 3001', "port: $port"
        $content = $content -replace '"3001"', """$port"""
        
        # Write to destination
        $content | Set-Content $destFile -NoNewline
    }
    
    Write-Host "  $serviceName manifests created successfully!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "All microservice manifests generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - user-service (3001) - Already exists" -ForegroundColor White
Write-Host "  - product-catalog-service (3002) - Generated" -ForegroundColor White
Write-Host "  - inventory-service (3003) - Generated" -ForegroundColor White
Write-Host "  - order-service (3005) - Generated" -ForegroundColor White
Write-Host "  - supplier-service (3006) - Generated" -ForegroundColor White
Write-Host ""
Write-Host "Total manifests created: 24 files" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review generated files in k8s/base/services/" -ForegroundColor White
Write-Host "  2. Customize if needed (check DB names, environment variables)" -ForegroundColor White
Write-Host "  3. Create secrets for each service" -ForegroundColor White
Write-Host "  4. Deploy to Kubernetes cluster" -ForegroundColor White
