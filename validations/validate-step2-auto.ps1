# Validación Automática - Paso 2: Arquitectura Hexagonal

Write-Host "🔍 INICIANDO VALIDACIÓN AUTOMÁTICA - PASO 2" -ForegroundColor Cyan

# Variables globales
$errorsFound = 0
$successCount = 0
$totalChecks = 0

# Función para verificar archivos
function Test-FileExists($filePath, $description) {
    $script:totalChecks++
    if (Test-Path $filePath) {
        Write-Host "✅ $description" -ForegroundColor Green
        $script:successCount++
        return $true
    } else {
        Write-Host "❌ $description - NO ENCONTRADO: $filePath" -ForegroundColor Red
        $script:errorsFound++
        return $false
    }
}

Write-Host "`n📁 VALIDANDO ESTRUCTURA DE DIRECTORIOS" -ForegroundColor Blue

# Verificar directorios principales
Test-FileExists "backend/src/domain/entities" "Directorio domain/entities"
Test-FileExists "backend/src/domain/value-objects" "Directorio domain/value-objects"
Test-FileExists "backend/src/domain/repositories" "Directorio domain/repositories"
Test-FileExists "backend/src/domain/services" "Directorio domain/services"
Test-FileExists "backend/src/application/use-cases" "Directorio application/use-cases"
Test-FileExists "backend/src/infrastructure/http" "Directorio infrastructure/http"
Test-FileExists "frontend/src/app/store/product" "Directorio frontend store"

Write-Host "`n🏗️ VALIDANDO ARCHIVOS DE DOMINIO" -ForegroundColor Blue

# Verificar archivos de dominio
Test-FileExists "backend/src/domain/entities/product.entity.ts" "Product Entity"
Test-FileExists "backend/src/domain/entities/user.entity.ts" "User Entity"
Test-FileExists "backend/src/domain/value-objects/product-id.vo.ts" "ProductId Value Object"
Test-FileExists "backend/src/domain/value-objects/user-id.vo.ts" "UserId Value Object"
Test-FileExists "backend/src/domain/value-objects/usage-rate.vo.ts" "UsageRate Value Object"
Test-FileExists "backend/src/domain/services/scheduling.service.ts" "Scheduling Service"
Test-FileExists "backend/src/domain/repositories/product.repository.ts" "Product Repository Interface"

Write-Host "`n⚙️ VALIDANDO CAPA DE APLICACIÓN" -ForegroundColor Blue

# Verificar use cases
Test-FileExists "backend/src/application/use-cases/create-product.use-case.ts" "Create Product Use Case"
Test-FileExists "backend/src/application/use-cases/update-product-quantity.use-case.ts" "Update Product Quantity Use Case"
Test-FileExists "backend/src/application/use-cases/get-products-by-user.use-case.ts" "Get Products By User Use Case"

Write-Host "`n🔧 VALIDANDO INFRAESTRUCTURA" -ForegroundColor Blue

# Verificar infraestructura
Test-FileExists "backend/src/infrastructure/http/controllers/products.controller.ts" "Products Controller"
Test-FileExists "backend/src/infrastructure/http/dtos/create-product.dto.ts" "Create Product DTO"
Test-FileExists "backend/src/infrastructure/http/dtos/product-response.dto.ts" "Product Response DTO"
Test-FileExists "backend/src/infrastructure/http/mappers/product.mapper.ts" "Product Mapper"

Write-Host "`n📦 VALIDANDO NGRX STORE" -ForegroundColor Blue

# Verificar NgRx
Test-FileExists "frontend/src/app/store/product/product.state.ts" "Product State"
Test-FileExists "frontend/src/app/store/product/product.actions.ts" "Product Actions"
Test-FileExists "frontend/src/app/store/product/product.reducer.ts" "Product Reducer"
Test-FileExists "frontend/src/app/store/product/product.effects.ts" "Product Effects"
Test-FileExists "frontend/src/app/store/product/product.selectors.ts" "Product Selectors"
Test-FileExists "frontend/src/app/core/services/product.service.ts" "Product Service"
Test-FileExists "frontend/src/app/shared/models/product.model.ts" "Product Model"

Write-Host "`n📊 RESUMEN DE VALIDACIÓN" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
Write-Host "Total de verificaciones: $totalChecks" -ForegroundColor White
Write-Host "Éxitos: $successCount" -ForegroundColor Green
Write-Host "Errores: $errorsFound" -ForegroundColor Red

if ($totalChecks -gt 0) {
    $successRate = [math]::Round(($successCount / $totalChecks) * 100, 2)
    Write-Host "Tasa de éxito: $successRate%" -ForegroundColor Yellow
    
    if ($errorsFound -eq 0) {
        Write-Host "`n🎉 ¡VALIDACIÓN COMPLETADA CON ÉXITO!" -ForegroundColor Green
        $result = "APROBADO"
    } elseif ($successRate -ge 80) {
        Write-Host "`n⚠️ VALIDACIÓN PARCIALMENTE EXITOSA" -ForegroundColor Yellow
        $result = "APROBADO CON OBSERVACIONES"
    } else {
        Write-Host "`n❌ VALIDACIÓN FALLIDA" -ForegroundColor Red
        $result = "REPROBADO"
    }
} else {
    Write-Host "`n❌ No se pudieron realizar validaciones" -ForegroundColor Red
    $result = "ERROR"
}

# Generar archivo de log
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logContent = @"
# REPORTE DE VALIDACIÓN AUTOMÁTICA - PASO 2
Fecha: $(Get-Date)
Total verificaciones: $totalChecks
Éxitos: $successCount
Errores: $errorsFound
Tasa de éxito: $successRate%
Estado: $result
"@

$logContent | Out-File "validation-step2-$timestamp.log"
Write-Host "`n📄 Reporte guardado en: validation-step2-$timestamp.log" -ForegroundColor Cyan
