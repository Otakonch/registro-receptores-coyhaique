# Deploy a Vercel - Registro Receptores Coyhaique
# Ejecutar con: powershell -ExecutionPolicy Bypass -File deploy.ps1

Write-Host ""
Write-Host "*** DEPLOY A VERCEL - REGISTRO RECEPTORES ***" -ForegroundColor Green
Write-Host ""

# Moverse a la carpeta del proyecto
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# URLs de Neon (sin problemas de escape en PowerShell)
$env:DATABASE_URL = "postgresql://neondb_owner:npg_D5JYqNaR1rkE@ep-winter-rice-at8j9e2f-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$env:DIRECT_URL   = "postgresql://neondb_owner:npg_D5JYqNaR1rkE@ep-winter-rice-at8j9e2f.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Generar NEXTAUTH_SECRET aleatorio
$bytes = New-Object Byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Write-Host "[1/4] Creando tablas en Neon..." -ForegroundColor Cyan
npx prisma db push --skip-generate
Write-Host ""

Write-Host "[2/4] Verificando login en Vercel..." -ForegroundColor Cyan
$vercelCheck = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Iniciando sesion en Vercel (se abrira el navegador)..." -ForegroundColor Yellow
    vercel login
    Start-Sleep -Seconds 3
}
Write-Host ""

Write-Host "[3/4] Desplegando proyecto en Vercel..." -ForegroundColor Cyan
vercel --yes --name registro-receptores-coyhaique 2>&1
Write-Host ""

Write-Host "[4/4] Configurando variables de entorno..." -ForegroundColor Cyan

$vars = @{
    "DATABASE_URL"   = $env:DATABASE_URL
    "DIRECT_URL"     = $env:DIRECT_URL
    "NEXTAUTH_SECRET"= $secret
    "NEXTAUTH_URL"   = "https://registro-receptores-coyhaique.vercel.app"
    "SMTP_HOST"      = "smtp.gmail.com"
    "SMTP_PORT"      = "587"
    "SMTP_SECURE"    = "false"
}

foreach ($key in $vars.Keys) {
    $value = $vars[$key]
    Write-Host "  Agregando $key..."
    # Usar archivo temporal para evitar problemas con pipes y caracteres especiales
    $tmpFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmpFile, $value, [System.Text.Encoding]::UTF8)
    Get-Content $tmpFile | vercel env add $key production --force 2>&1 | Out-Null
    Remove-Item $tmpFile -Force
}
Write-Host ""

Write-Host "Deploy a produccion..." -ForegroundColor Cyan
vercel --prod --yes 2>&1
Write-Host ""

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  LISTO! Plataforma publicada." -ForegroundColor Green
Write-Host "  URL: https://registro-receptores-coyhaique.vercel.app" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Start-Process "https://registro-receptores-coyhaique.vercel.app"

Write-Host "Presiona Enter para cerrar..."
Read-Host
