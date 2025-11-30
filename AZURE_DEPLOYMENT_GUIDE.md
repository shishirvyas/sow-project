# Azure Deployment Guide for SOW Project

This guide will help you deploy your SOW analysis application to Azure using your existing resource group `rg-sow-project`.

## 🎯 Architecture Overview

Your application consists of:
1. **Backend**: Python FastAPI application (sow-backend)
2. **Frontend**: React + Vite application (frontend)
3. **Database**: PostgreSQL (currently on Aiven, will migrate to Azure)
4. **Storage**: Azure Blob Storage (already configured)

## 📋 Your Azure Setup

- **Resource Group**: `rg-sow-project` (already created ✅)
- **Region**: East US (or your selected region)
- **Deployment Method**: Azure Portal (Web UI)

## 🚀 Azure Portal Deployment Steps

### Step 1: Create PostgreSQL Database

1. **Login to Azure Portal**: https://portal.azure.com
2. **Navigate to your Resource Group**:
   - Search for "Resource groups" in top search bar
   - Click on **`rg-sow-project`**
3. **Create PostgreSQL Server**:
   - Click **"+ Create"** at the top
   - Search for **"Azure Database for PostgreSQL Flexible Server"**
   - Click **"Create"**
   
4. **Configure Database**:
   - **Resource group**: `rg-sow-project`
   - **Server name**: `sow-db-server` (or add suffix for uniqueness)
   - **Region**: Same as your resource group
   - **PostgreSQL version**: `14` or `15`
   - **Workload type**: Development (cheaper) or Production
   - **Compute + Storage**: 
     - Click "Configure server"
     - Tier: **Burstable** 
     - Compute: **B1ms** (1 vCore, 2 GB)
     - Storage: **32 GB**
   - **Authentication**:
     - Admin username: `sowadmin`
     - Password: [Create strong password - SAVE THIS!]
   - **Networking**:
     - Connectivity: **Public access**
     - ✅ "Allow public access from any Azure service"
     - ✅ "Add current client IP address"
   - Click **"Review + create"** → **"Create"**

5. **Create Database**:
   - Wait 5-10 minutes for deployment
   - Click **"Go to resource"**
   - Left menu → **"Databases"** → **"+ Add"**
   - Database name: `sowdb`
   - Click **"Save"**

**📝 Save Connection Details**:
```
Server: sow-db-server.postgres.database.azure.com
Username: sowadmin
Password: [your password]
Database: sowdb
Connection String: postgresql://sowadmin:[PASSWORD]@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require
```

---

### Step 2: Create Storage Account (if not exists)

1. In **`rg-sow-project`** resource group
2. Click **"+ Create"** → Search **"Storage account"**
3. **Configure**:
   - **Storage account name**: `sowstorage[random]` (lowercase, no spaces)
   - **Region**: Same as resource group
   - **Performance**: Standard
   - **Redundancy**: LRS (cheapest)
4. Click **"Review + create"** → **"Create"**
5. After deployment:
   - Go to storage account
   - Left menu → **"Containers"** → **"+ Container"**
   - Name: `sow-output`
   - Public access: **Blob**
   - Click **"Create"**
6. **Get Connection String**:
   - Left menu → **"Access keys"**
   - Copy **"Connection string"** from key1

**📝 Save**:
```
Storage Account: sowstorage[numbers]
Container: sow-output
Connection String: [copy full string]
```

---

### Step 3: Setup Database Schema & Users

**On your local machine (PowerShell)**:

