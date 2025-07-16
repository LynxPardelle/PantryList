Write-Host "Iniciando validacion automatica - Paso 2" -ForegroundColor Cyan

$errorsFound = 0
$successCount = 0

function Test-File($path, $name) {
    if (Test-Path $path) {
        Write-Host "OK: $name" -ForegroundColor Green
        $script:successCount++
    } else {
        Write-Host "ERROR: $name - No encontrado: $path" -ForegroundColor Red
        $script:errorsFound++
    }
}

Write-Host "`nValidando estructura de directorios..." -ForegroundColor Blue
Test-File "backend/src/domain/entities" "Domain entities directory"
Test-File "backend/src/domain/value-objects" "Domain value objects directory"
Test-File "backend/src/domain/repositories" "Domain repositories directory"
Test-File "backend/src/domain/services" "Domain services directory"
Test-File "backend/src/application/use-cases" "Application use cases directory"
Test-File "backend/src/infrastructure/http" "Infrastructure HTTP directory"
Test-File "frontend/src/app/store/product" "Frontend store directory"

Write-Host "`nValidando archivos de dominio..." -ForegroundColor Blue
Test-File "backend/src/domain/entities/product.entity.ts" "Product Entity"
Test-File "backend/src/domain/entities/user.entity.ts" "User Entity"
Test-File "backend/src/domain/value-objects/product-id.vo.ts" "ProductId Value Object"
Test-File "backend/src/domain/value-objects/user-id.vo.ts" "UserId Value Object"
Test-File "backend/src/domain/value-objects/usage-rate.vo.ts" "UsageRate Value Object"
Test-File "backend/src/domain/services/scheduling.service.ts" "Scheduling Service"
Test-File "backend/src/domain/repositories/product.repository.ts" "Product Repository"

Write-Host "`nValidando casos de uso..." -ForegroundColor Blue
Test-File "backend/src/application/use-cases/create-product.use-case.ts" "Create Product Use Case"
Test-File "backend/src/application/use-cases/update-product-quantity.use-case.ts" "Update Product Quantity Use Case"
Test-File "backend/src/application/use-cases/get-products-by-user.use-case.ts" "Get Products By User Use Case"

Write-Host "`nValidando infraestructura..." -ForegroundColor Blue
Test-File "backend/src/infrastructure/http/controllers/products.controller.ts" "Products Controller"
Test-File "backend/src/infrastructure/http/dtos/create-product.dto.ts" "Create Product DTO"
Test-File "backend/src/infrastructure/http/dtos/product-response.dto.ts" "Product Response DTO"
Test-File "backend/src/infrastructure/http/mappers/product.mapper.ts" "Product Mapper"

Write-Host "`nValidando NgRx store..." -ForegroundColor Blue
Test-File "frontend/src/app/store/product/product.state.ts" "Product State"
Test-File "frontend/src/app/store/product/product.actions.ts" "Product Actions"
Test-File "frontend/src/app/store/product/product.reducer.ts" "Product Reducer"
Test-File "frontend/src/app/store/product/product.effects.ts" "Product Effects"
Test-File "frontend/src/app/store/product/product.selectors.ts" "Product Selectors"
Test-File "frontend/src/app/core/services/product.service.ts" "Product Service"
Test-File "frontend/src/app/shared/models/product.model.ts" "Product Model"

$total = $successCount + $errorsFound
$successRate = if ($total -gt 0) { [math]::Round(($successCount / $total) * 100, 2) } else { 0 }

Write-Host "`n=== RESUMEN ===" -ForegroundColor Magenta
Write-Host "Total verificaciones: $total" -ForegroundColor White
Write-Host "Exitos: $successCount" -ForegroundColor Green
Write-Host "Errores: $errorsFound" -ForegroundColor Red
Write-Host "Tasa de exito: $successRate%" -ForegroundColor Yellow

if ($errorsFound -eq 0) {
    Write-Host "`nValidacion EXITOSA!" -ForegroundColor Green
    $result = "APROBADO"
} elseif ($successRate -ge 80) {
    Write-Host "`nValidacion PARCIALMENTE EXITOSA" -ForegroundColor Yellow
    $result = "APROBADO CON OBSERVACIONES"
} else {
    Write-Host "`nValidacion FALLIDA" -ForegroundColor Red
    $result = "REPROBADO"
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logContent = "# REPORTE VALIDACION PASO 2`nFecha: $(Get-Date)`nTotal: $total`nExitos: $successCount`nErrores: $errorsFound`nTasa exito: $successRate%`nEstado: $result"
$logContent | Out-File "validation-step2-$timestamp.log"
Write-Host "`nReporte guardado en: validation-step2-$timestamp.log" -ForegroundColor Cyan
