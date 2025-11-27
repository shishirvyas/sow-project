# Manual Deployment Steps - Azure Free Tier

This guide provides step-by-step manual commands for deploying to Azure. Follow these if you prefer to understand and execute each step individually.

## Prerequisites Checklist

- [ ] Azure free account created: https://azure.microsoft.com/free/
- [ ] Azure CLI installed: `winget install Microsoft.AzureCLI`
- [ ] Docker Desktop installed (optional, for local testing)
- [ ] OpenAI API key ready
- [ ] Git repository access

## Step 1: Login to Azure

```powershell
# Login to your Azure account
az login

# Verify your subscription
az account show

# List all subscriptions (if you have multiple)
az account list --output table

# Set active subscription (if needed)
az account set --subscription "Your Subscription Name"
```

## Step 2: Set Variables

```powershell
# Define your resource names
$RESOURCE_GROUP = "sow-project-rg"
$LOCATION = "eastus"  # Choose: eastus, westus, westeurope, etc.
$DB_SERVER_NAME = "sow-db-$(Get-Random -Maximum 9999)"
$DB_NAME = "sowdb"
$DB_ADMIN_USER = "sowadmin"
$DB_ADMIN_PASSWORD = "YourSecurePassword123!"  # CHANGE THIS!
$STORAGE_ACCOUNT = "sowstorage$(Get-Random -Maximum 9999)"
$CONTAINER_NAME = "sow-output"
$APP_SERVICE_PLAN = "sow-backend-plan"
$BACKEND_APP_NAME = "sow-backend-$(Get-Random -Maximum 9999)"
$OPENAI_API_KEY = "your-openai-api-key-here"  # CHANGE THIS!

# Print variables for verification
Write-Host "Resource Group: $RESOURCE_GROUP"
Write-Host "DB Server: $DB_SERVER_NAME"
Write-Host "Storage Account: $STORAGE_ACCOUNT"
Write-Host "Backend App: $BACKEND_APP_NAME"
```

## Step 3: Create Resource Group

```powershell
# Create the resource group
az group create `
  --name $RESOURCE_GROUP `
  --location $LOCATION

# Verify creation
az group show --name $RESOURCE_GROUP
```

**Expected Output**: JSON with resource group details

## Step 4: Create PostgreSQL Database

```powershell
# Create PostgreSQL Flexible Server (Free tier eligible)
az postgres flexible-server create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --location $LOCATION `
  --admin-user $DB_ADMIN_USER `
  --admin-password $DB_ADMIN_PASSWORD `
  --sku-name Standard_B1ms `
  --tier Burstable `
  --storage-size 32 `
  --version 14 `
  --public-access 0.0.0.0-255.255.255.255 `
  --yes

# This takes 5-10 minutes. Wait for completion.
```

```powershell
# Create the database
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $DB_SERVER_NAME `
  --database-name $DB_NAME

# Get connection details
$DB_HOST = "$DB_SERVER_NAME.postgres.database.azure.com"
Write-Host "Database Host: $DB_HOST"

# Build connection string
$DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"
Write-Host "Connection String: $DATABASE_URL"
```

**Test Connection** (optional, requires psql):
```powershell
psql "$DATABASE_URL"
```

## Step 5: Create Storage Account

```powershell
# Create storage account
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS `
  --kind StorageV2

# Get connection string
$STORAGE_CONNECTION_STRING = az storage account show-connection-string `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query connectionString `
  --output tsv

Write-Host "Storage Connection String: $STORAGE_CONNECTION_STRING"

# Create blob container
az storage container create `
  --name $CONTAINER_NAME `
  --connection-string $STORAGE_CONNECTION_STRING `
  --public-access blob

# Verify container
az storage container list `
  --connection-string $STORAGE_CONNECTION_STRING `
  --output table
```

## Step 6: Setup Database Schema

```powershell
# Navigate to backend directory
cd C:\projects\sow-project\sow-backend

# Set environment variable
$env:DATABASE_URL = $DATABASE_URL

