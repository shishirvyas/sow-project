# Quick CORS Fix for Vercel + Render Deployment

## 🚨 Immediate Fix (5 minutes)

### Step 1: Update Render Backend CORS

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Select your backend service**
3. **Click "Environment" tab**
4. **Add/Update this variable**:

```
Key:   CORS_ORIGINS
Value: https://YOUR-FRONTEND.vercel.app
```

**Example**:
```
CORS_ORIGINS=https://sow-project.vercel.app,https://sow-project-git-main.vercel.app
```

5. **Click "Save Changes"** (Render will auto-redeploy)

---

### Step 2: Update Vercel Frontend API URL

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your frontend project**
3. **Settings → Environment Variables**
4. **Add this variable**:

```
Key:         VITE_API_URL
Value:       https://YOUR-BACKEND.onrender.com
Environment: Production
```

**Example**:
```
VITE_API_URL=https://sow-backend-abc123.onrender.com
```

5. **Deployments → Redeploy** (click ⋮ → Redeploy)

---

## ✅ Test After Deployment

### Open Browser DevTools
```
1. Go to your Vercel app: https://your-app.vercel.app
2. Open DevTools (F12)
3. Network tab
4. Try to login
5. Check login request headers:
   - Should see: access-control-allow-origin: https://your-app.vercel.app
```

### Quick cURL Test
```bash
curl -I -X OPTIONS https://your-backend.onrender.com/api/v1/auth/login \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Access-Control-Request-Method: POST"
```

**Expected**: See `access-control-allow-origin` in response

---

## 📋 Complete Environment Variables

### Render (Backend)
Copy these to Render dashboard → Environment:

```env
CORS_ORIGINS=https://your-frontend.vercel.app
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=*
CORS_ALLOW_HEADERS=*
ENV=production
PORT=10000
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
OPENAI_API_KEY=sk-...
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
JWT_SECRET_KEY=your-secret-key-here
```

### Vercel (Frontend)
Copy these to Vercel dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## 🐛 Still Not Working?

### Check 1: Verify CORS in Render Logs
```
1. Render Dashboard → Your Service → Logs
2. Look for: "Configuring CORS with origins: [...]"
3. Should show your Vercel URL
```

### Check 2: Clear Browser Cache
```
Chrome: Ctrl+Shift+Delete → Clear cached images and files
```

### Check 3: Force Redeploy Both Services
```
Render: Manual Deploy → Deploy latest commit
Vercel: Deployments → Redeploy (click ⋮)
```

### Check 4: Test Backend Directly
```bash
# Should return CORS headers
curl -v https://your-backend.onrender.com/health
```

---

## 🔗 Get Your URLs

### Find Vercel Frontend URL
```
Vercel Dashboard → Project → Domains
Copy the primary domain (e.g., sow-project.vercel.app)
```

### Find Render Backend URL
```
Render Dashboard → Service → Settings
Copy the service URL (e.g., sow-backend-abc123.onrender.com)
```

---

## ⚠️ Common Mistakes

❌ **Don't include http://** in CORS_ORIGINS  
✅ Use: `https://app.vercel.app`

❌ **Don't use wildcard with credentials**  
✅ Use specific origins: `https://app.vercel.app`

❌ **Don't forget to redeploy after changes**  
✅ Always redeploy both frontend and backend

❌ **Don't mix dev and prod URLs**  
✅ Separate environment variables for each

---

## 📞 Need Help?

If CORS errors persist:

1. **Check Network Tab**: F12 → Network → Look for OPTIONS requests
2. **Check Response Headers**: Click request → Headers → Response Headers
3. **Check Render Logs**: Look for errors or CORS configuration messages
4. **Verify Both URLs**: Make sure both are HTTPS (not HTTP)
5. **Clear Everything**: Browser cache, cookies, and redeploy both services

---

**Time to Fix**: 5 minutes  
**Difficulty**: Easy  
**Impact**: Fixes all CORS errors immediately
