# 🚀 Azure Deployment - Quick Reference Card

## One-Command Deployment

```powershell
cd C:\projects\sow-project
.\quick-start-azure.ps1
```

## Essential URLs

| Resource | URL Pattern |
|----------|-------------|
| Backend API | `https://YOUR-APP.azurewebsites.net` |
| Backend Health | `https://YOUR-APP.azurewebsites.net/health` |
| Frontend | `https://YOUR-STORAGE.z13.web.core.windows.net` |
| Azure Portal | `https://portal.azure.com` |
| Database | `YOUR-SERVER.postgres.database.azure.com:5432` |

## Most Used Commands

### View Resources
```powershell
az resource list --resource-group sow-project-rg --output table
```

### View Logs
```powershell
az webapp log tail --name YOUR-APP --resource-group sow-project-rg
```

### Restart Backend
```powershell
az webapp restart --name YOUR-APP --resource-group sow-project-rg
```

### Update Environment Variable
```powershell
az webapp config appsettings set `
  --name YOUR-APP `
  --resource-group sow-project-rg `
  --settings VAR_NAME="value"
```

### Test Backend
```powershell
curl https://YOUR-APP.azurewebsites.net/health
```

### Redeploy Backend
```powershell
cd sow-backend
Compress-Archive src,requirements.txt,Procfile -DestinationPath deploy.zip -Force
az webapp deployment source config-zip --resource-group sow-project-rg --name YOUR-APP --src deploy.zip
```

### Redeploy Frontend
```powershell
cd frontend
npm run build
az storage blob upload-batch --account-name YOUR-STORAGE --destination '$web' --source dist --overwrite
```

## Troubleshooting Quick Fixes

### Backend Not Responding
```powershell
# Check status
az webapp show --name YOUR-APP --resource-group sow-project-rg --query state

# Restart
az webapp restart --name YOUR-APP --resource-group sow-project-rg

# View logs
az webapp log tail --name YOUR-APP --resource-group sow-project-rg
```

### Database Connection Issues
```powershell
# Allow all IPs (testing only)
az postgres flexible-server firewall-rule create `
  --resource-group sow-project-rg `
  --name YOUR-DB `
  --rule-name AllowAll `
  --start-ip 0.0.0.0 `
  --end-ip 255.255.255.255
```

### CORS Errors
```powershell
az webapp config appsettings set `
  --name YOUR-APP `
  --resource-group sow-project-rg `
  --settings CORS_ORIGINS="*"
```

## Free Tier Limits

| Service | Free Tier | After Free |
|---------|-----------|------------|
| App Service | 10 apps, 1 GB, 60 min/day | $13/month (B1) |
| PostgreSQL | 750 hours/month | $12/month (B1ms) |
| Storage | 5 GB + 50k transactions | $0.18/GB/month |
| Bandwidth | 5 GB/month | Minimal cost |

## Important Files

- `AZURE_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `MANUAL_AZURE_DEPLOYMENT.md` - Step-by-step manual commands
- `AZURE_CHECKLIST.md` - Troubleshooting and checklist
- `deploy-azure.ps1` - Automated deployment script
- `quick-start-azure.ps1` - Interactive deployment wizard
- `azure-deployment-config.txt` - Your deployment info (created after deployment)

## Emergency Commands

### Stop Everything (Save Costs)
```powershell
az webapp stop --name YOUR-APP --resource-group sow-project-rg
az postgres flexible-server stop --name YOUR-DB --resource-group sow-project-rg
```

### Start Everything
```powershell
az webapp start --name YOUR-APP --resource-group sow-project-rg
az postgres flexible-server start --name YOUR-DB --resource-group sow-project-rg
```

### Delete Everything
```powershell
az group delete --name sow-project-rg --yes --no-wait
```

## Health Check Checklist

- [ ] `curl https://YOUR-APP.azurewebsites.net/health` returns `{"status":"healthy"}`
- [ ] Frontend loads without errors
- [ ] Login works
- [ ] Can process SOW documents
- [ ] No CORS errors in browser console

## Support Resources

- Azure Portal: https://portal.azure.com
- Azure Docs: https://learn.microsoft.com/azure/
- Azure CLI Docs: https://learn.microsoft.com/cli/azure/
- OpenAI Platform: https://platform.openai.com

## Your Deployment Info

After deployment, find your specific URLs in:
```powershell
Get-Content C:\projects\sow-project\azure-deployment-config.txt
```

---

**Pro Tip**: Bookmark this page and keep your `azure-deployment-config.txt` file safe!