```powershell
cd C:\projects\sow-project\sow-backend

# Install required package
pip install psycopg2-binary

# Set your Azure database URL (replace [PASSWORD] with your actual password)
$env:DATABASE_URL="postgresql://sowadmin:[PASSWORD]@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require"

# Run database setup script
python -c "
import psycopg2
import os

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Create schema
with open('src/app/db/rbac_schema.sql', 'r', encoding='utf-8') as f:
    cursor.execute(f.read())
    print('✅ RBAC schema created')

# Run migrations
migrations = [
    'src/app/db/migrations/add_menu_groups.sql',
    'src/app/db/migrations/add_user_profiles.sql',
    'src/app/db/migrations/update_user_emails.sql',
    'src/app/db/migrations/rebrand_to_skope360.sql',
    'src/app/db/migrations/add_rahul_user.sql'
]

for migration in migrations:
    try:
        with open(migration, 'r', encoding='utf-8') as f:
            cursor.execute(f.read())
        print(f'✅ {migration}')
    except Exception as e:
        print(f'⚠️ {migration}: {e}')

conn.commit()
cursor.close()
conn.close()
print('\n✅ Database setup complete!')
"
```

---

### Step 4: Deploy Backend (App Service)

1. In **`rg-sow-project`** resource group
2. Click **"+ Create"** → Search **"Web App"**
3. **Configure**:
   - **Name**: `sow-backend-[yourname]` (must be globally unique)
   - **Publish**: Code
   - **Runtime**: Python 3.11
   - **Operating System**: Linux
   - **Region**: Same as resource group
   - **Pricing Plan**: 
     - Click "Create new"
     - Name: `sow-plan`
     - Tier: **F1 (Free)** or **B1 (Basic ~$13/month)** for better performance
4. Click **"Review + create"** → **"Create"**

5. **Configure Environment Variables**:
   - Go to your App Service
   - Left menu → **"Configuration"** → **"Application settings"**
   - Add these settings (click "+ New application setting" for each):

   ```
   ENV = production
   DATABASE_URL = postgresql://sowadmin:[PASSWORD]@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require
   AZURE_STORAGE_CONNECTION_STRING = [Your storage connection string]
   AZURE_CONTAINER_NAME = sow-output
   OPENAI_API_KEY = [Your OpenAI key]
   GROQ_API_KEY = [Your Groq key if available]
   JWT_SECRET_KEY = [Generate random: https://www.uuidgenerator.net/]
   CORS_ORIGINS = *
   CALL_LLM = true
   USE_PROMPT_DATABASE = true
   ```
   - Click **"Save"** at top

6. **Set Startup Command**:
   - Still in **"Configuration"** → **"General settings"** tab
   - **Startup Command**: 
     ```
     gunicorn src.app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120
     ```
   - Click **"Save"**

7. **Deploy Code** (Choose one method):

   **Method A: VS Code Azure Extension** (Recommended):
   - Install "Azure App Service" extension in VS Code
   - Sign in to Azure
   - View → Command Palette → "Azure App Service: Deploy to Web App"
   - Select `sow-backend` folder
   - Select your `sow-backend-[name]` app

   **Method B: Manual ZIP Upload**:
   ```powershell
   cd C:\projects\sow-project\sow-backend
   
   # Create zip (exclude virtual env and cache)
   $files = @('src', 'requirements.txt', 'Procfile')
   Compress-Archive -Path $files -DestinationPath deploy.zip -Force
   ```
   - In Azure Portal → App Service → Left menu → **"Deployment Center"**
   - Select **"Local Git/ZIP Deploy"**
   - Or: **"Advanced Tools"** → **"Go"** (Kudu) → **"Tools"** → **"Zip Push Deploy"** → Upload `deploy.zip`

8. **Verify Backend**:
   - URL: `https://sow-backend-[yourname].azurewebsites.net/health`
   - Should return: `{"status": "healthy"}`

---

### Step 5: Deploy Frontend

**Build Frontend First**:

```powershell
cd C:\projects\sow-project\frontend

# Update API URL - create/edit src/config/api.js
@"
const API_BASE_URL = 'https://sow-backend-[yourname].azurewebsites.net';
export { API_BASE_URL };
"@ | Out-File -FilePath src/config/api.js -Encoding UTF8

# Build
npm install
npm run build
```

**Deploy to Azure Storage (Static Website)**:

1. Go to your **Storage Account** in `rg-sow-project`
2. Left menu → **"Static website"**
3. Click **"Enabled"**
   - Index document: `index.html`
   - Error document: `index.html`
