# Quick Start Script for Azure Deployment
# Run this to set up Azure resources step-by-step with confirmations

Write-Host "🚀 SOW Project - Azure Quick Start" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""

# Check Azure CLI
Write-Host "Checking prerequisites..." -ForegroundColor Cyan
try {
    $azVersion = az --version 2>&1 | Select-String "azure-cli" | Select-Object -First 1
    Write-Host "✅ Azure CLI: $azVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI not found. Install it with:" -ForegroundColor Red
    Write-Host "   winget install Microsoft.AzureCLI" -ForegroundColor Yellow
    exit 1
}

# Login check
Write-Host ""
Write-Host "Checking Azure login status..." -ForegroundColor Cyan
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "🔐 Please login to Azure..." -ForegroundColor Yellow
    az login
    $account = az account show | ConvertFrom-Json
}

Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Collect inputs
Write-Host "📝 Configuration" -ForegroundColor Cyan
Write-Host ""

$ResourceGroup = Read-Host "Enter Resource Group name [sow-project-rg]"
if ([string]::IsNullOrWhiteSpace($ResourceGroup)) { $ResourceGroup = "sow-project-rg" }

$Location = Read-Host "Enter Azure Region [eastus]"
if ([string]::IsNullOrWhiteSpace($Location)) { $Location = "eastus" }

Write-Host ""
Write-Host "⚠️  Important: You'll need your OpenAI API key" -ForegroundColor Yellow
$OpenAIKey = Read-Host "Enter your OpenAI API Key" -AsSecureString
$OpenAIKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($OpenAIKey)
)

Write-Host ""
$DBPassword = Read-Host "Enter PostgreSQL admin password [SecurePassword123!]"
if ([string]::IsNullOrWhiteSpace($DBPassword)) { $DBPassword = "SecurePassword123!" }

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  Location: $Location" -ForegroundColor White
Write-Host "  OpenAI Key: ***hidden***" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Green
Write-Host ""

# Run main deployment script
$scriptPath = Join-Path $PSScriptRoot "deploy-azure.ps1"
if (Test-Path $scriptPath) {
    & $scriptPath -ResourceGroup $ResourceGroup -Location $Location -OpenAIKey $OpenAIKeyPlain -DBPassword $DBPassword
} else {
    Write-Host "❌ Deployment script not found at: $scriptPath" -ForegroundColor Red
    exit 1
}
