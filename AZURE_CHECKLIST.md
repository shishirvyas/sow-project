# Azure Deployment Checklist & Troubleshooting

## Pre-Deployment Checklist

### Account Setup
- [ ] Azure free account created and verified
- [ ] $200 credit available (check Azure Portal)
- [ ] Subscription is active
- [ ] Payment method added (for identity verification, won't be charged)

### Local Environment
- [ ] Azure CLI installed: `az --version`
- [ ] Azure CLI logged in: `az account show`
- [ ] Python 3.11+ installed: `python --version`
- [ ] Node.js 18+ installed: `node --version`
- [ ] Git installed and repository cloned

### API Keys & Credentials
- [ ] OpenAI API key obtained from https://platform.openai.com
- [ ] OpenAI API key has available credits
- [ ] Strong password chosen for PostgreSQL (min 8 chars, uppercase, lowercase, number, special char)

### Code Preparation
- [ ] Backend code is in `sow-backend/` directory
- [ ] Frontend code is in `frontend/` directory
- [ ] Database schema file exists at `sow-backend/src/app/db/schema.sql`
- [ ] All recent changes are committed to Git

## Deployment Options

Choose your deployment method:

### Option 1: Automated Script (Recommended for Quick Start)
```powershell
cd C:\projects\sow-project
.\quick-start-azure.ps1
```
**Pros**: Fast, automated, handles errors  
**Cons**: Less control, harder to debug

### Option 2: Full Deployment Script
```powershell
cd C:\projects\sow-project
.\deploy-azure.ps1 `
  -ResourceGroup "sow-project-rg" `
  -Location "eastus" `
  -OpenAIKey "sk-..." `
  -DBPassword "YourSecurePassword123!"
```
**Pros**: Automated with parameters  
**Cons**: All-or-nothing approach

### Option 3: Manual Step-by-Step
Follow `MANUAL_AZURE_DEPLOYMENT.md`

**Pros**: Full control, understand each step  
**Cons**: Time-consuming, more room for errors

## Post-Deployment Verification

### 1. Backend Health Check
```powershell
$BACKEND_URL = "https://YOUR-BACKEND-APP.azurewebsites.net"
curl "$BACKEND_URL/health"
```
**Expected**: `{"status":"healthy"}`

### 2. Backend API Check
```powershell
curl "$BACKEND_URL/api/v1/hello"
```
**Expected**: JSON response with message

### 3. Database Connection Check
```powershell
curl "$BACKEND_URL/api/v1/prompts"
```
**Expected**: List of prompts or empty array

### 4. Frontend Check
```powershell
Start-Process "https://YOUR-STORAGE-ACCOUNT.z13.web.core.windows.net"
```
**Expected**: React app loads, login page visible

### 5. End-to-End Test
- [ ] Frontend loads without errors
- [ ] Can navigate between pages
- [ ] Login functionality works
- [ ] API calls succeed (check browser console)

## Common Issues & Solutions

### Issue 1: "az: command not found"

**Cause**: Azure CLI not installed or not in PATH

**Solution**:
```powershell
# Install Azure CLI
winget install Microsoft.AzureCLI

# Close and reopen PowerShell
# Verify installation
az --version
```

### Issue 2: Backend Returns 500 Error

**Cause**: Python exception, missing dependencies, or configuration error

**Solution**:
```powershell
# View backend logs
az webapp log tail `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP-NAME

# Check for errors in:
# - Missing environment variables
# - Database connection issues
# - Import errors
```

**Common fixes**:
```powershell
# Restart the app
az webapp restart --name YOUR-BACKEND-APP --resource-group sow-project-rg

# Verify all environment variables are set
az webapp config appsettings list `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --output table
```

### Issue 3: Database Connection Failed

**Symptoms**: 
- Backend logs show "connection refused"
- Backend logs show "SSL required"

**Solution**:
```powershell
# Check firewall rules
az postgres flexible-server firewall-rule list `
  --resource-group sow-project-rg `
  --name YOUR-DB-SERVER `
  --output table

# Add your IP to firewall
$MY_IP = (Invoke-WebRequest -Uri "https://api.ipify.org").Content
az postgres flexible-server firewall-rule create `
  --resource-group sow-project-rg `
  --name YOUR-DB-SERVER `
  --rule-name AllowMyIP `
  --start-ip-address $MY_IP `
  --end-ip-address $MY_IP

# Verify connection string format
# Should be: postgresql://user:password@host:5432/dbname?sslmode=require
```

### Issue 4: CORS Errors in Frontend

**Symptoms**: Browser console shows "CORS policy" errors

**Solution**:
```powershell
# Update CORS settings in backend
az webapp config appsettings set `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP `
  --settings CORS_ORIGINS="*"

# Restart backend
az webapp restart --name YOUR-BACKEND-APP --resource-group sow-project-rg
```

**Better solution (for production)**:
```powershell
# Only allow specific origins
az webapp config appsettings set `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP `
  --settings CORS_ORIGINS="https://your-frontend.z13.web.core.windows.net"
```

### Issue 5: Frontend Shows Blank Page

**Symptoms**: White/blank screen, no content

**Solution**:
```powershell
# Check browser console for errors
# Usually caused by:
# 1. Incorrect API URL in frontend
# 2. Build errors

# Rebuild frontend with correct API URL
cd C:\projects\sow-project\frontend

# Create .env.production
@"
VITE_API_URL=https://YOUR-BACKEND-APP.azurewebsites.net
"@ | Out-File .env.production -Encoding UTF8

# Rebuild
npm run build

# Redeploy to storage
az storage blob upload-batch `
  --account-name YOUR-STORAGE-ACCOUNT `
  --destination '$web' `
  --source dist `
  --connection-string "YOUR-CONNECTION-STRING" `
  --overwrite
```

### Issue 6: "Resource Group Not Found"

**Cause**: Resource group doesn't exist or wrong name

**Solution**:
```powershell
# List all resource groups
az group list --output table

# Create if missing
az group create --name sow-project-rg --location eastus
```

### Issue 7: Deployment Takes Too Long

**Normal durations**:
- PostgreSQL server creation: 5-10 minutes
- Backend deployment: 5-10 minutes (installing Python packages)
- Frontend build: 2-5 minutes

**If stuck**:
```powershell
# Check operation status
az group deployment list `
  --resource-group sow-project-rg `
  --output table

# Cancel and retry if needed
# Press Ctrl+C to cancel current operation
```

### Issue 8: "Insufficient Quota" Error

**Cause**: Free tier limits exceeded

**Solution**:
```powershell
# Check current usage
az vm list-usage --location eastus --output table

# Options:
# 1. Delete unused resources
# 2. Choose different region
# 3. Use smaller SKU (e.g., F1 instead of B1)
```

### Issue 9: OpenAI API Errors

**Symptoms**: SOW processing fails with API errors

**Solution**:
```powershell
# Verify OpenAI key is set
az webapp config appsettings list `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --query "[?name=='OPENAI_API_KEY']"

# Update OpenAI key
az webapp config appsettings set `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --settings OPENAI_API_KEY="sk-YOUR-NEW-KEY"

# Check OpenAI account has credits
# Visit https://platform.openai.com/account/usage
```

### Issue 10: Storage Account Name Conflict

**Symptoms**: "Storage account name already taken"

**Solution**:
```powershell
# Storage account names must be globally unique
# Use random suffix
$STORAGE_ACCOUNT = "sowstorage$(Get-Random -Maximum 9999)"

# Or use your initials + date
$STORAGE_ACCOUNT = "sowjd$(Get-Date -Format 'MMdd')"

# Create with unique name
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group sow-project-rg `
  --location eastus `
  --sku Standard_LRS
```

## Monitoring & Maintenance

### View Real-Time Logs
```powershell
# Backend logs (continuous)
az webapp log tail --name YOUR-BACKEND-APP --resource-group sow-project-rg

# Download log archive
az webapp log download `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --log-file backend-logs.zip
```

### Check Application Insights (if configured)
```powershell
# View metrics in Azure Portal
Start-Process "https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2Fsites"
```

### Update Environment Variables
```powershell
# Single variable
az webapp config appsettings set `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --settings NEW_VAR="new-value"

# Multiple variables
az webapp config appsettings set `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --settings VAR1="value1" VAR2="value2" VAR3="value3"
```

### Scale Up/Down
```powershell
# Scale to B2 (more CPU/RAM)
az appservice plan update `
  --name sow-backend-plan `
  --resource-group sow-project-rg `
  --sku B2

# Scale back to B1
az appservice plan update `
  --name sow-backend-plan `
  --resource-group sow-project-rg `
  --sku B1

# Scale to free tier (limited)
az appservice plan update `
  --name sow-backend-plan `
  --resource-group sow-project-rg `
  --sku F1
```

### Database Backup
```powershell
# Automated backups are enabled by default (7-day retention)

# Manual backup (using pg_dump)
$DB_SERVER = "YOUR-DB-SERVER.postgres.database.azure.com"
$DB_NAME = "sowdb"
$DB_USER = "sowadmin"
$BACKUP_FILE = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

pg_dump "postgresql://${DB_USER}@${DB_SERVER}:5432/${DB_NAME}?sslmode=require" `
  > $BACKUP_FILE

Write-Host "Backup saved to: $BACKUP_FILE"
```

### Restore Database
```powershell
# Restore from backup file
psql "postgresql://${DB_USER}@${DB_SERVER}:5432/${DB_NAME}?sslmode=require" `
  < backup-20250101-120000.sql
```

## Cost Monitoring

### Check Current Spending
```powershell
# View consumption (may take 24-48 hours to appear)
az consumption usage list --output table

# Check remaining free credit
# Visit: https://portal.azure.com/#view/Microsoft_Azure_Billing/SubscriptionsBlade
```

### Set Budget Alert
```powershell
# Create budget (in Azure Portal or via CLI)
# Portal: Cost Management + Billing > Budgets > Add

# Get cost by resource group
az consumption usage list `
  --start-date 2025-01-01 `
  --end-date 2025-01-31 `
  --output table
```

### Stop Services to Save Costs
```powershell
# Stop web app (keeps resources but stops billing)
az webapp stop --name YOUR-BACKEND-APP --resource-group sow-project-rg

# Start again when needed
az webapp start --name YOUR-BACKEND-APP --resource-group sow-project-rg

# Stop database (Flexible Server)
az postgres flexible-server stop `
  --name YOUR-DB-SERVER `
  --resource-group sow-project-rg

# Start database
az postgres flexible-server start `
  --name YOUR-DB-SERVER `
  --resource-group sow-project-rg
```

## Updating Your Application

### Update Backend Code
```powershell
cd C:\projects\sow-project\sow-backend

# Create new deployment package
Compress-Archive -Path src,requirements.txt,Procfile `
  -DestinationPath deploy.zip -Force

# Deploy
az webapp deployment source config-zip `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP `
  --src deploy.zip

# Restart
az webapp restart --name YOUR-BACKEND-APP --resource-group sow-project-rg
```

### Update Frontend Code
```powershell
cd C:\projects\sow-project\frontend

# Rebuild
npm run build

# Redeploy
az storage blob upload-batch `
  --account-name YOUR-STORAGE-ACCOUNT `
  --destination '$web' `
  --source dist `
  --connection-string "YOUR-CONNECTION-STRING" `
  --overwrite
```

## Complete Cleanup

### Delete All Resources
```powershell
# Delete entire resource group (removes everything)
az group delete `
  --name sow-project-rg `
  --yes `
  --no-wait

# Verify deletion (wait a few minutes)
az group exists --name sow-project-rg
# Should return: false
```

### Delete Individual Resources
```powershell
# Delete web app only
az webapp delete --name YOUR-BACKEND-APP --resource-group sow-project-rg

# Delete database only
az postgres flexible-server delete `
  --name YOUR-DB-SERVER `
  --resource-group sow-project-rg `
  --yes

# Delete storage account only
az storage account delete `
  --name YOUR-STORAGE-ACCOUNT `
  --resource-group sow-project-rg `
  --yes
```

## Getting Help

### Azure Support Resources
- Free tier support: https://azure.microsoft.com/support/community/
- Azure documentation: https://learn.microsoft.com/azure/
- Stack Overflow: Tag questions with `azure` and specific service

### View Your Deployment Info
```powershell
# Get all resource names
az resource list --resource-group sow-project-rg --output table

# Get backend URL
az webapp show `
  --name YOUR-BACKEND-APP `
  --resource-group sow-project-rg `
  --query defaultHostName `
  --output tsv

# Get storage website URL
az storage account show `
  --name YOUR-STORAGE-ACCOUNT `
  --resource-group sow-project-rg `
  --query primaryEndpoints.web `
  --output tsv
```

## Success Indicators

Your deployment is successful when:
- ✅ Backend health endpoint returns `{"status":"healthy"}`
- ✅ Frontend loads without JavaScript errors
- ✅ Can login to the application
- ✅ Can upload and process SOW documents
- ✅ Database queries work (check prompts page)
- ✅ File uploads work (Azure Blob Storage)

## Quick Reference Commands

```powershell
# Login
az login

# List resources
az resource list --resource-group sow-project-rg --output table

# View logs
az webapp log tail --name YOUR-APP --resource-group sow-project-rg

# Restart app
az webapp restart --name YOUR-APP --resource-group sow-project-rg

# Update setting
az webapp config appsettings set --name YOUR-APP --resource-group sow-project-rg --settings KEY="value"

# Delete everything
az group delete --name sow-project-rg --yes
```

---

**Remember**: Free tier is perfect for development and testing. Monitor your usage to avoid unexpected charges!
