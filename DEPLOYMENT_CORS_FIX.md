# CORS Configuration Fix for Vercel + Render Deployment

## Problem
After deploying to Vercel (frontend) and Render (backend), you're seeing CORS errors:
```
A cross-origin resource sharing (CORS) request was blocked because of invalid or missing response headers
Access-Control-Allow-Origin: Missing Header
```

## Root Cause
Two issues cause this problem:
1. **Frontend has hardcoded `localhost:8000` URL** in `AuthContext.jsx` instead of using the `apiFetch` helper
2. **Backend CORS** is not configured with the correct origins to allow requests from your frontend (Vercel)

## Solution

### Step 0: Fix Hardcoded URLs in Frontend (CRITICAL!)

**This issue causes Vercel to connect to `localhost:8000` instead of your Render backend.**

The file `frontend/src/contexts/AuthContext.jsx` had a hardcoded localhost URL that has now been fixed. Before deploying:

1. **Verify the fix is in your code**:
   ```bash
   cd C:\projects\sow-project\frontend\src\contexts
   # Check that AuthContext.jsx uses apiFetch helper, not hardcoded URL
   ```

2. **Commit and push the fix**:
   ```bash
   git add .
   git commit -m "fix: Use apiFetch helper for login instead of hardcoded localhost"
   git push origin feature-shishir-24Nov
   ```

3. **Force rebuild on Vercel** (important!):
   - Go to Vercel Dashboard
   - Deployments tab
   - Click ⋮ → **Redeploy**
   - **Uncheck "Use existing Build Cache"**
   - Click **Redeploy**

---

### Step 1: Get Your Deployment URLs

#### Frontend URL (Vercel)
1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your project
3. Copy the deployment URL (e.g., `https://sow-project-ten.vercel.app/login`)

#### Backend URL (Render)
1. Go to your Render dashboard: https://dashboard.render.com/
2. Find your web service
3. Copy the service URL (e.g., `https://sow-backend-abc123.onrender.com`)

---

### Step 2: Configure Backend CORS on Render

1. **Go to Render Dashboard**
   - Navigate to your backend web service
   - Click on **Environment** tab

2. **Add/Update CORS_ORIGINS Variable**
   - Click **Add Environment Variable**
   - Key: `CORS_ORIGINS`
   - Value: `https://your-frontend.vercel.app,https://your-custom-domain.com`
   
   **Example**:
   ```
   CORS_ORIGINS=https://sow-project.vercel.app,https://sow-project-git-main.vercel.app,https://your-domain.com
   ```

3. **Verify Other Environment Variables**
   Ensure these are set:
   ```
   ENV=production
   CORS_ALLOW_CREDENTIALS=true
   CORS_ALLOW_METHODS=*
   CORS_ALLOW_HEADERS=*
   ```

4. **Save and Redeploy**
   - Click **Save Changes**
   - Render will automatically redeploy your service

---

### Step 3: Configure Frontend API URL on Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your frontend project
   - Click on **Settings** → **Environment Variables**

2. **Add VITE_API_URL Variable**
   - Click **Add New**
   - Key: `VITE_API_URL`
   - Value: `https://your-backend.onrender.com`
   - Environment: **Production**
   
   **Example**:
   ```
   VITE_API_URL=https://sow-backend-abc123.onrender.com
   ```

3. **Redeploy Frontend**
   - Go to **Deployments** tab
   - Click ⋮ on latest deployment → **Redeploy**

---

### Step 4: Verify CORS Configuration

#### Test Backend CORS Headers
```bash
curl -I -X OPTIONS https://sow-project-backend.onrender.com/api/v1/auth/login \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

**Expected Response**:
```
HTTP/2 200
access-control-allow-origin: https://your-frontend.vercel.app
access-control-allow-credentials: true
access-control-allow-methods: *
access-control-allow-headers: *
```

#### Test Login Endpoint
```bash
curl -X POST https://your-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-frontend.vercel.app" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Expected**: Should see `access-control-allow-origin` header in response

---

## Common CORS Patterns

### Pattern 1: Multiple Frontend Domains
```
CORS_ORIGINS=https://app.vercel.app,https://app-git-dev.vercel.app,https://custom-domain.com
```

### Pattern 2: Wildcard for Development (Not Recommended for Production)
```
CORS_ORIGINS=*
```

### Pattern 3: Protocol-Specific
```
CORS_ORIGINS=https://app.vercel.app,http://localhost:5173
```

---

## Troubleshooting

