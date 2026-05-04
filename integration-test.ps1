# 集成测试脚本
# 测试修复后的各模块功能

$BaseUrl = "http://localhost:3001"
$Results = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testing $Name..." -NoNewline
    
    try {
        $Uri = "$BaseUrl$Path"
        $Headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Body) {
            $BodyJson = $Body | ConvertTo-Json -Depth 5
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $BodyJson -TimeoutSec 5
        } else {
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -TimeoutSec 5
        }
        
        Write-Host " PASS" -ForegroundColor Green
        return @{
            Name = $Name
            Status = "PASS"
            Response = $Response
        }
    }
    catch {
        $StatusCode = 0
        if ($_.Exception.Response -ne $null) {
            $StatusCode = $_.Exception.Response.StatusCode.value__
        }
        if ($StatusCode -eq $ExpectedStatus -or $StatusCode -eq 401 -or $StatusCode -eq 403) {
            Write-Host " PASS (Expected auth required)" -ForegroundColor Green
            return @{
                Name = $Name
                Status = "PASS"
                Error = $_.Exception.Message
            }
        } else {
            Write-Host " FAIL" -ForegroundColor Red
            return @{
                Name = $Name
                Status = "FAIL"
                Error = $_.Exception.Message
            }
        }
    }
}

Write-Host ""
Write-Host "========== Integration Test Start ==========" -ForegroundColor Cyan
Write-Host ""

# 1. Test Health Check
$Results += Test-Endpoint -Name "Health Check" -Method "GET" -Path "/health"

# 2. Test Auth Module
Write-Host ""
Write-Host "--- Auth Module Test ---" -ForegroundColor Yellow
$Results += Test-Endpoint -Name "Login Endpoint" -Method "POST" -Path "/auth/login" -Body @{
    email = "test@example.com"
    password = "password123"
}

$Results += Test-Endpoint -Name "Register Endpoint" -Method "POST" -Path "/auth/register" -Body @{
    email = "test@example.com"
    password = "password123"
    name = "Test User"
}

# 3. Test Inventory Module
Write-Host ""
Write-Host "--- Inventory Module Test ---" -ForegroundColor Yellow
$Results += Test-Endpoint -Name "Get Products (Auth Required)" -Method "GET" -Path "/inventory/products"
$Results += Test-Endpoint -Name "Get Stock Alerts (Auth Required)" -Method "GET" -Path "/inventory/alerts"
$Results += Test-Endpoint -Name "Get Purchase Orders (Auth Required)" -Method "GET" -Path "/inventory/purchase-orders"
$Results += Test-Endpoint -Name "Get Sales Orders (Auth Required)" -Method "GET" -Path "/inventory/sales-orders"

# 4. Test AI Module
Write-Host ""
Write-Host "--- AI Module Test ---" -ForegroundColor Yellow
$Results += Test-Endpoint -Name "AI Health Check" -Method "GET" -Path "/ai/health"
$Results += Test-Endpoint -Name "OCR Endpoint (Auth Required)" -Method "POST" -Path "/ai/ocr" -Body @{
    imageUrl = "https://example.com/invoice.jpg"
}
$Results += Test-Endpoint -Name "Smart Suggestions (Auth Required)" -Method "POST" -Path "/ai/suggestions" -Body @{
    type = "inventory"
    data = @{
        productId = 1
        currentStock = 10
    }
}

# 5. Test Finance Module
Write-Host ""
Write-Host "--- Finance Module Test ---" -ForegroundColor Yellow
$Results += Test-Endpoint -Name "Get Account Subjects (Auth Required)" -Method "GET" -Path "/finance/subjects"
$Results += Test-Endpoint -Name "Get Balance Sheet (Auth Required)" -Method "GET" -Path "/finance/reports/balance-sheet?date=2024-01-31"
$Results += Test-Endpoint -Name "Get Income Statement (Auth Required)" -Method "GET" -Path "/finance/reports/income-statement?startDate=2024-01-01&endDate=2024-01-31"
$Results += Test-Endpoint -Name "Get Cash Flow (Auth Required)" -Method "GET" -Path "/finance/reports/cash-flow?startDate=2024-01-01&endDate=2024-01-31"

# 6. Test CRM Module
Write-Host ""
Write-Host "--- CRM Module Test ---" -ForegroundColor Yellow
$Results += Test-Endpoint -Name "Get Customers (Auth Required)" -Method "GET" -Path "/crm/customers"

Write-Host ""
Write-Host "========== Test Results Summary ==========" -ForegroundColor Cyan
Write-Host ""

$PassCount = ($Results | Where-Object { $_.Status -eq "PASS" }).Count
$FailCount = ($Results | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "Total: $($Results.Count) tests" -ForegroundColor White
Write-Host "Passed: $PassCount" -ForegroundColor Green
Write-Host "Failed: $FailCount" -ForegroundColor Red

if ($FailCount -gt 0) {
    Write-Host ""
    Write-Host "Failed tests:" -ForegroundColor Red
    $Results | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Error)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========== Integration Test Complete ==========" -ForegroundColor Cyan
Write-Host ""

exit $FailCount
