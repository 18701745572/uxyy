# Generate secrets for Sealos deployment
# Usage: .\scripts\generate-secrets.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    Uxyy Secret Key Generator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Generate random secrets
$chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
$accessSecret = -join ((1..64) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
$refreshSecret = -join ((1..64) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
$dbPassword = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
$redisPassword = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

Write-Host "Secrets generated! Save these values:" -ForegroundColor Green
Write-Host ""
Write-Host "------------------------------------------" -ForegroundColor Yellow
Write-Host "JWT_ACCESS_SECRET:" -ForegroundColor Yellow
Write-Host $accessSecret -ForegroundColor White
Write-Host ""
Write-Host "JWT_REFRESH_SECRET:" -ForegroundColor Yellow
Write-Host $refreshSecret -ForegroundColor White
Write-Host ""
Write-Host "DB_PASSWORD:" -ForegroundColor Yellow
Write-Host $dbPassword -ForegroundColor White
Write-Host ""
Write-Host "REDIS_PASSWORD:" -ForegroundColor Yellow
Write-Host $redisPassword -ForegroundColor White
Write-Host "------------------------------------------" -ForegroundColor Yellow
Write-Host ""

# Save to file
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$lines = @(
    "# Uxyy Environment Variables",
    "# Generated: $timestamp",
    "# DO NOT commit this file to Git!",
    "",
    "JWT_ACCESS_SECRET=$accessSecret",
    "JWT_REFRESH_SECRET=$refreshSecret",
    "DB_PASSWORD=$dbPassword",
    "REDIS_PASSWORD=$redisPassword"
)
$lines | Out-File -FilePath ".env.secrets" -Encoding ASCII

Write-Host "Saved to file: .env.secrets" -ForegroundColor Green
Write-Host ""
Write-Host "Security Tips:" -ForegroundColor Red
Write-Host "   1. Keep these secrets safe" -ForegroundColor Red
Write-Host "   2. Do not commit .env.secrets to Git" -ForegroundColor Red
Write-Host "   3. Rotate keys regularly in production" -ForegroundColor Red
Write-Host ""

# Show YAML snippet
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    sealos.yaml config snippet" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy this to sealos.yaml:" -ForegroundColor Green
Write-Host ""
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host "            - name: JWT_ACCESS_SECRET" -ForegroundColor White
Write-Host "              value: `"$accessSecret`"" -ForegroundColor White
Write-Host "            - name: JWT_REFRESH_SECRET" -ForegroundColor White
Write-Host "              value: `"$refreshSecret`"" -ForegroundColor White
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