# Run schema creation script
python -c @"
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
"@
```

**Verify Tables** (optional):
```powershell
psql "$DATABASE_URL" -c "\dt"
```

## Step 7: Create App Service Plan

```powershell
# Create Linux App Service Plan
# B1 tier costs ~$13/month, F1 is free but very limited
az appservice plan create `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku B1

# For free tier (limited CPU, good for testing):
# --sku F1

# Verify plan
az appservice plan show `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP
```

## Step 8: Create and Configure Backend Web App

```powershell
# Create web app with Python runtime
az webapp create `
  --resource-group $RESOURCE_GROUP `
  --plan $APP_SERVICE_PLAN `
  --name $BACKEND_APP_NAME `
  --runtime "PYTHON:3.11"

# Configure application settings (environment variables)
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings `
    ENV="production" `
    DATABASE_URL="$DATABASE_URL" `
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" `
    AZURE_CONTAINER_NAME="$CONTAINER_NAME" `
    OPENAI_API_KEY="$OPENAI_API_KEY" `
    JWT_SECRET_KEY="$(New-Guid)" `
    CORS_ORIGINS="*" `
    CALL_LLM="true" `
    USE_PROMPT_DATABASE="true" `
    OPENAI_MODEL="gpt-4o-mini" `
    MAX_CHARS_FOR_SINGLE_CALL="4000"

# Verify settings
az webapp config appsettings list `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --output table
```

## Step 9: Deploy Backend Code

```powershell
# Navigate to backend directory
cd C:\projects\sow-project\sow-backend

# Create deployment package
$deployZip = "$env:TEMP\backend-deploy.zip"
Remove-Item $deployZip -ErrorAction SilentlyContinue
Compress-Archive -Path src,requirements.txt,Procfile -DestinationPath $deployZip -Force

# Upload to Azure
az webapp deployment source config-zip `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --src $deployZip

# This takes 5-10 minutes for dependencies to install
```

```powershell
# Configure startup command
az webapp config set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --startup-file "gunicorn src.app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120"

# Restart the app
az webapp restart `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME
```

**Test Backend**:
```powershell
$BACKEND_URL = "https://$BACKEND_APP_NAME.azurewebsites.net"
Write-Host "Backend URL: $BACKEND_URL"

# Test health endpoint (wait 2-3 minutes after deployment)
curl "$BACKEND_URL/health"
```

**Expected Response**: `{"status":"healthy"}`

## Step 10: Build Frontend

```powershell
# Navigate to frontend directory
cd C:\projects\sow-project\frontend

# Create production environment file
@"
VITE_API_URL=https://$BACKEND_APP_NAME.azurewebsites.net
"@ | Out-File -FilePath .env.production -Encoding UTF8

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build
Get-ChildItem dist
```

## Step 11: Deploy Frontend to Storage Static Website

```powershell
# Enable static website hosting
az storage blob service-properties update `
  --account-name $STORAGE_ACCOUNT `
  --static-website `
  --index-document index.html `
  --404-document index.html `
  --connection-string $STORAGE_CONNECTION_STRING

# Upload built files
az storage blob upload-batch `
  --account-name $STORAGE_ACCOUNT `
  --destination '$web' `
  --source dist `
  --connection-string $STORAGE_CONNECTION_STRING `
  --overwrite

# Get frontend URL
$FRONTEND_URL = az storage account show `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query primaryEndpoints.web `
  --output tsv

Write-Host "Frontend URL: $FRONTEND_URL"
```

**Test Frontend**:
```powershell
Start-Process $FRONTEND_URL
```

## Step 12: Update CORS Settings

```powershell
# Update backend CORS to allow frontend
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings CORS_ORIGINS="$FRONTEND_URL,https://$BACKEND_APP_NAME.azurewebsites.net"

# Restart backend
az webapp restart `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME
```

## Step 13: Verify Deployment

```powershell
# Check backend health
curl "https://$BACKEND_APP_NAME.azurewebsites.net/health"

# Check backend API
curl "https://$BACKEND_APP_NAME.azurewebsites.net/api/v1/hello"

# Open frontend
Start-Process $FRONTEND_URL

# View backend logs (real-time)
az webapp log tail `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME
```

## Troubleshooting Commands

### View Backend Logs
```powershell
# Stream logs in real-time
az webapp log tail `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME

# Download log files
az webapp log download `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --log-file backend-logs.zip
```

### Check Application Status
```powershell
# Web app status
az webapp show `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --query state

# Database status
az postgres flexible-server show `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --query state
```

### Restart Services
```powershell
# Restart backend
az webapp restart `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME

# Restart database (if needed)
az postgres flexible-server restart `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME
```

### View All Resources
```powershell
# List all resources in group
az resource list `
  --resource-group $RESOURCE_GROUP `
  --output table

