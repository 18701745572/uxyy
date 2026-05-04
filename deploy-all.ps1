# 优信云业 - 多智能体并行开发部署脚本
# 此脚本将自动将所有生成的代码部署到对应的分支

param(
    [string]$BasePath = "c:\Users\1\Desktop\uxyy.cn\uxyy",
    [switch]$SkipGit = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  优信云业 - 多智能体并行开发部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 定义智能体配置
$agents = @(
    @{
        Name = "Agent-CRM"
        Branch = "feature/crm-init"
        SourcePath = "$BasePath\generated-code\crm"
        TargetPath = "$BasePath\uxyy-api\src\modules\crm"
        Files = @(
            @{ Source = "crm.service.ts"; Target = "crm.service.ts" },
            @{ Source = "crm.controller.ts"; Target = "crm.controller.ts" }
        )
    },
    @{
        Name = "Agent-Inventory"
        Branch = "feature/inventory-init"
        SourcePath = "$BasePath\generated-code\inventory"
        TargetPath = "$BasePath\uxyy-api\src\modules\inventory"
        Files = @(
            @{ Source = "inventory.service.ts"; Target = "inventory.service.ts" },
            @{ Source = "inventory.controller.ts"; Target = "inventory.controller.ts" }
        )
    },
    @{
        Name = "Agent-Finance"
        Branch = "feature/finance-init"
        SourcePath = "$BasePath\generated-code\finance"
        TargetPath = "$BasePath\uxyy-api\src\modules\finance"
        Files = @(
            @{ Source = "finance.service.ts"; Target = "finance.service.ts" },
            @{ Source = "finance.controller.ts"; Target = "finance.controller.ts" }
        )
    },
    @{
        Name = "Agent-AI"
        Branch = "feature/ai-init"
        SourcePath = "$BasePath\generated-code\ai"
        TargetPath = "$BasePath\uxyy-api\src\modules\ai"
        Files = @(
            @{ Source = "ai.service.ts"; Target = "ai.service.ts" },
            @{ Source = "ai.controller.ts"; Target = "ai.controller.ts" },
            @{ Source = "ai.processor.ts"; Target = "ai.processor.ts" }
        )
    },
    @{
        Name = "Agent-Frontend"
        Branch = "feature/frontend-init"
        SourcePath = "$BasePath\generated-code\frontend"
        TargetPath = "$BasePath\uxyy-web"
        Files = @(
            @{ Source = "api\client.ts"; Target = "src\api\client.ts" },
            @{ Source = "api\auth.ts"; Target = "src\api\auth.ts" },
            @{ Source = "api\customers.ts"; Target = "src\api\customers.ts" },
            @{ Source = "api\products.ts"; Target = "src\api\products.ts" },
            @{ Source = "app\login\page.tsx"; Target = "src\app\login\page.tsx" },
            @{ Source = "app\dashboard\page.tsx"; Target = "src\app\dashboard\page.tsx" },
            @{ Source = "app\customers\page.tsx"; Target = "src\app\customers\page.tsx" }
        )
    }
)

# 部署函数
function Deploy-Agent {
    param($Agent)
    
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "  正在部署: $($Agent.Name)" -ForegroundColor Yellow
    Write-Host "  分支: $($Agent.Branch)" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    # 切换到对应分支
    if (-not $SkipGit) {
        Write-Host "  → 切换到分支: $($Agent.Branch)" -ForegroundColor Gray
        Set-Location "$BasePath\uxyy-api" -ErrorAction SilentlyContinue
        if ($Agent.Name -eq "Agent-Frontend") {
            Set-Location "$BasePath\uxyy-web"
        }
        
        git checkout develop 2>$null
        git pull origin develop 2>$null
        git checkout $Agent.Branch 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ⚠ 分支不存在，尝试创建..." -ForegroundColor Yellow
            git checkout -b $Agent.Branch 2>$null
        }
        git merge develop --no-edit 2>$null
    }
    
    # 复制文件
    $successCount = 0
    $failCount = 0
    
    foreach ($file in $Agent.Files) {
        $sourceFile = Join-Path $Agent.SourcePath $file.Source
        $targetFile = Join-Path $Agent.TargetPath $file.Target
        
        if (Test-Path $sourceFile) {
            # 确保目标目录存在
            $targetDir = Split-Path $targetFile -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            
            try {
                Copy-Item -Path $sourceFile -Destination $targetFile -Force
                Write-Host "  ✓ $($file.Target)" -ForegroundColor Green
                $successCount++
            } catch {
                Write-Host "  ✗ $($file.Target) - $_" -ForegroundColor Red
                $failCount++
            }
        } else {
            Write-Host "  ⚠ 源文件不存在: $sourceFile" -ForegroundColor Yellow
            $failCount++
        }
    }
    
    # Git 提交
    if (-not $SkipGit) {
        Write-Host "  → 提交更改..." -ForegroundColor Gray
        git add -A 2>$null
        git commit -m "feat($($Agent.Name)): 实现核心功能模块" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ 提交成功" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ 没有需要提交的更改" -ForegroundColor Yellow
        }
    }
    
    Write-Host "  完成: $successCount 成功, $failCount 失败" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
    
    return @{ Success = $successCount; Fail = $failCount }
}

# 主执行逻辑
Set-Location $BasePath

$totalSuccess = 0
$totalFail = 0

foreach ($agent in $agents) {
    $result = Deploy-Agent -Agent $agent
    $totalSuccess += $result.Success
    $totalFail += $result.Fail
}

# 返回 develop 分支
if (-not $SkipGit) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  返回 develop 分支" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Set-Location "$BasePath\uxyy-api"
    git checkout develop 2>$null
}

# 总结
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  部署完成!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  总文件数: $($totalSuccess + $totalFail)" -ForegroundColor White
Write-Host "  成功: $totalSuccess" -ForegroundColor Green
Write-Host "  失败: $totalFail" -ForegroundColor $(if ($totalFail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan

if ($totalFail -eq 0) {
    Write-Host "`n✅ 所有智能体代码已成功部署到对应分支!" -ForegroundColor Green
    Write-Host "`n下一步操作:" -ForegroundColor Cyan
    Write-Host "  1. 运行类型检查: pnpm run typecheck" -ForegroundColor White
    Write-Host "  2. 启动开发服务器: pnpm run dev" -ForegroundColor White
    Write-Host "  3. 访问 Swagger 文档: http://localhost:3456/docs" -ForegroundColor White
} else {
    Write-Host "`n⚠️ 部分文件部署失败，请检查错误信息" -ForegroundColor Yellow
}
