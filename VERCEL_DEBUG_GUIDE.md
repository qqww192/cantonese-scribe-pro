# 🚨 Vercel Debugging Guide for Login/Register Issues

## 🔍 Quick Diagnosis Steps

### Step 1: Check API Connectivity
1. Visit your Vercel deployment URL
2. Add `/debug` to the end (e.g., `https://your-app.vercel.app/debug`)
3. You should see a JSON response with endpoint information

### Step 2: Check Health Endpoint
1. Visit `https://your-app.vercel.app/health`
2. Should return: `{"status": "healthy", "version": "1.0.0"}`

### Step 3: Test Direct API Endpoints
1. Try: `https://your-app.vercel.app/api/v1/auth/login` (POST request)
2. Try: `https://your-app.vercel.app/api/v1/auth/register` (POST request)
3. Use browser developer tools or Postman

## 🛠️ Frontend Debugging (Browser Console)

Open browser developer tools and look for:

### Console Messages
```
API Configuration: {
  API_BASE_URL: "...",
  WS_BASE_URL: "...",
  VITE_API_BASE_URL: "...",
  origin: "..."
}
```

### Error Messages
- Look for network errors (404, 500, CORS)
- Check for authentication errors
- Watch for API response format issues

### Network Tab
- Check if API requests are being made to the correct URLs
- Look for CORS errors (red requests)
- Verify request/response formats

## 🔧 Common Issues & Solutions

### Issue 1: 404 - API Endpoints Not Found
**Symptoms:** All API calls return 404
**Solution:** 
- Check if `/api/v1/auth/login` endpoint exists
- Verify Vercel deployment includes backend code
- Ensure `api/` folder is deployed correctly

### Issue 2: CORS Errors
**Symptoms:** "Access to fetch has been blocked by CORS policy"
**Solution:** 
- Check environment variables in Vercel
- Verify `ALLOWED_ORIGINS` includes your domain
- Ensure wildcard `*` is temporarily allowed

### Issue 3: Environment Variables Missing
**Symptoms:** 500 errors, missing configuration
**Solution:**
- Check all environment variables are set in Vercel
- Verify `SECRET_KEY` is set
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` are configured

### Issue 4: API Response Format Mismatch
**Symptoms:** Frontend can't parse API responses
**Solution:**
- Check login response includes `user` object
- Verify field names match (e.g., `user_id` vs `id`)
- Look at browser network tab for actual response format

## 🧪 Manual Testing Commands

### Test Login API (using curl)
```bash
curl -X POST https://your-app.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected response:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "user_123",
    "name": "Test",
    "email": "test@example.com",
    "subscription_plan": "free",
    "usage_quota": 30,
    "usage_count": 0,
    "is_active": true,
    "created_at": "2025-01-15T..."
  }
}
```

### Test Registration API
```bash
curl -X POST https://your-app.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "password123"}'
```

### Test Waitlist API
```bash
curl -X POST https://your-app.vercel.app/api/v1/waitlist/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "plan_id": "pro", "source": "pricing_page"}'
```

## 📋 Environment Variables Checklist

Ensure these are set in Vercel:

### ✅ Required for Basic Functionality
- `SECRET_KEY` - JWT secret key
- `ENVIRONMENT=production`
- `NODE_ENV=production`
- `API_PREFIX=/api/v1`

### ✅ CORS Configuration
- `ALLOWED_ORIGINS=*` (temporarily for testing)
- `ALLOWED_HOSTS=*` (temporarily for testing)

### ✅ Database (for future features)
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`

### ✅ Email Service
- `RESEND_API_KEY=re_bg8PVLKn_3tHAgjF69791KuVPNAsKQnHm`
- `FROM_EMAIL=hkcantolink@gmail.com`
- `SUPPORT_EMAIL=hkcantolink@gmail.com`

## 🚀 Deployment Verification

### 1. Check Vercel Build Logs
- Go to Vercel dashboard → Your project → Functions
- Look for build errors or warnings
- Verify all dependencies installed correctly

### 2. Verify File Structure
Ensure these files are deployed:
```
api/
├── app/
│   ├── main.py
│   ├── api/v1/endpoints/auth.py
│   └── schemas/auth.py
```

### 3. Function Configuration
- Check Vercel function region
- Verify function timeout settings
- Ensure Python runtime is configured

## 🔄 Quick Fixes to Try

### Fix 1: Restart Deployment
1. Go to Vercel dashboard
2. Trigger a new deployment
3. Check if issues persist

### Fix 2: Update Environment Variables
1. Add `DEBUG=true` temporarily
2. Set `ALLOWED_ORIGINS=*`
3. Redeploy

### Fix 3: Clear Browser Cache
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Try in incognito mode

## 📞 Need More Help?

### What to Share:
1. Your Vercel deployment URL
2. Browser console errors (screenshots)
3. Network tab showing failed requests
4. Any error messages from Vercel dashboard

### Debugging Checklist:
- [ ] `/health` endpoint works
- [ ] `/debug` endpoint shows correct configuration
- [ ] Browser console shows API configuration
- [ ] Network tab shows API requests being made
- [ ] Environment variables are set in Vercel
- [ ] No CORS errors in browser console
- [ ] API responses have correct format

---

## 🎯 Most Likely Solutions

Based on common Vercel deployment issues:

1. **Environment Variables**: Make sure all required environment variables are set
2. **API URL Configuration**: Frontend might be calling wrong URL
3. **CORS Configuration**: Backend might be rejecting frontend requests
4. **Deployment Structure**: API routes might not be properly deployed

Try the debugging steps above, and the console logs will help identify the exact issue! 🚀