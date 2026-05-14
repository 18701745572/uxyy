# 本地构建并打 Docker Hub 标签（示例：jianghuizhong18701745572/uxyy-*:v9）
# 用法：在仓库根目录执行
#   .\scripts\docker-hub-build-tag.ps1
# 然后登录 Docker Hub 后推送：
#   docker login
#   docker push jianghuizhong18701745572/uxyy-api:v9
#   docker push jianghuizhong18701745572/uxyy-web:v9

param(
    [string] $DockerUser = "jianghuizhong18701745572",
    [string] $Tag = "v9"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Building API & Web from monorepo root..." -ForegroundColor Cyan
docker build -t "uxyy-api:$Tag" -f uxyy-api/Dockerfile .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker build -t "uxyy-web:$Tag" -f uxyy-web/Dockerfile .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$apiRemote = "${DockerUser}/uxyy-api:${Tag}"
$webRemote = "${DockerUser}/uxyy-web:${Tag}"
docker tag "uxyy-api:$Tag" $apiRemote
docker tag "uxyy-web:$Tag" $webRemote

Write-Host "Tagged:`n  $apiRemote`n  $webRemote" -ForegroundColor Green
Write-Host "Push with:`n  docker push $apiRemote`n  docker push $webRemote" -ForegroundColor Yellow