4. Click **"Save"**
5. Note the **Primary endpoint** URL
6. Left menu → **"Storage Browser"** → **"Blob containers"** → **"$web"**
7. Click **"Upload"** button
8. Upload ALL files from `C:\projects\sow-project\frontend\dist` folder

**Your Frontend URL**: `https://[storage-account].z13.web.core.windows.net`

**Alternative: Static Web App**:
1. In `rg-sow-project` → **"+ Create"** → Search **"Static Web App"**
2. Name: `sow-frontend`
3. Plan: Free
4. Deployment: Other
5. After creation, use Azure CLI or VS Code to deploy `dist` folder

---

### Step 6: Configure CORS

1. Go to your **App Service** (backend)
2. Left menu → **"CORS"**
3. Add allowed origins:
   - Your storage static website URL
   - Or use `*` for testing
4. Click **"Save"**

---

### Step 7: Test Application

1. Open your frontend URL
2. Login with: `rahul@skope360.ai` / `password123`
3. Test SOW analysis

---

## 📋 Quick Reference - Your Resources

| Resource | Name | URL/Connection |
|----------|------|----------------|
| Resource Group | `rg-sow-project` | - |
| PostgreSQL | `sow-db-server` | `sow-db-server.postgres.database.azure.com` |
| Storage Account | `sowstorage[xxx]` | - |
| Backend App Service | `sow-backend-[xxx]` | `https://sow-backend-[xxx].azurewebsites.net` |
| Frontend | Storage or Static Web App | `https://[xxx].z13.web.core.windows.net` |

---

## 🐛 Troubleshooting

### Backend Issues
1. **App Service** → **"Log stream"** - view real-time logs
2. Check **"Configuration"** - ensure all environment variables are set
3. **PostgreSQL** → **"Networking"** - ensure firewall allows connections

### Database Connection
- PostgreSQL → **"Networking"** → **"Firewall rules"** → Add your IP
- Test connection: `psql "postgresql://sowadmin:[PASSWORD]@sow-db-server.postgres.database.azure.com:5432/sowdb?sslmode=require"`

### Frontend Issues
- Check browser console for API errors
- Verify CORS is configured on backend
- Ensure API URL is correct in frontend config

---

## 💰 Estimated Monthly Cost

Using Free/Basic Tiers:
- App Service F1: **Free** (limited)
- App Service B1: **~$13/month**
- PostgreSQL B1ms: **~$12/month**
- Storage: **~$0.50/month**

**Total**: ~$12-26/month (depending on App Service tier)

---

## 📋 Prerequisites

### 1. Azure Free Account Setup
- Sign up at https://azure.microsoft.com/free/
- $200 credit for 30 days + 12 months of free services
- Free tier includes:
  - Azure App Service (750 hours/month)
  - Azure Database for PostgreSQL (750 hours/month)
  - Azure Blob Storage (5 GB)

### 2. Install Azure CLI
```powershell
# Install Azure CLI on Windows
winget install Microsoft.AzureCLI

# Or download from https://aka.ms/installazurecliwindows

# Verify installation
az --version

# Login to Azure
az login
```

### 3. Install Required Tools
```powershell
# Install Docker Desktop (if not already installed)
# Download from https://www.docker.com/products/docker-desktop

# Verify Docker
docker --version
```

## 🚀 Deployment Steps

### Step 1: Setup Azure Resources

#### 1.1 Create Resource Group
```powershell
# Set variables
$RESOURCE_GROUP="sow-project-rg"
$LOCATION="eastus"  # Or choose: westus, westeurope, etc.

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION
```

