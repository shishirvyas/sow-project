# Azure Deployment Script for SOW Project
# This script automates the deployment of your SOW application to Azure

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "sow-project-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus",
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIKey,
    
    [Parameter(Mandatory=$false)]
    [string]$DBPassword = "SecurePassword123!"
)

Write-Host "🚀 Starting Azure Deployment for SOW Project" -ForegroundColor Green
Write-Host "=" * 60

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "✅ Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install Microsoft.AzureCLI" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$account = az account show 2>$null
if (-not $account) {
    Write-Host "🔐 Logging in to Azure..." -ForegroundColor Yellow
    az login
}

Write-Host "✅ Logged in to Azure" -ForegroundColor Green
Write-Host ""

# Step 1: Create Resource Group
Write-Host "📦 Creating Resource Group: $ResourceGroup" -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location --output none
Write-Host "✅ Resource Group created" -ForegroundColor Green
Write-Host ""

# Step 2: Create PostgreSQL Database
Write-Host "🗄️  Creating PostgreSQL Database..." -ForegroundColor Cyan
$DB_SERVER_NAME = "sow-db-server-$(Get-Random -Maximum 9999)"
$DB_NAME = "sowdb"
$DB_ADMIN_USER = "sowadmin"

Write-Host "   Server Name: $DB_SERVER_NAME" -ForegroundColor Gray
az postgres flexible-server create `
    --resource-group $ResourceGroup `
    --name $DB_SERVER_NAME `
    --location $Location `
    --admin-user $DB_ADMIN_USER `
    --admin-password $DBPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --storage-size 32 `
    --version 14 `
    --public-access 0.0.0.0-255.255.255.255 `
    --yes `
    --output none

az postgres flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name $DB_SERVER_NAME `
    --database-name $DB_NAME `
    --output none

$DB_HOST = "$DB_SERVER_NAME.postgres.database.azure.com"
$DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DBPassword}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

Write-Host "✅ PostgreSQL Database created" -ForegroundColor Green
Write-Host "   Host: $DB_HOST" -ForegroundColor Gray
Write-Host ""

# Step 3: Create Storage Account
Write-Host "💾 Creating Storage Account..." -ForegroundColor Cyan
$STORAGE_ACCOUNT = "sowstorage$(Get-Random -Maximum 9999)"
$CONTAINER_NAME = "sow-output"

az storage account create `
    --name $STORAGE_ACCOUNT `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Standard_LRS `
    --kind StorageV2 `
    --output none

$STORAGE_CONNECTION_STRING = az storage account show-connection-string `
    --name $STORAGE_ACCOUNT `
    --resource-group $ResourceGroup `
    --query connectionString `
    --output tsv

az storage container create `
    --name $CONTAINER_NAME `
    --connection-string $STORAGE_CONNECTION_STRING `
    --public-access blob `
    --output none

Write-Host "✅ Storage Account created" -ForegroundColor Green
Write-Host "   Account: $STORAGE_ACCOUNT" -ForegroundColor Gray
Write-Host ""

# Step 4: Setup Database Schema
Write-Host "🔧 Setting up Database Schema..." -ForegroundColor Cyan
$env:DATABASE_URL = $DATABASE_URL

Push-Location "$PSScriptRoot\sow-backend"
try {
    python -c "
import sys
sys.path.insert(0, '.')
from src.app.db.client import get_db_connection_dict
import psycopg2

try:
    conn_dict = get_db_connection_dict()
    conn = psycopg2.connect(**conn_dict)
    cursor = conn.cursor()
    
    with open('src/app/db/schema.sql', 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        cursor.execute(schema_sql)
    
    conn.commit()
    cursor.close()
    conn.close()
    print('✅ Database schema created successfully!')
except Exception as e:
    print(f'❌ Error: {str(e)}')
    sys.exit(1)
"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Database schema setup had issues. You may need to run it manually." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}
Write-Host ""

# Step 5: Deploy Backend
Write-Host "🐍 Deploying Backend to Azure App Service..." -ForegroundColor Cyan
$APP_SERVICE_PLAN = "sow-backend-plan"
$BACKEND_APP_NAME = "sow-backend-$(Get-Random -Maximum 9999)"

# Create App Service Plan
az appservice plan create `
    --name $APP_SERVICE_PLAN `
    --resource-group $ResourceGroup `
    --location $Location `
    --is-linux `
    --sku B1 `
    --output none

# Create Web App
az webapp create `
    --resource-group $ResourceGroup `
    --plan $APP_SERVICE_PLAN `
    --name $BACKEND_APP_NAME `
    --runtime "PYTHON:3.11" `
    --output none

# Configure App Settings
Write-Host "   Configuring environment variables..." -ForegroundColor Gray
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $BACKEND_APP_NAME `
    --settings `
        ENV="production" `
        DATABASE_URL="$DATABASE_URL" `
        AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" `
        AZURE_CONTAINER_NAME="$CONTAINER_NAME" `
        OPENAI_API_KEY="$OpenAIKey" `
        JWT_SECRET_KEY="$(New-Guid)" `
        CORS_ORIGINS="*" `
        CALL_LLM="true" `
        USE_PROMPT_DATABASE="true" `
    --output none

# Deploy Backend Code
Write-Host "   Packaging backend code..." -ForegroundColor Gray
Push-Location "$PSScriptRoot\sow-backend"
$deployZip = "$env:TEMP\backend-deploy.zip"
if (Test-Path $deployZip) { Remove-Item $deployZip }
Compress-Archive -Path src,requirements.txt,Procfile -DestinationPath $deployZip -Force

