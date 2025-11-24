# Deployment Guide - SOW Prompt Manager

## Quick Deploy to Vercel (Free)

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Backend API running and accessible

### Step 1: Push to GitHub

```bash
cd frontend-staffapp
git init
git add .
git commit -m "Initial commit: SOW Prompt Manager"
git remote add origin https://github.com/YOUR_USERNAME/sow-prompt-manager.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-backend-url.com/api/v1`
   
6. Click "Deploy"

Your app will be live at `https://your-project.vercel.app` in ~2 minutes!

### Step 3: Update Backend CORS

Add your Vercel URL to the backend CORS allowed origins:

```python
# In sow-backend/src/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://your-project.vercel.app",  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 4: Test

Visit your Vercel URL and test:
- ✅ List prompts
- ✅ Create new prompt
- ✅ View prompt details
- ✅ Edit variables
- ✅ Bulk upload

## Alternative: Deploy to Netlify

### Using Netlify CLI

```bash
npm install -g netlify-cli
cd frontend-staffapp
npm run build
netlify deploy --prod
```

Follow prompts to:
1. Authorize with GitHub
2. Select `dist` as publish directory
3. Set environment variable `VITE_API_BASE_URL`

### Using Netlify UI

1. Go to https://app.netlify.com
2. Drag and drop the `dist` folder
3. Go to Site Settings → Environment Variables
4. Add `VITE_API_BASE_URL`

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

### Netlify
1. Go to Domain Settings
2. Add custom domain
3. Configure DNS
4. SSL auto-enabled

## Environment Variables Reference

### Development (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Production (Vercel/Netlify)
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1
```

## Troubleshooting

### CORS Errors
- Ensure backend allows your frontend domain in CORS
- Check browser console for exact error
- Verify `VITE_API_BASE_URL` is correct

### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Connection Issues
- Check backend is running and accessible
- Verify environment variable is set correctly
- Test API directly with curl/Postman

## Cost: $0/month

Both Vercel and Netlify free tiers include:
- Unlimited deployments
- Custom domains
- SSL certificates
- CDN
- Auto-scaling
- Git integration

Perfect for small teams and product owners managing prompts!
