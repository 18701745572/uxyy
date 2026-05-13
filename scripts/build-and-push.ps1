# 优效营 (uxyy) Docker 镜像构建和推送脚本
# 使用方法: .\scripts\build-and-push.ps1 -Username "你的Sealos用户名"

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [string]$Registry = "sealos.hub:5000",
    [switch]$SkipBuild,
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    优效营 (uxyy) 镜像构建和推送脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker
Write-Host "🔍 检查 Docker 环境..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker 已安装: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker 未安装或未启动，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 获取项目根目录
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "📁 项目目录: $projectRoot" -ForegroundColor Gray
Write-Host ""

# 构建镜像
if (-not $SkipBuild) {
    Write-Host "🔨 开始构建镜像..." -ForegroundColor Yellow
    Write-Host ""
    
    # 构建后端 API 镜像
    Write-Host "📦 构建后端 API 镜像 (uxyy-api)..." -ForegroundColor Cyan
    try {
        docker build -t uxyy-api:latest -f uxyy-api/Dockerfile .
        if ($LASTEXITCODE -ne 0) { throw "构建失败" }
        Write-Host "✅ 后端 API 镜像构建成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ 后端 API 镜像构建失败: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # 构建前端 Web 镜像
    Write-Host "📦 构建前端 Web 镜像 (uxyy-web)..." -ForegroundColor Cyan
    try {
        docker build -t uxyy-web:latest -f uxyy-web/Dockerfile .
        if ($LASTEXITCODE -ne 0) { throw "构建失败" }
        Write-Host "✅ 前端 Web 镜像构建成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ 前端 Web 镜像构建失败: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "⏭️  跳过构建步骤" -ForegroundColor Gray
}

# 显示本地镜像
Write-Host "📋 本地镜像列表:" -ForegroundColor Yellow
docker images | findstr "uxyy"
Write-Host ""

# 推送镜像
if (-not $SkipPush) {
    Write-Host "🚀 开始推送镜像到 Sealos..." -ForegroundColor Yellow
    Write-Host ""
    
    # 检查登录状态
    Write-Host "🔐 检查镜像仓库登录状态..." -ForegroundColor Cyan
    $loggedIn = docker info 2>&1 | findstr "Registry"
    if (-not $loggedIn) {
        Write-Host "⚠️  未登录到镜像仓库，请先执行:" -ForegroundColor Yellow
        Write-Host "    docker login $Registry -u $Username" -ForegroundColor White
        Write-Host ""
        $login = Read-Host "是否现在登录? (y/n)"
        if ($login -eq "y") {
            docker login $Registry -u $Username
        } else {
            Write-Host "❌ 取消推送" -ForegroundColor Red
            exit 1
        }
    }
    
    # 标记后端镜像
    Write-Host "🏷️  标记后端镜像..." -ForegroundColor Cyan
    $apiImage = "$Registry/${Username}/uxyy-api:latest"
    docker tag uxyy-api:latest $apiImage
    Write-Host "   镜像: $apiImage" -ForegroundColor Gray
    
    # 标记前端镜像
    Write-Host "🏷️  标记前端镜像..." -ForegroundColor Cyan
    $webImage = "$Registry/${Username}/uxyy-web:latest"
    docker tag uxyy-web:latest $webImage
    Write-Host "   镜像: $webImage" -ForegroundColor Gray
    Write-Host ""
    
    # 推送后端镜像
    Write-Host "📤 推送后端 API 镜像..." -ForegroundColor Cyan
    try {
        docker push $apiImage
        if ($LASTEXITCODE -ne 0) { throw "推送失败" }
        Write-Host "✅ 后端 API 镜像推送成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ 后端 API 镜像推送失败: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    # 推送前端镜像
    Write-Host "📤 推送前端 Web 镜像..." -ForegroundColor Cyan
    try {
        docker push $webImage
        if ($LASTEXITCODE -ne 0) { throw "推送失败" }
        Write-Host "✅ 前端 Web 镜像推送成功" -ForegroundColor Green
    } catch {
        Write-Host "❌ 前端 Web 镜像推送失败: $_" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    
    Write-Host "✅ 所有镜像推送完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "镜像地址:" -ForegroundColor Yellow
    Write-Host "  后端: $apiImage" -ForegroundColor White
    Write-Host "  前端: $webImage" -ForegroundColor White
} else {
    Write-Host "⏭️  跳过推送步骤" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    构建和推送完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 在 Sealos 控制台部署应用" -ForegroundColor White
Write-Host "  2. 或使用 sealos apply -f sealos.yaml" -ForegroundColor White
Write-Host ""

Read-Host "按 Enter 键退出"