#### 1.2 Create Azure Database for PostgreSQL
```powershell
$DB_SERVER_NAME="sow-db-server-$(Get-Random)"  # Must be globally unique
$DB_NAME="sowdb"
$DB_ADMIN_USER="sowadmin"
$DB_ADMIN_PASSWORD="YourSecurePassword123!"  # Change this!

# Create PostgreSQL server (Flexible Server - Free tier eligible)
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
  --public-access 0.0.0.0-255.255.255.255

# Create database
az postgres flexible-server db create `
  --resource-group $RESOURCE_GROUP `
  --server-name $DB_SERVER_NAME `
  --database-name $DB_NAME

# Get connection string
$DB_HOST="$DB_SERVER_NAME.postgres.database.azure.com"
Write-Host "Database Host: $DB_HOST"
Write-Host "Connection String: postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require"
```

#### 1.3 Create Azure Storage Account (if not already using one)
```powershell
$STORAGE_ACCOUNT="sowstorage$(Get-Random -Maximum 9999)"
$CONTAINER_NAME="sow-output"

# Create storage account
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS `
  --kind StorageV2

# Get connection string
$STORAGE_CONNECTION_STRING=$(az storage account show-connection-string `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query connectionString -o tsv)

# Create container
az storage container create `
  --name $CONTAINER_NAME `
  --connection-string $STORAGE_CONNECTION_STRING `
  --public-access blob

Write-Host "Storage Connection String: $STORAGE_CONNECTION_STRING"
```

### Step 2: Migrate Database Schema

#### 2.1 Run Database Schema Script
```powershell
# Navigate to backend directory
cd C:\projects\sow-project\sow-backend

# Set environment variable for new Azure database
$env:DATABASE_URL="postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require"

# Run schema creation
python -c "
from src.app.db.client import get_db_connection_dict
import psycopg2

conn_dict = get_db_connection_dict()
conn = psycopg2.connect(**conn_dict)
cursor = conn.cursor()

# Read and execute schema.sql
with open('src/app/db/schema.sql', 'r') as f:
    schema_sql = f.read()
    cursor.execute(schema_sql)

conn.commit()
cursor.close()
conn.close()
print('✅ Database schema created successfully!')
"
```

#### 2.2 Migrate Data from Aiven (Optional)
If you want to copy existing data from Aiven to Azure:

```powershell
# Install pg_dump/pg_restore (PostgreSQL client tools)
# Download from https://www.postgresql.org/download/windows/

# Export from Aiven
pg_dump "postgresql://avnadmin:YOUR_AIVEN_PASSWORD@sow-service-sow.f.aivencloud.com:15467/defaultdb?sslmode=require" > backup.sql

# Import to Azure
psql "postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require" < backup.sql
```

### Step 3: Deploy Backend to Azure App Service

#### 3.1 Create App Service Plan
```powershell
$APP_SERVICE_PLAN="sow-backend-plan"
$BACKEND_APP_NAME="sow-backend-$(Get-Random)"

# Create Linux App Service Plan (Free F1 tier)
az appservice plan create `
  --name $APP_SERVICE_PLAN `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku F1  # Free tier
```

#### 3.2 Create Web App for Backend
```powershell
# Create web app with Python 3.11 runtime
az webapp create `
  --resource-group $RESOURCE_GROUP `
  --plan $APP_SERVICE_PLAN `
  --name $BACKEND_APP_NAME `
  --runtime "PYTHON:3.11"

# Configure environment variables
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings `
    ENV="production" `
    DATABASE_URL="postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require" `
    AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING" `
    AZURE_CONTAINER_NAME="$CONTAINER_NAME" `
    OPENAI_API_KEY="YOUR_OPENAI_KEY" `
    JWT_SECRET_KEY="$(New-Guid)" `
    CORS_ORIGINS="*"

Write-Host "Backend URL: https://$BACKEND_APP_NAME.azurewebsites.net"
```

#### 3.3 Deploy Backend Code
```powershell
# Navigate to backend directory
cd C:\projects\sow-project\sow-backend

# Create deployment zip (exclude unnecessary files)
$exclude = @('.venv', '__pycache__', '*.pyc', '.env', 'tests', '.git')
Compress-Archive -Path src,requirements.txt,run.sh -DestinationPath deploy.zip -Force

# Deploy to Azure
az webapp deployment source config-zip `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --src deploy.zip