# View costs (if available)
az consumption usage list `
  --output table
```

## Common Issues and Solutions

### Issue: Backend returns 500 error

**Solution**: Check logs for Python errors
```powershell
az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME
```

Common causes:
- Missing environment variables
- Database connection issues
- Missing Python packages

### Issue: Database connection failed

**Solution**: Check firewall rules
```powershell
# Add your IP to firewall
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --rule-name AllowMyIP `
  --start-ip-address YOUR_IP `
  --end-ip-address YOUR_IP

# Or allow all IPs (not recommended for production)
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --rule-name AllowAll `
  --start-ip-address 0.0.0.0 `
  --end-ip-address 255.255.255.255
```

### Issue: Frontend shows CORS errors

**Solution**: Update CORS settings
```powershell
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings CORS_ORIGINS="*"
```

### Issue: Frontend routes return 404

**Solution**: Already configured with `--404-document index.html` in Step 11

## Cleanup (Delete Everything)

```powershell
# Delete entire resource group and all resources
az group delete `
  --name $RESOURCE_GROUP `
  --yes `
  --no-wait

# Verify deletion (after a few minutes)
az group list --query "[?name=='$RESOURCE_GROUP']"
```

## Cost Summary (Free Tier)

### Free for 12 months:
- **App Service**: 10 web apps, 1 GB disk, 60 CPU min/day
- **PostgreSQL**: 750 hours/month (Burstable B1ms)
- **Storage**: 5 GB LRS + 50,000 transactions
- **Bandwidth**: First 5 GB/month

### After Free Tier (Monthly):
- **App Service B1**: ~$13/month
- **PostgreSQL B1ms**: ~$12/month
- **Storage**: ~$0.18/GB/month
- **Total**: ~$25-30/month

### Free Forever Options:
- **App Service F1**: Free but limited (60 min CPU/day)
- **Azure Functions**: 1M executions/month free
- **Static Web Apps**: 100 GB bandwidth/month free

## Save Configuration

```powershell
# Save all variables to a file
@"
AZURE DEPLOYMENT CONFIGURATION
================================
Resource Group: $RESOURCE_GROUP
Location: $LOCATION

Database:
  Server: $DB_SERVER_NAME
  Host: $DB_HOST
  Database: $DB_NAME
  Username: $DB_ADMIN_USER
  Password: $DB_ADMIN_PASSWORD
  Connection: $DATABASE_URL

Storage:
  Account: $STORAGE_ACCOUNT
  Container: $CONTAINER_NAME
  Connection: $STORAGE_CONNECTION_STRING

Backend:
  App Name: $BACKEND_APP_NAME
  URL: https://$BACKEND_APP_NAME.azurewebsites.net
  Health: https://$BACKEND_APP_NAME.azurewebsites.net/health

Frontend:
  URL: $FRONTEND_URL

OpenAI:
  Key: $OPENAI_API_KEY
"@ | Out-File -FilePath "C:\projects\sow-project\azure-config.txt" -Encoding UTF8

Write-Host "✅ Configuration saved to: C:\projects\sow-project\azure-config.txt"
```

## Next Steps

1. ✅ Test both frontend and backend
2. ✅ Create initial admin user
3. ✅ Upload SOW documents
4. ✅ Test SOW analysis
5. 🔒 Setup authentication
6. 📊 Configure monitoring/alerts
7. 🔄 Setup CI/CD with GitHub Actions

## Additional Resources

- Azure Portal: https://portal.azure.com
- Azure CLI Docs: https://learn.microsoft.com/cli/azure/
- App Service Docs: https://learn.microsoft.com/azure/app-service/
- PostgreSQL Docs: https://learn.microsoft.com/azure/postgresql/

---

**Completed!** 🎉 Your SOW application is now running on Azure!