### Issue 1: Still Getting CORS Errors After Configuration

**Check**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open DevTools → Network tab → Check response headers
3. Verify environment variables in Render dashboard
4. Check Render logs for CORS configuration: `Configuring CORS with origins: [...]`

**Solution**:
```bash
# Force redeploy on Render
# In Render dashboard: Manual Deploy → Deploy latest commit

# Force redeploy on Vercel
# In Vercel dashboard: Deployments → Redeploy
```

### Issue 2: Preflight Requests Failing

**Symptoms**: OPTIONS requests return 403 or 404

**Solution**: Ensure FastAPI CORS middleware is added BEFORE any routes
```python
# main.py - CORS must be added before routers
app.add_middleware(CORSMiddleware, ...)
app.include_router(auth_router, ...)  # After middleware
```

### Issue 3: Credentials Not Working

**Symptoms**: Cookies/Authorization headers not sent

**Solution**: Both frontend and backend must enable credentials
```python
# Backend (already fixed)
allow_credentials=True

# Frontend - axios config
axios.defaults.withCredentials = true;
```

### Issue 4: Wildcard with Credentials

**Error**: "Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

**Solution**: Must specify exact origins when using credentials
```
CORS_ORIGINS=https://app.vercel.app  # NOT "*"
CORS_ALLOW_CREDENTIALS=true
```

---

## Environment Variables Checklist

### Render (Backend) - Required Variables
- [x] `CORS_ORIGINS` - Your Vercel frontend URL(s)
- [x] `CORS_ALLOW_CREDENTIALS` - Set to `true`
- [x] `CORS_ALLOW_METHODS` - Set to `*`
- [x] `CORS_ALLOW_HEADERS` - Set to `*`
- [x] `DATABASE_URL` - PostgreSQL connection string
- [x] `OPENAI_API_KEY` - Your OpenAI API key
- [x] `AZURE_STORAGE_CONNECTION_STRING` - Azure storage
- [x] `JWT_SECRET_KEY` - Strong secret key

### Vercel (Frontend) - Required Variables
- [x] `VITE_API_URL` - Your Render backend URL

---

## Quick Fix Commands

### Update Render Environment Variables (via CLI)
```bash
# Install Render CLI
npm install -g @renderinc/cli

# Login
render login

# Set CORS_ORIGINS
render config:set CORS_ORIGINS="https://your-app.vercel.app" --service=your-service-name
```

### Update Vercel Environment Variables (via CLI)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Set API URL
vercel env add VITE_API_URL production
# Enter: https://your-backend.onrender.com

# Redeploy
vercel --prod
```

---

## Testing Checklist

After configuration:

1. **Clear Browser Cache**
   - Chrome: Ctrl+Shift+Delete → Clear all

2. **Test Login**
   - Open frontend: `https://your-app.vercel.app`
   - Open DevTools → Network tab
   - Try to login
   - Check login request → Response Headers → Should see `access-control-allow-origin`

3. **Check Preflight**
   - Look for OPTIONS requests before POST
   - OPTIONS should return 200 OK
   - OPTIONS response should have CORS headers

4. **Verify Backend Logs**
   - Go to Render dashboard → Logs
   - Look for: `Configuring CORS with origins: ['https://your-app.vercel.app']`

---

## Production Best Practices

### 1. Use Specific Origins
```
✅ CORS_ORIGINS=https://app.vercel.app,https://custom-domain.com
❌ CORS_ORIGINS=*
```

### 2. Enable Credentials for Auth
```
CORS_ALLOW_CREDENTIALS=true
```

### 3. Limit Methods (Optional)
```
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

### 4. Monitor CORS Errors
- Check Render logs regularly
- Setup alerts for 403 errors
- Monitor failed preflight requests

### 5. Document Your URLs
Keep a list of all allowed origins:
- Production: `https://app.vercel.app`
- Staging: `https://app-staging.vercel.app`
- Preview: `https://app-git-*.vercel.app`

---

## Additional Resources

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Render Environment Variables](https://render.com/docs/environment-variables)

---

## Summary

**Problem**: Missing CORS headers blocking frontend requests  
**Solution**: Configure `CORS_ORIGINS` on Render with your Vercel URL  
**Time to Fix**: 5 minutes  
**Result**: Frontend can successfully call backend APIs  

If you're still experiencing issues after following these steps, check:
1. Render logs for CORS configuration confirmation
2. Browser DevTools Network tab for actual response headers
3. Ensure both services have been redeployed after configuration changes
