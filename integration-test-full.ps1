# 完整集成测试脚本
# 包含类型检查、编译测试和API测试

$ErrorActionPreference = "Stop"
$Results = @()
$TestStartTime = Get-Date

function Write-TestHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-TestResult {
    param(
        [string]$Name,
        [bool]$Success,
        [string]$Message = ""
    )
    
    $Status = if ($Success) { "PASS" } else { "FAIL" }
    $Color = if ($Success) { "Green" } else { "Red" }
    
    Write-Host "[$Status] $Name" -ForegroundColor $Color
    if ($Message -and -not $Success) {
        Write-Host "  Error: $Message" -ForegroundColor Red
    }
    
    return @{
        Name = $Name
        Success = $Success
        Message = $Message
    }
}

# 1. 类型检查测试
Write-TestHeader "Step 1: TypeScript Type Check"

try {
    Set-Location c:\Users\1\Desktop\uxyy.cn\uxyy
    $typeCheckOutput = pnpm run typecheck 2>&1
    $typeCheckSuccess = $LASTEXITCODE -eq 0
    
    if ($typeCheckSuccess) {
        $Results += Write-TestResult -Name "TypeScript Type Check" -Success $true
    } else {
        $Results += Write-TestResult -Name "TypeScript Type Check" -Success $false -Message ($typeCheckOutput -join "`n")
    }
} catch {
    $Results += Write-TestResult -Name "TypeScript Type Check" -Success $false -Message $_.Exception.Message
}

# 2. Lint 检查测试
Write-TestHeader "Step 2: ESLint Check"

try {
    $lintOutput = pnpm run lint 2>&1
    $lintSuccess = $LASTEXITCODE -eq 0
    
    if ($lintSuccess) {
        $Results += Write-TestResult -Name "ESLint Check" -Success $true
    } else {
        $Results += Write-TestResult -Name "ESLint Check" -Success $false -Message ($lintOutput -join "`n")
    }
} catch {
    $Results += Write-TestResult -Name "ESLint Check" -Success $false -Message $_.Exception.Message
}

# 3. 后端编译测试
Write-TestHeader "Step 3: Backend Build Test"

try {
    Set-Location c:\Users\1\Desktop\uxyy.cn\uxyy\uxyy-api
    $buildOutput = pnpm run build 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    
    if ($buildSuccess) {
        $Results += Write-TestResult -Name "Backend Build" -Success $true
    } else {
        $Results += Write-TestResult -Name "Backend Build" -Success $false -Message ($buildOutput -join "`n")
    }
} catch {
    $Results += Write-TestResult -Name "Backend Build" -Success $false -Message $_.Exception.Message
}

# 4. 前端编译测试
Write-TestHeader "Step 4: Frontend Build Test"

try {
    Set-Location c:\Users\1\Desktop\uxyy.cn\uxyy\uxyy-web
    $buildOutput = pnpm run build 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
    
    if ($buildSuccess) {
        $Results += Write-TestResult -Name "Frontend Build" -Success $true
    } else {
        $Results += Write-TestResult -Name "Frontend Build" -Success $false -Message ($buildOutput -join "`n")
    }
} catch {
    $Results += Write-TestResult -Name "Frontend Build" -Success $false -Message $_.Exception.Message
}

# 5. 模块导出检查
Write-TestHeader "Step 5: Module Export Check"

$ModulesToCheck = @(
    @{ Name = "Auth Module"; Path = "uxyy-api/src/modules/auth/auth.module.ts"; Exports = @("AuthService", "RolesGuard") },
    @{ Name = "Inventory Module"; Path = "uxyy-api/src/modules/inventory/inventory.module.ts"; Exports = @("InventoryService", "PurchaseOrderItemService") },
    @{ Name = "Finance Module"; Path = "uxyy-api/src/modules/finance/finance.module.ts"; Exports = @("FinanceService", "VoucherEntryService") },
    @{ Name = "CRM Module"; Path = "uxyy-api/src/modules/crm/crm.module.ts"; Exports = @("CrmService", "OpportunityService") },
    @{ Name = "AI Module"; Path = "uxyy-api/src/modules/ai/ai.module.ts"; Exports = @("AiService", "AiTaskProcessor") }
)