# Configure startup command
az webapp config set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --startup-file "gunicorn src.app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120"

Write-Host "✅ Backend deployed! Visit: https://$BACKEND_APP_NAME.azurewebsites.net/health"
```

### Step 4: Deploy Frontend to Azure Static Web Apps

#### 4.1 Build Frontend
```powershell
cd C:\projects\sow-project\frontend

# Update API endpoint in frontend
# Edit src/services/api.ts or wherever API_BASE_URL is defined
$BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"

# Build production bundle
npm install
npm run build
```

#### 4.2 Create Azure Static Web App
```powershell
$STATIC_APP_NAME="sow-frontend-$(Get-Random)"

# Create Static Web App (Free tier)
az staticwebapp create `
  --name $STATIC_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Free

# Deploy built files
az staticwebapp deploy `
  --name $STATIC_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --app-location "dist"

# Get Static Web App URL
$FRONTEND_URL=$(az staticwebapp show `
  --name $STATIC_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query defaultHostname -o tsv)

Write-Host "✅ Frontend deployed! Visit: https://$FRONTEND_URL"
```

#### 4.3 Alternative: Deploy Frontend to Storage Account (Static Website)
```powershell
# Enable static website hosting
az storage blob service-properties update `
  --account-name $STORAGE_ACCOUNT `
  --static-website `
  --index-document index.html `
  --404-document index.html

# Upload built files
cd C:\projects\sow-project\frontend\dist
az storage blob upload-batch `
  --account-name $STORAGE_ACCOUNT `
  --destination '$web' `
  --source .

# Get website URL
$STORAGE_FRONTEND_URL=$(az storage account show `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query primaryEndpoints.web -o tsv)

Write-Host "Frontend URL (Storage): $STORAGE_FRONTEND_URL"
```

### Step 5: Configure CORS and Networking

#### 5.1 Update Backend CORS Settings
```powershell
# Update CORS origins to include frontend URL
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --settings CORS_ORIGINS="https://$FRONTEND_URL,https://$STORAGE_FRONTEND_URL"
```

#### 5.2 Configure Custom Domain (Optional)
```powershell
# For Static Web App
az staticwebapp hostname set `
  --name $STATIC_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --hostname "yourdomain.com"

# For App Service
az webapp config hostname add `
  --webapp-name $BACKEND_APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --hostname "api.yourdomain.com"
```

## 🔧 Configuration Files to Update

### Backend: Create `.env` for local development
```powershell
# Create .env file in sow-backend directory
@"
ENV=production
PORT=8000
DATABASE_URL=postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING
AZURE_CONTAINER_NAME=$CONTAINER_NAME
OPENAI_API_KEY=your-openai-key-here
JWT_SECRET_KEY=$(New-Guid)
CORS_ORIGINS=https://$FRONTEND_URL
CALL_LLM=true
USE_PROMPT_DATABASE=true
"@ | Out-File -FilePath C:\projects\sow-project\sow-backend\.env -Encoding UTF8
```

### Frontend: Update API Configuration
Create `frontend/src/config.js`:
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://$BACKEND_APP_NAME.azurewebsites.net';
```

Update `frontend/.env.production`:
```env
VITE_API_URL=https://sow-backend-XXXX.azurewebsites.net
```

## 📊 Monitoring and Logs

### View Backend Logs
```powershell
# Stream logs in real-time
az webapp log tail `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME

# Download logs
az webapp log download `
  --resource-group $RESOURCE_GROUP `
  --name $BACKEND_APP_NAME `
  --log-file logs.zip
```

### View Database Metrics
```powershell
# List server metrics
az postgres flexible-server show `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME
```

## 💰 Cost Optimization Tips

### Free Tier Limits (12 months)
- **App Service**: 10 web apps, 1 GB storage, 60 CPU minutes/day
- **PostgreSQL**: 750 hours/month (Burstable B1ms)
- **Storage**: 5 GB LRS + 50,000 transactions
- **Static Web Apps**: 100 GB bandwidth/month

### After Free Tier
- **App Service F1**: Free forever (limited CPU)
- **PostgreSQL B1ms**: ~$12/month
- **Storage**: ~$0.18/GB/month
- **Static Web App**: Free tier available

### Cost Reduction Strategies
1. Use **App Service F1** (free) for development
2. Scale to **B1** (~$13/month) only when needed
3. Use **Azure Functions** consumption plan for serverless backend
4. Enable **auto-shutdown** for non-production resources
5. Use **Azure DevOps** free tier for CI/CD

## 🔄 CI/CD Setup with GitHub Actions

### Backend Deployment Workflow
Create `.github/workflows/deploy-backend.yml`:
```yaml
name: Deploy Backend to Azure

on:
  push:
    branches: [main]
    paths:
      - 'sow-backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd sow-backend
          pip install -r requirements.txt
      
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v2
        with:
          app-name: ${{ secrets.AZURE_BACKEND_APP_NAME }}
          publish-profile: ${{ secrets.AZURE_BACKEND_PUBLISH_PROFILE }}
          package: ./sow-backend
```

### Frontend Deployment Workflow
Create `.github/workflows/deploy-frontend.yml`:
```yaml
name: Deploy Frontend to Azure

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd frontend
          npm install
          npm run build
      
      - name: Deploy to Azure Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "frontend"
          output_location: "dist"
```

## 🐛 Troubleshooting

### Backend Not Starting
```powershell
# Check logs
az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME

# Common issues:
# 1. Missing environment variables - check appsettings
# 2. Requirements.txt errors - verify all packages
# 3. Database connection - check firewall rules
```

### Database Connection Issues
```powershell
# Allow your IP
az postgres flexible-server firewall-rule create `
  --resource-group $RESOURCE_GROUP `
  --name $DB_SERVER_NAME `
  --rule-name AllowMyIP `
  --start-ip-address YOUR_IP `
  --end-ip-address YOUR_IP

# Test connection
psql "postgresql://$DB_ADMIN_USER`:$DB_ADMIN_PASSWORD@$DB_HOST`:5432/$DB_NAME`?sslmode=require"
```

### Frontend 404 Errors
```powershell
# For Static Web App, configure routes
# Create staticwebapp.config.json in frontend:
@"
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/api/*"]
  }
}
"@ | Out-File -FilePath C:\projects\sow-project\frontend\staticwebapp.config.json -Encoding UTF8
```

## 📝 Quick Reference

### Resource URLs
```
Backend Health: https://{BACKEND_APP_NAME}.azurewebsites.net/health
Frontend: https://{STATIC_APP_NAME}.azurestaticapps.net
Database: {DB_SERVER_NAME}.postgres.database.azure.com:5432
```

### Essential Commands
```powershell
# Restart backend
az webapp restart --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP

# View all resources
az resource list --resource-group $RESOURCE_GROUP --output table

# Delete everything (cleanup)
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## 🎯 Next Steps

1. ✅ Setup Azure CLI and login
2. ✅ Create resource group
3. ✅ Create PostgreSQL database
4. ✅ Migrate database schema
5. ✅ Deploy backend to App Service
6. ✅ Build and deploy frontend
7. ✅ Configure CORS and networking
8. ✅ Test end-to-end functionality
9. 🔄 Setup CI/CD pipelines
10. 📊 Configure monitoring alerts

## 📚 Additional Resources

- [Azure App Service Documentation](https://learn.microsoft.com/azure/app-service/)
- [Azure PostgreSQL Documentation](https://learn.microsoft.com/azure/postgresql/)
- [Azure Static Web Apps Documentation](https://learn.microsoft.com/azure/static-web-apps/)
- [Azure CLI Reference](https://learn.microsoft.com/cli/azure/)

---

**Need Help?** Check logs, review firewall rules, and ensure all environment variables are set correctly!
