Write-Host "Instalando tunnelmole..." -ForegroundColor Cyan
npm install -g tunnelmole

Write-Host ""
Write-Host "Iniciando tunel en puerto 3000..." -ForegroundColor Green
Write-Host "Cuando aparezca la URL publica, compártela para hacer pruebas." -ForegroundColor Yellow
Write-Host ""

tmole 3000
