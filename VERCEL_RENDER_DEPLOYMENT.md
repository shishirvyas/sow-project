# Vercel + Render Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Changes Required

#### ✅ Remove ALL Hardcoded URLs
- [x] Fixed: `AuthContext.jsx` - Changed hardcoded `http://localhost:8000` to use `apiFetch` helper
- [ ] Search for any other hardcoded localhost URLs:
  ```bash
  cd frontend
  grep -r "localhost:8000" src/
  grep -r "127.0.0.1" src/
  ```

#### ✅ Use Environment Variables Everywhere
- [x] `api.js` uses `import.meta.env.VITE_API_URL`
- [x] Fallback to production URL when env var not set
- [ ] Verify all API calls use `apiFetch` helper (not direct `fetch`)

---

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd C:\projects\sow-project

# Add all changes
git add .

# Commit with descriptive message
git commit -m "fix: Use apiFetch for login to support production URLs"

# Push to your branch
git push origin feature-shishir-24Nov
```

### Step 2: Deploy Backend to Render

#### A. First Time Setup (Skip if already deployed)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +" → "Web Service"**
3. **Connect GitHub repository**: `shishirvyas/sow-project`
4. **Configure Service**:
   - Name: `sow-project-backend`
   - Region: `Oregon (US West)` or closest to you
   - Branch: `feature-shishir-24Nov` or `main`
   - Root Directory: `sow-backend`
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn src.app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:10000 --timeout 120`

#### B. Configure Environment Variables

Go to **Environment** tab and add these variables:

```env
# Backend URL will be auto-assigned by Render
# Example: https://sow-project-backend.onrender.com

ENV=production
PORT=10000

# Database - Your PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string-here
AZURE_CONTAINER_NAME=sow-output

# OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
CALL_LLM=true

# CORS - ADD YOUR VERCEL URL HERE (update after Step 3)
CORS_ORIGINS=https://your-app.vercel.app
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=*
CORS_ALLOW_HEADERS=*

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-this-to-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

#### C. Deploy Backend

1. Click **"Create Web Service"** (first time) or **"Manual Deploy"** (updates)
2. Wait 5-10 minutes for deployment
3. **Copy your Render URL**: e.g., `https://sow-project-backend.onrender.com`
4. **Test health endpoint**:
   ```bash
   curl https://sow-project-backend.onrender.com/health
   # Should return: {"status":"ok","env":"production"}
   ```

---

### Step 3: Deploy Frontend to Vercel

#### A. First Time Setup (Skip if already deployed)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "Add New" → "Project"**
3. **Import Git Repository**: Select `shishirvyas/sow-project`
4. **Configure Project**:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

#### B. Configure Environment Variables

Go to **Settings → Environment Variables** and add:

```env
# Backend URL from Render (Step 2C)
VITE_API_URL=https://sow-project-backend.onrender.com
```

**Important**: Set for **Production** environment only (or all environments if needed)

#### C. Deploy Frontend

1. Click **"Deploy"** (first time) or go to **Deployments → Redeploy** (updates)
2. Wait 2-3 minutes for build and deployment
3. **Copy your Vercel URL**: e.g., `https://sow-project-ten.vercel.app`

---

### Step 4: Update CORS in Render Backend

**CRITICAL**: Update backend CORS to allow your Vercel URL

1. **Go back to Render Dashboard**
2. **Select your backend service**
3. **Environment tab**
4. **Update `CORS_ORIGINS`**:
   ```
   CORS_ORIGINS=https://sow-project-ten.vercel.app,https://sow-project-ten-git-main.vercel.app
   ```
   
   **Note**: Include all Vercel deployment URLs:
   - Main production URL
   - Git branch preview URLs
   - Any custom domains

5. **Save** (Render will auto-redeploy)
6. **Wait 2-3 minutes** for redeploy

---

## 🧪 Testing

### Step 1: Clear Browser Cache

```
Chrome: Ctrl+Shift+Delete
- Check "Cached images and files"
- Time range: "All time"
- Click "Clear data"
```

### Step 2: Open DevTools

```
1. Go to your Vercel app: https://sow-project-ten.vercel.app
2. Press F12 (open DevTools)
3. Go to Network tab
4. Check "Disable cache"
```

### Step 3: Test Login

```
1. Navigate to login page
2. Enter credentials
3. Click Login
4. Watch Network tab
```

**Expected Network Activity**:

```
Request 1: OPTIONS /api/v1/auth/login
  Status: 200 OK
  Response Headers:
    access-control-allow-origin: https://sow-project-ten.vercel.app
    access-control-allow-methods: *
    access-control-allow-credentials: true

Request 2: POST /api/v1/auth/login
  Status: 200 OK
  Request URL: https://sow-project-backend.onrender.com/api/v1/auth/login
  Response Headers:
    access-control-allow-origin: https://sow-project-ten.vercel.app
  Response Body:
    {
      "access_token": "...",
      "refresh_token": "...",
      "user": {...}
    }
```

### Step 4: Check Console Logs