foreach ($Module in $ModulesToCheck) {
    $ModulePath = Join-Path c:\Users\1\Desktop\uxyy.cn\uxyy $Module.Path
    
    if (Test-Path $ModulePath) {
        $Content = Get-Content $ModulePath -Raw
        $AllExportsFound = $true
        $MissingExports = @()
        
        foreach ($Export in $Module.Exports) {
            if ($Content -notmatch $Export) {
                $AllExportsFound = $false
                $MissingExports += $Export
            }
        }
        
        if ($AllExportsFound) {
            $Results += Write-TestResult -Name "$($Module.Name) Exports" -Success $true
        } else {
            $Results += Write-TestResult -Name "$($Module.Name) Exports" -Success $false -Message "Missing: $($MissingExports -join ', ')"
        }
    } else {
        $Results += Write-TestResult -Name "$($Module.Name) Exports" -Success $false -Message "File not found"
    }
}

# 6. 新服务文件检查
Write-TestHeader "Step 6: New Services Check"

$NewServices = @(
    @{ Name = "Roles Guard"; Path = "uxyy-api/src/modules/auth/roles.guard.ts" },
    @{ Name = "Purchase Order Item Service"; Path = "uxyy-api/src/modules/inventory/purchase-order-item.service.ts" },
    @{ Name = "Voucher Entry Service"; Path = "uxyy-api/src/modules/finance/voucher-entry.service.ts" },
    @{ Name = "Opportunity Service"; Path = "uxyy-api/src/modules/crm/opportunity.service.ts" },
    @{ Name = "AI Task Processor"; Path = "uxyy-api/src/modules/ai/ai-task.processor.ts" },
    @{ Name = "Products Page"; Path = "uxyy-web/src/app/inventory/products/page.tsx" }
)

foreach ($Service in $NewServices) {
    $ServicePath = Join-Path c:\Users\1\Desktop\uxyy.cn\uxyy $Service.Path
    
    if (Test-Path $ServicePath) {
        $Results += Write-TestResult -Name $Service.Name -Success $true
    } else {
        $Results += Write-TestResult -Name $Service.Name -Success $false -Message "File not found"
    }
}

# 7. Git Worktree 检查
Write-TestHeader "Step 7: Git Worktree Check"

Set-Location c:\Users\1\Desktop\uxyy.cn\uxyy
$Worktrees = git worktree list 2>&1

$ExpectedWorktrees = @(
    "agent-auth",
    "agent-inventory",
    "agent-finance",
    "agent-crm",
    "agent-ai",
    "agent-frontend"
)

foreach ($Worktree in $ExpectedWorktrees) {
    if ($Worktrees -match $Worktree) {
        $Results += Write-TestResult -Name "Worktree: $Worktree" -Success $true
    } else {
        $Results += Write-TestResult -Name "Worktree: $Worktree" -Success $false -Message "Not found"
    }
}

# 8. 分支检查
Write-TestHeader "Step 8: Feature Branches Check"

$ExpectedBranches = @(
    "feature/auth-init",
    "feature/inventory-init",
    "feature/finance-init",
    "feature/crm-init",
    "feature/ai-init",
    "feature/frontend-init"
)

$AllBranches = git branch -a 2>&1

foreach ($Branch in $ExpectedBranches) {
    if ($AllBranches -match $Branch) {
        $Results += Write-TestResult -Name "Branch: $Branch" -Success $true
    } else {
        $Results += Write-TestResult -Name "Branch: $Branch" -Success $false -Message "Not found"
    }
}

# 测试结果汇总
Write-TestHeader "Test Results Summary"

$PassCount = ($Results | Where-Object { $_.Success }).Count
$FailCount = ($Results | Where-Object { -not $_.Success }).Count
$TotalCount = $Results.Count
$TestEndTime = Get-Date
$Duration = $TestEndTime - $TestStartTime

Write-Host "Total Tests: $TotalCount" -ForegroundColor White
Write-Host "Passed: $PassCount" -ForegroundColor Green
Write-Host "Failed: $FailCount" -ForegroundColor Red
Write-Host "Duration: $($Duration.TotalSeconds.ToString('F2'))s" -ForegroundColor Gray
Write-Host ""

if ($FailCount -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    Write-Host "-------------" -ForegroundColor Red
    $Results | Where-Object { -not $_.Success } | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Red
        if ($_.Message) {
            Write-Host "    $($_.Message)" -ForegroundColor DarkRed
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Integration Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 返回退出码
exit $FailCount
