param(
    [string]$OutputFile = "..\DATN-Release-With-Env.zip"
)

Write-Host "[1/3] Preparing project package..." -ForegroundColor Cyan

$zipFullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputFile))

if (Test-Path $zipFullPath) {
    Remove-Item $zipFullPath -Force
    Write-Host "Removed existing zip file: $zipFullPath" -ForegroundColor Yellow
}

# 1. Dung git archive de tao file zip sach (khong chua .agents, node_modules, .git)
Write-Host "[2/3] Archiving clean source code from Git (excluding .agents, node_modules)..." -ForegroundColor Green
& git archive --format=zip --output=$zipFullPath HEAD

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to execute git archive."
    exit $LASTEXITCODE
}

# 2. Chen them file backend/.env va frontend/.env vao goi ZIP
Write-Host "[3/3] Injecting .env configuration files into the zip package..." -ForegroundColor Green
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipFullPath, [System.IO.Compression.ZipArchiveMode]::Update)

try {
    if (Test-Path "backend/.env") {
        Write-Host " + Added backend/.env" -ForegroundColor Green
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Resolve-Path "backend/.env"), "backend/.env") | Out-Null
    }

    if (Test-Path "frontend/.env") {
        Write-Host " + Added frontend/.env" -ForegroundColor Green
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Resolve-Path "frontend/.env"), "frontend/.env") | Out-Null
    }
}
finally {
    $zip.Dispose()
}

$fileSizeMB = [math]::Round((Get-Item $zipFullPath).Length / 1MB, 2)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SUCCESS! Zip package created at:" -ForegroundColor Cyan
Write-Host " $zipFullPath ($fileSizeMB MB)" -ForegroundColor Yellow
Write-Host " Your friend can extract this zip and run immediately!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