**Good Logs (No Errors)**:
```
🔐 Login attempt for: user@example.com
🌐 API Call: POST https://sow-project-backend.onrender.com/api/v1/auth/login
✅ API Response: POST ...
✅ Login successful
💾 Tokens stored in localStorage
```

**Bad Logs (CORS Error)**:
```
❌ Access to XMLHttpRequest blocked by CORS policy
   Request URL: http://localhost:8000/api/v1/auth/login
```

If you see localhost:8000, the frontend is still using old cached build!

---

## 🐛 Troubleshooting

### Problem 1: Still Seeing localhost:8000

**Cause**: Vercel is serving old cached build

**Solution**:
```bash
# Option A: Force rebuild on Vercel
1. Vercel Dashboard → Deployments
2. Click ⋮ on latest deployment
3. Click "Redeploy"
4. Check "Use existing Build Cache" = OFF

# Option B: Clear Vercel cache via CLI
npm install -g vercel
vercel login
cd C:\projects\sow-project\frontend
vercel --prod --force
```

### Problem 2: CORS Error "No Access-Control-Allow-Origin header"

**Cause**: Backend CORS_ORIGINS doesn't include Vercel URL

**Solution**:
```
1. Render Dashboard → Your Service → Environment
2. Check CORS_ORIGINS value
3. Add your Vercel URL: https://your-app.vercel.app
4. Save (auto-redeploys)
5. Wait 3 minutes
6. Hard refresh browser: Ctrl+Shift+R
```

### Problem 3: 400 Bad Request on OPTIONS

**Cause**: Backend startup issue or wrong CORS configuration

**Solution**:
```bash
# Check Render logs
1. Render Dashboard → Your Service → Logs
2. Look for errors:
   - "Configuring CORS with origins: [...]" (should show your Vercel URL)
   - Any Python errors
   - "Application startup complete"

# Test backend directly
curl -I https://your-backend.onrender.com/health
# Should return HTTP/2 200

# Test CORS
curl -I -X OPTIONS https://your-backend.onrender.com/api/v1/auth/login \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Should return 200 with access-control-* headers
```

### Problem 4: Environment Variable Not Loading

**Cause**: Vercel build doesn't have `VITE_API_URL`

**Check**:
```
1. Vercel Dashboard → Settings → Environment Variables
2. Verify VITE_API_URL is set
3. Check "Production" environment is selected
4. Redeploy after adding variable
```

**Note**: Vite only includes `VITE_*` prefixed variables in build!

### Problem 5: Works Locally, Fails on Vercel

**Cause**: Different environment variables or cached build

**Solution**:
```bash
# Test production build locally
cd C:\projects\sow-project\frontend

# Set production env
echo "VITE_API_URL=https://your-backend.onrender.com" > .env.production

# Build
npm run build

# Preview production build
npm run preview

# Test in browser at http://localhost:4173
```

---

## 📋 Quick Reference

### Your URLs (Update These!)

```
Frontend (Vercel):  https://sow-project-ten.vercel.app
Backend (Render):   https://sow-project-backend.onrender.com
Database:           [Your PostgreSQL host]
```

### Essential Commands

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Test CORS
curl -I -X OPTIONS https://your-backend.onrender.com/api/v1/auth/login \
  -H "Origin: https://your-frontend.vercel.app"

# Redeploy Vercel (force)
vercel --prod --force

# View Render logs
# (Use dashboard - no CLI command)

# Clear Vercel cache
# Settings → General → Clear Cache
```

### Environment Variables Summary

**Render (Backend)**:
```env
CORS_ORIGINS=https://your-frontend.vercel.app
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=random-secret-key
```

**Vercel (Frontend)**:
```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Backend health endpoint returns 200 OK
- [ ] Frontend loads without console errors
- [ ] Login request goes to Render backend (not localhost)
- [ ] Login succeeds and returns JWT token
- [ ] Dashboard loads with user data
- [ ] No CORS errors in browser console
- [ ] API calls to backend succeed
- [ ] File uploads work
- [ ] All features functional

---

## 🎯 Common Gotchas

1. **Always use `apiFetch` helper** - Never use direct `fetch()` for API calls
2. **Prefix env vars with `VITE_`** - Vite only exposes variables starting with `VITE_`
3. **Redeploy after env changes** - Both Render and Vercel need redeployment
4. **Include all Vercel URLs in CORS** - Production + preview URLs
5. **Clear browser cache** - Old cached requests can cause confusion
6. **Wait for deployments** - Render: 5-10 min, Vercel: 2-3 min
7. **Check both dashboards** - Errors can occur on either side

---

## 📞 Still Having Issues?

1. **Check Render logs**: Dashboard → Service → Logs
2. **Check Vercel logs**: Dashboard → Deployments → View Details
3. **Check browser console**: F12 → Console + Network tabs
4. **Verify all URLs**: Make sure they match everywhere
5. **Test backend directly**: Use curl to test CORS
6. **Force redeploy both**: Clear all caches and redeploy

**Most common issue**: Cached build with old localhost URL!  
**Solution**: Force rebuild without cache on Vercel

---

**Time to Deploy**: 15-20 minutes  
**Difficulty**: Medium  
**Support**: Check Render/Vercel docs or dashboards for errors
