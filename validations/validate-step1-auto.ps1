#!/usr/bin/env pwsh
# Validación Automática - Paso 1: Setup y Estructura del Proyecto
# Fecha: 17 de Junio, 2025

param(
    [switch]$Verbose = $false
)

Write-Host "🔍 VALIDACIÓN AUTOMÁTICA - PASO 1: SETUP Y ESTRUCTURA" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0

function Test-DirectoryStructure {
    Write-Host "📁 Validando estructura de directorios..." -ForegroundColor Yellow
    
    $RequiredDirs = @(
        "frontend",
        "backend", 
        "frontend/src",
        "frontend/src/app",
        "frontend/src/app/core",
        "frontend/src/app/shared", 
        "frontend/src/app/features",
        "frontend/src/app/store",
        "backend/src",
        "backend/src/domain",
        "backend/src/domain/entities",
        "backend/src/domain/repositories",
        "backend/src/domain/services",
        "backend/src/application",
        "backend/src/application/ports",
        "backend/src/application/services",
        "backend/src/application/use-cases",
        "backend/src/infrastructure",
        "backend/src/infrastructure/database",
        "backend/src/infrastructure/http",
        "backend/src/infrastructure/config"
    )
    
    foreach ($dir in $RequiredDirs) {
        if (Test-Path $dir) {
            Write-Host "  ✅ $dir" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $dir (FALTANTE)" -ForegroundColor Red
            $script:ErrorCount++
        }
    }
}

function Test-PackageFiles {
    Write-Host "📦 Validando archivos de configuración..." -ForegroundColor Yellow
    
    $RequiredFiles = @(
        @{ Path = "frontend/package.json"; Type = "Frontend Package" },
        @{ Path = "backend/package.json"; Type = "Backend Package" },
        @{ Path = "frontend/angular.json"; Type = "Angular Config" },
        @{ Path = "frontend/tsconfig.json"; Type = "Frontend TypeScript Config" },
        @{ Path = "backend/tsconfig.json"; Type = "Backend TypeScript Config" },
        @{ Path = "docker-compose.yml"; Type = "Docker Compose" }
    )
    
    foreach ($file in $RequiredFiles) {
        if (Test-Path $file.Path) {
            Write-Host "  ✅ $($file.Path) ($($file.Type))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($file.Path) ($($file.Type)) - FALTANTE" -ForegroundColor Red
            $script:ErrorCount++
        }
    }
}

function Test-FrontendDependencies {
    Write-Host "🎨 Validando dependencias del frontend..." -ForegroundColor Yellow
    
    if (Test-Path "frontend/package.json") {
        $packageJson = Get-Content "frontend/package.json" -Raw | ConvertFrom-Json
        $dependencies = $packageJson.dependencies + $packageJson.devDependencies
        
        $RequiredDeps = @(
            "@angular/core",
            "@angular/material", 
            "@angular/cdk",
            "@ngrx/store",
            "@ngrx/effects",
            "bootstrap",
            "ngx-bootstrap",
            "ngx-bootstrap-expanded-features"
        )
        
        foreach ($dep in $RequiredDeps) {
            if ($dependencies.$dep) {
                Write-Host "  ✅ $dep (v$($dependencies.$dep))" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $dep - NO INSTALADO" -ForegroundColor Red
                $script:ErrorCount++
            }
        }
    } else {
        Write-Host "  ❌ frontend/package.json no encontrado" -ForegroundColor Red
        $script:ErrorCount++
    }
}

function Test-BackendDependencies {
    Write-Host "🔧 Validando dependencias del backend..." -ForegroundColor Yellow
    
    if (Test-Path "backend/package.json") {
        $packageJson = Get-Content "backend/package.json" -Raw | ConvertFrom-Json
        $dependencies = $packageJson.dependencies + $packageJson.devDependencies
        
        $RequiredDeps = @(
            "@nestjs/core",
            "@nestjs/platform-fastify",
            "@nestjs/mongoose",
            "@nestjs/swagger",
            "@nestjs/config",
            "mongoose",
            "helmet",
            "joi",
            "class-validator",
            "class-transformer"
        )
        
        foreach ($dep in $RequiredDeps) {
            if ($dependencies.$dep) {
                Write-Host "  ✅ $dep (v$($dependencies.$dep))" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $dep - NO INSTALADO" -ForegroundColor Red
                $script:ErrorCount++
            }
        }
    } else {
        Write-Host "  ❌ backend/package.json no encontrado" -ForegroundColor Red
        $script:ErrorCount++
    }
}