Write-Host "   Uploading to Azure..." -ForegroundColor Gray
az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $BACKEND_APP_NAME `
    --src $deployZip `
    --output none

# Configure startup command
az webapp config set `
    --resource-group $ResourceGroup `
    --name $BACKEND_APP_NAME `
    --startup-file "gunicorn src.app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120" `
    --output none

Pop-Location

$BACKEND_URL = "https://$BACKEND_APP_NAME.azurewebsites.net"
Write-Host "✅ Backend deployed successfully" -ForegroundColor Green
Write-Host "   URL: $BACKEND_URL" -ForegroundColor Gray
Write-Host ""

# Step 6: Deploy Frontend
Write-Host "⚛️  Building and Deploying Frontend..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\frontend"

# Create production env file
@"
VITE_API_URL=$BACKEND_URL
"@ | Out-File -FilePath .env.production -Encoding UTF8

Write-Host "   Installing dependencies..." -ForegroundColor Gray
npm install --silent

Write-Host "   Building production bundle..." -ForegroundColor Gray
npm run build

# Enable static website on storage
Write-Host "   Deploying to Azure Storage Static Website..." -ForegroundColor Gray
az storage blob service-properties update `
    --account-name $STORAGE_ACCOUNT `
    --static-website `
    --index-document index.html `
    --404-document index.html `
    --connection-string $STORAGE_CONNECTION_STRING `
    --output none

# Upload files
az storage blob upload-batch `
    --account-name $STORAGE_ACCOUNT `
    --destination '$web' `
    --source dist `
    --connection-string $STORAGE_CONNECTION_STRING `
    --overwrite `
    --output none

Pop-Location

$FRONTEND_URL = az storage account show `
    --name $STORAGE_ACCOUNT `
    --resource-group $ResourceGroup `
    --query primaryEndpoints.web `
    --output tsv

Write-Host "✅ Frontend deployed successfully" -ForegroundColor Green
Write-Host "   URL: $FRONTEND_URL" -ForegroundColor Gray
Write-Host ""

# Step 7: Update CORS
Write-Host "🔗 Updating CORS settings..." -ForegroundColor Cyan
az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $BACKEND_APP_NAME `
    --settings CORS_ORIGINS="$FRONTEND_URL,https://$BACKEND_APP_NAME.azurewebsites.net" `
    --output none
Write-Host "✅ CORS configured" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ""
Write-Host "=" * 60
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "=" * 60
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resource Group:    $ResourceGroup" -ForegroundColor White
Write-Host "Location:          $Location" -ForegroundColor White
Write-Host ""
Write-Host "🗄️  Database:" -ForegroundColor Yellow
Write-Host "   Server:         $DB_SERVER_NAME" -ForegroundColor Gray
Write-Host "   Host:           $DB_HOST" -ForegroundColor Gray
Write-Host "   Database:       $DB_NAME" -ForegroundColor Gray
Write-Host "   Username:       $DB_ADMIN_USER" -ForegroundColor Gray
Write-Host ""
Write-Host "💾 Storage:" -ForegroundColor Yellow
Write-Host "   Account:        $STORAGE_ACCOUNT" -ForegroundColor Gray
Write-Host "   Container:      $CONTAINER_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "🐍 Backend:" -ForegroundColor Yellow
Write-Host "   App Name:       $BACKEND_APP_NAME" -ForegroundColor Gray
Write-Host "   URL:            $BACKEND_URL" -ForegroundColor Gray
Write-Host "   Health Check:   $BACKEND_URL/health" -ForegroundColor Gray
Write-Host ""
Write-Host "⚛️  Frontend:" -ForegroundColor Yellow
Write-Host "   URL:            $FRONTEND_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 Test your deployment:" -ForegroundColor Cyan
Write-Host "   Backend:  curl $BACKEND_URL/health" -ForegroundColor Gray
Write-Host "   Frontend: Start-Process $FRONTEND_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor Cyan
Write-Host "   az webapp log tail --resource-group $ResourceGroup --name $BACKEND_APP_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "🗑️  To delete everything:" -ForegroundColor Red
Write-Host "   az group delete --name $ResourceGroup --yes --no-wait" -ForegroundColor Gray
Write-Host ""

# Save configuration
$configFile = "$PSScriptRoot\azure-deployment-config.txt"
@"
AZURE DEPLOYMENT CONFIGURATION
Generated: $(Get-Date)
================================

Resource Group: $ResourceGroup
Location: $Location

Database:
  Server: $DB_SERVER_NAME
  Host: $DB_HOST
  Database: $DB_NAME
  Username: $DB_ADMIN_USER
  Connection String: $DATABASE_URL

Storage:
  Account: $STORAGE_ACCOUNT
  Container: $CONTAINER_NAME

Backend:
  App Name: $BACKEND_APP_NAME
  URL: $BACKEND_URL
  Health: $BACKEND_URL/health

Frontend:
  URL: $FRONTEND_URL

Commands:
  View Logs: az webapp log tail --resource-group $ResourceGroup --name $BACKEND_APP_NAME
  Restart Backend: az webapp restart --name $BACKEND_APP_NAME --resource-group $ResourceGroup
  Delete All: az group delete --name $ResourceGroup --yes --no-wait
"@ | Out-File -FilePath $configFile -Encoding UTF8

Write-Host "💾 Configuration saved to: $configFile" -ForegroundColor Green
Write-Host ""
