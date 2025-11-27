# SOW Project - Azure Free Tier Deployment

Complete guide for deploying your Statement of Work (SOW) analysis application to Azure using your free subscription.

## 📚 Documentation Index

### Quick Start
1. **[AZURE_QUICK_REF.md](AZURE_QUICK_REF.md)** - Quick reference card with essential commands
2. **[Quick Start Script](#option-1-quick-start-automated)** - Run `quick-start-azure.ps1` for guided deployment

### Complete Guides
3. **[AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide with all details
4. **[MANUAL_AZURE_DEPLOYMENT.md](MANUAL_AZURE_DEPLOYMENT.md)** - Step-by-step manual commands
5. **[AZURE_CHECKLIST.md](AZURE_CHECKLIST.md)** - Troubleshooting guide and checklist

## 🎯 What You'll Deploy

Your application stack includes:
- **Backend**: Python FastAPI application with AI-powered SOW analysis
- **Frontend**: React + Material-UI dashboard
- **Database**: Azure PostgreSQL (Flexible Server)
- **Storage**: Azure Blob Storage for document storage
- **AI**: OpenAI GPT integration for analysis

## 💰 Cost Overview

### Free Tier (12 months)
- **Total Cost**: $0 for first 12 months within limits
- **App Service**: 10 web apps, 1 GB storage, 60 CPU minutes/day
- **PostgreSQL**: 750 hours/month (Burstable B1ms)
- **Storage**: 5 GB + 50,000 transactions/month
- **Bandwidth**: First 5 GB/month free

### After Free Tier
- **App Service B1**: ~$13/month
- **PostgreSQL B1ms**: ~$12/month
- **Storage**: ~$0.18/GB/month
- **Estimated Total**: $25-30/month

### Free Forever Options
- **App Service F1**: Free tier (limited CPU)
- **Static Web Apps**: 100 GB bandwidth/month
- **Azure Functions**: 1M executions/month

## 🚀 Deployment Options

### Option 1: Quick Start (Automated)

**Recommended for first-time deployment**

```powershell
# Clone repository (if not already done)
cd C:\projects\sow-project

# Run interactive deployment wizard
.\quick-start-azure.ps1
```

The script will:
1. Check prerequisites (Azure CLI, login status)
2. Ask for configuration (resource names, API keys)
3. Create all Azure resources
4. Deploy backend and frontend
5. Configure everything automatically

**Time**: ~20-30 minutes

### Option 2: Full Automation Script

**For advanced users who want parameter control**

```powershell
.\deploy-azure.ps1 `
  -ResourceGroup "sow-project-rg" `
  -Location "eastus" `
  -OpenAIKey "sk-your-openai-key" `
  -DBPassword "YourSecurePassword123!"
```

**Time**: ~20-30 minutes

### Option 3: Manual Step-by-Step

**For learning and full control**

Follow the detailed guide: [MANUAL_AZURE_DEPLOYMENT.md](MANUAL_AZURE_DEPLOYMENT.md)

**Time**: ~45-60 minutes

## 📋 Prerequisites

### Required
- [ ] Azure free account: https://azure.microsoft.com/free/
- [ ] Azure CLI installed: `winget install Microsoft.AzureCLI`
- [ ] OpenAI API key: https://platform.openai.com/api-keys
- [ ] Python 3.11+
- [ ] Node.js 18+

### Verify Setup
```powershell
# Check Azure CLI
az --version

# Login to Azure
az login

# Verify subscription
az account show

# Check Python
python --version

# Check Node.js
node --version
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Subscription                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐        ┌──────────────────┐      │
│  │  Static Website  │        │   App Service    │      │
│  │    (Frontend)    │───────▶│    (Backend)     │      │
│  │  React + Vite    │  API   │  Python FastAPI  │      │
│  └──────────────────┘        └──────────────────┘      │
│                                        │                 │
│                                        │                 │
│                    ┌───────────────────┼────────┐       │
│                    ▼                   ▼        ▼       │
│         ┌──────────────────┐  ┌──────────────────┐     │
│         │   PostgreSQL     │  │  Blob Storage    │     │
│         │  (Database)      │  │   (Documents)    │     │
│         └──────────────────┘  └──────────────────┘     │
│                                                          │
│                    External: OpenAI API                  │
└─────────────────────────────────────────────────────────┘
```

## 📦 What Gets Created

When you deploy, these Azure resources are created:

1. **Resource Group** (`sow-project-rg`)
   - Container for all resources

2. **PostgreSQL Flexible Server** (`sow-db-XXXX`)
   - Database: `sowdb`
   - SKU: Burstable B1ms (free tier eligible)
   - Storage: 32 GB
   - Version: PostgreSQL 14

3. **Storage Account** (`sowstorageXXXX`)
   - Container: `sow-output` (for SOW documents)
   - Static website hosting enabled
   - Frontend deployed here

4. **App Service Plan** (`sow-backend-plan`)
   - SKU: B1 (Basic)
   - OS: Linux

5. **Web App** (`sow-backend-XXXX`)
   - Runtime: Python 3.11
   - Backend API deployed here

## ✅ Post-Deployment Verification

### 1. Check Backend Health
```powershell
$BACKEND_URL = "https://YOUR-APP.azurewebsites.net"
curl "$BACKEND_URL/health"
```
**Expected**: `{"status":"healthy"}`

### 2. Check Backend API
```powershell
curl "$BACKEND_URL/api/v1/hello"
```
**Expected**: JSON response

### 3. Check Database
```powershell
curl "$BACKEND_URL/api/v1/prompts"
```
**Expected**: Array of prompts (or empty array)

### 4. Open Frontend
```powershell
Start-Process "https://YOUR-STORAGE.z13.web.core.windows.net"
```
**Expected**: Application loads, login page visible

### 5. Test Complete Flow
1. Login to application
2. Upload a SOW document
3. Run analysis
4. View results

## 🔧 Configuration

### Backend Environment Variables

Automatically set by deployment scripts:

```env
ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_CONTAINER_NAME=sow-output
OPENAI_API_KEY=<your-key>
JWT_SECRET_KEY=<auto-generated>
CORS_ORIGINS=<frontend-url>
CALL_LLM=true
USE_PROMPT_DATABASE=true
OPENAI_MODEL=gpt-4o-mini
```

### Frontend Environment Variables

Created in `.env.production`:

```env
VITE_API_URL=https://YOUR-BACKEND.azurewebsites.net
```

## 📊 Monitoring

### View Backend Logs (Real-time)
```powershell
az webapp log tail `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP
```

### Download Logs
```powershell
az webapp log download `
  --resource-group sow-project-rg `
  --name YOUR-BACKEND-APP `
  --log-file logs.zip
```

### Check Resource Status
```powershell
az resource list `
  --resource-group sow-project-rg `
  --output table
```

### Azure Portal
Visit https://portal.azure.com to:
- View all resources
- Monitor performance metrics
- Check costs
- Configure alerts

## 🔄 Updates & Maintenance

### Update Backend Code
```powershell
cd sow-backend
Compress-Archive -Path src,requirements.txt,Procfile -DestinationPath deploy.zip -Force
az webapp deployment source config-zip `
  --resource-group sow-project-rg `
  --name YOUR-APP `
  --src deploy.zip
az webapp restart --name YOUR-APP --resource-group sow-project-rg
```

### Update Frontend Code
```powershell
cd frontend
npm run build
az storage blob upload-batch `
  --account-name YOUR-STORAGE `
  --destination '$web' `
  --source dist `
  --overwrite
```

### Update Environment Variables
```powershell
az webapp config appsettings set `
  --resource-group sow-project-rg `
  --name YOUR-APP `
  --settings VAR_NAME="new-value"
```

## 🐛 Troubleshooting

### Backend Issues
```powershell
# View logs
az webapp log tail --name YOUR-APP --resource-group sow-project-rg

# Restart app
az webapp restart --name YOUR-APP --resource-group sow-project-rg

# Check environment variables
az webapp config appsettings list `
  --name YOUR-APP `
  --resource-group sow-project-rg `
  --output table
```

### Database Issues
```powershell
# Add firewall rule for your IP
az postgres flexible-server firewall-rule create `
  --resource-group sow-project-rg `
  --name YOUR-DB `
  --rule-name AllowMyIP `
  --start-ip YOUR_IP `
  --end-ip YOUR_IP
```

### CORS Issues
```powershell
# Allow all origins (testing)
az webapp config appsettings set `
  --name YOUR-APP `
  --resource-group sow-project-rg `
  --settings CORS_ORIGINS="*"
```

For complete troubleshooting guide: [AZURE_CHECKLIST.md](AZURE_CHECKLIST.md)

## 🎓 Learning Resources

### Azure Documentation
- [App Service](https://learn.microsoft.com/azure/app-service/)
- [PostgreSQL](https://learn.microsoft.com/azure/postgresql/)
- [Storage](https://learn.microsoft.com/azure/storage/)
- [CLI Reference](https://learn.microsoft.com/cli/azure/)

### Video Tutorials
- Azure Free Account Setup
- Deploying Python Apps
- PostgreSQL on Azure

## 💾 Backup & Recovery

### Database Backup
```powershell
# Automated backups enabled by default (7-day retention)

# Manual backup
pg_dump "postgresql://user@host:5432/db?sslmode=require" > backup.sql
```

### Database Restore
```powershell
psql "postgresql://user@host:5432/db?sslmode=require" < backup.sql
```

## 🔐 Security Best Practices

1. **Use Strong Passwords**: Minimum 12 characters with complexity
2. **Restrict CORS**: Set specific origins instead of `*`
3. **Use Azure Key Vault**: Store secrets securely (optional)
4. **Enable SSL**: Already configured for PostgreSQL
5. **Restrict Database Access**: Add specific IP firewall rules
6. **Regular Updates**: Keep dependencies updated
7. **Monitor Logs**: Check for suspicious activity

## 🗑️ Cleanup

### Stop Services (Keep Resources)
```powershell
az webapp stop --name YOUR-APP --resource-group sow-project-rg
az postgres flexible-server stop --name YOUR-DB --resource-group sow-project-rg
```

### Delete Everything
```powershell
az group delete --name sow-project-rg --yes --no-wait
```

**Warning**: This permanently deletes all resources and data!

## 📞 Getting Help

### Issues with Deployment Scripts
1. Check [AZURE_CHECKLIST.md](AZURE_CHECKLIST.md) for common issues
2. View backend logs: `az webapp log tail --name YOUR-APP --resource-group sow-project-rg`
3. Verify all prerequisites are installed
4. Check Azure free tier quota limits

### Azure Support
- Free tier support: https://azure.microsoft.com/support/community/
- Stack Overflow: Tag with `azure`
- Azure Status: https://status.azure.com/

### Application Issues
- Check GitHub repository issues
- Review application logs
- Test locally first

## 🎉 Next Steps After Deployment

1. **Create Admin User**
   - Navigate to frontend URL
   - Register first user (becomes admin)

2. **Configure Prompts**
   - Setup SOW analysis prompts in database
   - Customize compliance rules

3. **Upload Test SOWs**
   - Test with sample documents
   - Verify analysis results

4. **Setup CI/CD** (Optional)
   - GitHub Actions for automated deployments
   - See [AZURE_DEPLOYMENT_GUIDE.md](AZURE_DEPLOYMENT_GUIDE.md) for workflows

5. **Monitor Usage**
   - Check Azure Portal for metrics
   - Monitor OpenAI API usage
   - Set up cost alerts

6. **Custom Domain** (Optional)
   - Purchase domain
   - Configure DNS
   - Add to Azure resources

## 📈 Scaling

### Vertical Scaling (More Power)
```powershell
# Scale to B2 (more CPU/RAM)
az appservice plan update `
  --name sow-backend-plan `
  --resource-group sow-project-rg `
  --sku B2
```

### Horizontal Scaling (More Instances)
```powershell
# Scale out to 2 instances
az appservice plan update `
  --name sow-backend-plan `
  --resource-group sow-project-rg `
  --number-of-workers 2
```

## 📝 Summary

Your SOW project will be deployed to Azure with:
- ✅ Fully managed PostgreSQL database
- ✅ Scalable Python backend on App Service
- ✅ React frontend on Azure Storage
- ✅ Secure blob storage for documents
- ✅ OpenAI integration for AI analysis
- ✅ Automatic HTTPS/SSL
- ✅ Built-in backups and monitoring

**Total Setup Time**: 20-60 minutes depending on method chosen

**Free Tier Duration**: 12 months with usage limits

**After Free Tier**: ~$25-30/month for continued usage

---

**Ready to Deploy?** Start with [quick-start-azure.ps1](quick-start-azure.ps1) for the easiest experience!

```powershell
cd C:\projects\sow-project
.\quick-start-azure.ps1
```

For questions or issues, refer to [AZURE_CHECKLIST.md](AZURE_CHECKLIST.md) for troubleshooting.