function Test-ArchitectureCompliance {
    Write-Host "🏗️ Validando cumplimiento de arquitectura hexagonal..." -ForegroundColor Yellow
    
    # Verificar que no existan referencias a DAO/Factory en código
    $SourceFiles = Get-ChildItem -Path "backend/src" -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
    $DaoReferences = @()
    
    foreach ($file in $SourceFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match "DAO|Factory") {
            $DaoReferences += $file.FullName
        }
    }
    
    if ($DaoReferences.Count -eq 0) {
        Write-Host "  ✅ Sin referencias a DAO/Factory en código" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Encontradas referencias a DAO/Factory en:" -ForegroundColor Yellow
        foreach ($ref in $DaoReferences) {
            Write-Host "    - $ref" -ForegroundColor Yellow
        }
        $script:WarningCount++
    }
}

function Test-EnvironmentFiles {
    Write-Host "🌍 Validando archivos de entorno..." -ForegroundColor Yellow
    
    $EnvFiles = @(
        @{ Path = "frontend/src/environments/environment.ts"; Type = "Frontend Development" },
        @{ Path = "frontend/src/environments/environment.prod.ts"; Type = "Frontend Production" },
        @{ Path = "backend/.env.example"; Type = "Backend Environment Example" }
    )
    
    foreach ($env in $EnvFiles) {
        if (Test-Path $env.Path) {
            Write-Host "  ✅ $($env.Path) ($($env.Type))" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ $($env.Path) ($($env.Type)) - RECOMENDADO" -ForegroundColor Yellow
            $script:WarningCount++
        }
    }
}

function Test-GitSetup {
    Write-Host "📋 Validando configuración de Git..." -ForegroundColor Yellow
    
    if (Test-Path ".git") {
        Write-Host "  ✅ Repositorio Git inicializado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Repositorio Git no inicializado" -ForegroundColor Yellow
        $script:WarningCount++
    }
    
    if (Test-Path ".gitignore") {
        Write-Host "  ✅ .gitignore presente" -ForegroundColor Green
    } else {
        Write-Host "  ❌ .gitignore faltante" -ForegroundColor Red
        $script:ErrorCount++
    }
    
    if (Test-Path ".github/workflows") {
        Write-Host "  ✅ Directorio de GitHub Actions presente" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ GitHub Actions no configurado" -ForegroundColor Yellow
        $script:WarningCount++
    }
}

# Ejecutar validaciones
Test-DirectoryStructure
Write-Host ""
Test-PackageFiles
Write-Host ""
Test-FrontendDependencies  
Write-Host ""
Test-BackendDependencies
Write-Host ""
Test-ArchitectureCompliance
Write-Host ""
Test-EnvironmentFiles
Write-Host ""
Test-GitSetup

# Resumen final
Write-Host ""
Write-Host "📊 RESUMEN DE VALIDACIÓN" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "🎉 ¡VALIDACIÓN COMPLETAMENTE EXITOSA!" -ForegroundColor Green
    Write-Host "Todos los componentes del Paso 1 están correctamente configurados." -ForegroundColor Green
    exit 0
} elseif ($ErrorCount -eq 0) {
    Write-Host "✅ VALIDACIÓN EXITOSA CON ADVERTENCIAS" -ForegroundColor Yellow
    Write-Host "Errores críticos: $ErrorCount" -ForegroundColor Green
    Write-Host "Advertencias: $WarningCount" -ForegroundColor Yellow
    Write-Host "El proyecto puede proceder al siguiente paso." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ VALIDACIÓN FALLIDA" -ForegroundColor Red
    Write-Host "Errores críticos: $ErrorCount" -ForegroundColor Red
    Write-Host "Advertencias: $WarningCount" -ForegroundColor Yellow
    Write-Host "Deben corregirse los errores críticos antes de continuar." -ForegroundColor Red
    exit 1
}
