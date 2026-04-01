# Deploy SwasthFirst Backend & Frontend Together on Cloud Run

## Overview: Complete Deployment Process

This guide walks through deploying **both backend (FastAPI) and frontend (React) to Cloud Run simultaneously**.

### What You'll Have at the End

```
✅ Backend running: https://swasthfirst-backend-xyz789.run.app
✅ Frontend running: https://swasthfirst-frontend-abc123.run.app
✅ Frontend connected to backend via CORS
✅ Both services talking to same PostgreSQL database (Neon)
✅ Real-time order updates flowing from backend to frontend
```

---

## Pre-Deployment Checklist

- ✅ GCP Project created
- ✅ Neon PostgreSQL database created (free tier)
- ✅ Neon database credentials saved
- ✅ Repository pushed to GitHub
- ✅ Google Cloud Shell access ready
- ✅ `deploy.sh` scripts ready (both backend and frontend)

**Time Required:** ~15-20 minutes

---

## PHASE 1: Deploy Backend First

### STEP 1.1: Open Cloud Shell

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **`>_`** terminal icon (top-right)
3. Click "Open Cloud Shell"

### STEP 1.2: Set Project ID and Clone Repository

```bash
export PROJECT_ID="your-gcp-project-id"

git clone https://github.com/YOUR_USERNAME/SWASTH_FASTAPI_APP.git
cd SWASTH_FASTAPI_APP/swasthfirst-backend
```

**Replace:**
- `your-gcp-project-id` with actual GCP project ID
- `YOUR_USERNAME` with GitHub username

### STEP 1.3: Configure Backend Environment

```bash
nano .env.production
```

**Add these values:**

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@host.neon.tech/dbname

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# Environment
ENV=production

# CORS (will update after frontend is deployed)
CORS_ORIGINS=http://localhost:3000

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

**Where to find values:**
- `DATABASE_URL`: From Neon console (connection string)
- `SECRET_KEY`: Generate a random string (use `python3 -c "import secrets; print(secrets.token_urlsafe())"`)

**Save with:** Ctrl+O → Enter → Ctrl+X

### STEP 1.4: Make Deploy Script Executable

```bash
chmod +x deploy.sh
```

### STEP 1.5: Deploy Backend

```bash
./deploy.sh --project $PROJECT_ID
```

**Expected output:**

```
╔════════════════════════════════════╗
║  SwasthFirst FastAPI Cloud Deploy  ║
╚════════════════════════════════════╝

[✓] gcloud and docker are installed
[✓] GCP project set to: your-project-id
[✓] APIs enabled successfully
[ℹ] Building Docker image (2-3 minutes)...
[✓] Docker image built successfully
[ℹ] Pushing image to Google Container Registry (1-2 minutes)...
[✓] Image pushed to GCR
[ℹ] Deploying to Cloud Run (2-3 minutes)...
[✓] Backend deployment successful!

🎉 Backend is live!
   URL: https://swasthfirst-backend-xyz789.run.app
```

### STEP 1.6: Save Backend URL

```bash
# The deploy.sh will show you the URL. Save it:
export BACKEND_URL="https://swasthfirst-backend-xyz789.run.app"

# Test the backend is working
curl $BACKEND_URL/api/v1/menu
```

Should return your menu items (JSON array).

**If you missed the URL, get it again:**
```bash
gcloud run services describe swasthfirst-backend \
  --region us-central1 \
  --format='value(status.url)'
```

---

## PHASE 2: Deploy Frontend

### STEP 2.1: Navigate to Frontend Directory

```bash
cd ../frontend-react
chmod +x deploy.sh
```

### STEP 2.2: Deploy Frontend with Backend URL

```bash
./deploy.sh --project $PROJECT_ID --backend $BACKEND_URL
```

**You must provide:** `--backend $BACKEND_URL` (from backend deployment)

**Expected output:**

```
╔════════════════════════════════════╗
║  SwasthFirst Frontend Cloud Deploy ║
╚════════════════════════════════════╝

[✓] gcloud and docker are installed
[✓] GCP project set to: your-project-id
[ℹ] Building Docker image (2-3 minutes)...
[✓] Docker image built successfully
[ℹ] Pushing image to Google Container Registry (1-2 minutes)...
[✓] Image pushed to GCR
[ℹ] Deploying to Cloud Run (2-3 minutes)...
[✓] Deployment completed successfully!

📍 Frontend URL: https://swasthfirst-frontend-abc123.run.app
⚙️  Backend URL: https://swasthfirst-backend-xyz789.run.app
🎉 Your SwasthFirst Frontend is live!
```

### STEP 2.3: Save Frontend URL

```bash
export FRONTEND_URL="https://swasthfirst-frontend-abc123.run.app"
```

---

## PHASE 3: Configure CORS on Backend

### STEP 3.1: Update Backend CORS Settings

Now that frontend is deployed, tell backend to allow requests from frontend.

```bash
cd ../swasthfirst-backend

nano .env.production
```

**Change this line:**
```env
CORS_ORIGINS=http://localhost:3000
```

**To this:**
```env
CORS_ORIGINS=https://swasthfirst-frontend-abc123.run.app
```

Use your actual frontend URL from STEP 2.3.

**Save with:** Ctrl+O → Enter → Ctrl+X

### STEP 3.2: Redeploy Backend with Updated CORS

```bash
./deploy.sh --project $PROJECT_ID
```

This deployment will be faster (~5-7 minutes) since image is cached.

---

## PHASE 4: Testing

### STEP 4.1: Open Frontend in Browser

Click the frontend URL in browser:
```
https://swasthfirst-frontend-abc123.run.app
```

### STEP 4.2: Verify Menu Loads

You should see:
- SwasthFirst logo/title
- Menu items displayed
- No "Cannot connect API" errors

### STEP 4.3: Test API Connectivity

From Cloud Shell, test if frontend can reach backend:

```bash
# Check if CORS allows frontend
curl -X GET "$BACKEND_URL/api/v1/menu" \
  -H "Origin: $FRONTEND_URL"

# Should return menu items without CORS errors
```

### STEP 4.4: Test Authentication

Try logging in with a customer phone from seed data:

```
Phone: 7387986785  (Jagroop Kaur)
Name: jag
```

---

## Architecture After Deployment

```
┌─────────────────────────────────────────────────────┐
│               Your Browser                          │
│         https://frontend-url.run.app                │
│                                                     │
│      ┌──────────────────────────────────┐           │
│      │   React Frontend                 │           │
│      │  - Menu Display                  │           │
│      │  - Order Form                    │           │
│      │  - Order History                 │           │
│      └──────────────────────────────────┘           │
└─────────────────────┬───────────────────────────────┘
                      │ API Calls
           ┌──────────v──────────┐
           │   Cloud Run: Backend │
           │   (FastAPI)          │
           │   :backend-url       │
           │                      │
           │  - Auth endpoints    │
           │  - Menu endpoint     │
           │  - Orders endpoint   │
           │  - Admin endpoint    │
           └──────────┬───────────┘
                      │ SQL Queries
           ┌──────────v──────────┐
           │   Neon PostgreSQL   │
           │                     │
           │  - customers table  │
           │  - orders table     │
           │  - menu table       │
           │  - admins table     │
           └─────────────────────┘
```

---

## Deployment Timeline

| Phase | Task | Duration | Cumulative |
|-------|------|----------|-----------|
| 1 | Environment setup | 2 min | 2 min |
| 1 | Build backend image | 2-3 min | 5 min |
| 1 | Push to GCR | 1-2 min | 7 min |
| 1 | Deploy backend | 2-3 min | 10 min |
| 2 | Build frontend image | 2-3 min | 13 min |
| 2 | Push to GCR | 1-2 min | 15 min |
| 2 | Deploy frontend | 2-3 min | 18 min |
| 3 | Update CORS | 1 min | 19 min |
| 3 | Redeploy backend | 2-3 min | 22 min |
| **Total** | | | **~22 minutes** |

---

## What Each Service Does

### Backend Service (FastAPI)

**Runs on:** `https://swasthfirst-backend-xyz789.run.app`

**Handles:**
- User authentication (login with phone)
- Menu management (GET /api/v1/menu)
- Order placement (POST /api/v1/orders)
- Order status (GET /api/v1/orders/{id})
- Admin functions
- Database operations
- CORS validation for frontend requests

**Database:** Neon PostgreSQL (same for both services)

### Frontend Service (React)

**Runs on:** `https://swasthfirst-frontend-abc123.run.app`

**Handles:**
- User interface
- React component rendering
- API calls to backend
- Form validation
- Order tracking
- Authentication tokens

**How it calls backend:**
```javascript
// In src/api/client.js
const API_BASE_URL = 'https://backend-xyz789.run.app/api/v1';

// Makes requests
fetch(`${API_BASE_URL}/menu`);
fetch(`${API_BASE_URL}/orders`, { method: 'POST', ... });
```

---

## Verifying Everything Works

### Quick Health Check

```bash
# Backend health
curl https://swasthfirst-backend-xyz789.run.app/health

# Frontend loads
curl https://swasthfirst-frontend-abc123.run.app

# Menu endpoint (from frontend)
curl https://swasthfirst-backend-xyz789.run.app/api/v1/menu
```

All should return HTTP 200.

### Test Complete Flow

1. Open frontend URL in browser
2. You should see menu
3. Click on a menu item
4. Specify quantity
5. Login with phone: `7387986785`
6. Place order
7. Should see confirmation

---

## Troubleshooting

### "Cannot load menu" in Frontend

**Problem:** Frontend shows but menu doesn't load

**Solutions:**

1. Check backend is running:
   ```bash
   curl https://swasthfirst-backend-xyz789.run.app/api/v1/menu
   ```

2. Check CORS is configured:
   ```bash
   # Edit backend .env.production
   # Verify CORS_ORIGINS has frontend URL
   
   # Redeploy backend
   cd swasthfirst-backend
   ./deploy.sh --project $PROJECT_ID
   ```

3. Check browser console for errors (F12 → Console tab)

### "502 Bad Gateway" on Backend

**Problem:** Backend service returns 502 error

**Solutions:**

1. Wait a few minutes (service might be starting)

2. Check service logs:
   ```bash
   gcloud run logs read swasthfirst-backend --region us-central1 --limit=20
   ```

3. Check database connection:
   - Is DATABASE_URL correct?
   - Is Neon database running?
   - Can you connect from Cloud Shell?
   ```bash
   psql postgresql://user:pass@host.neon.tech/dbname
   ```

### "Frontend loads but API returns 403"

**Problem:** CORS error blocking requests

**Solutions:**

1. Verify CORS origin in backend:
   ```bash
   # Get your frontend exact URL
   echo $FRONTEND_URL
   
   # Update backend .env.production
   CORS_ORIGINS=https://swasthfirst-frontend-abc123.run.app
   
   # Redeploy
   cd swasthfirst-backend
   ./deploy.sh --project $PROJECT_ID
   ```

### Deploy Script Fails

**If `deploy.sh` fails:**

1. Check the error message carefully
2. View logs:
   ```bash
   # Backend logs
   gcloud run logs read swasthfirst-backend --limit=50
   
   # Frontend logs  
   gcloud run logs read swasthfirst-frontend --limit=50
   ```

3. Try manual deployment (see FRONTEND_CLOUD_RUN_DEPLOYMENT.md or CLOUD_SHELL_DEPLOYMENT.md)

---

## Environment Variables Summary

### Backend (.env.production)

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host.neon.tech/dbname
SECRET_KEY=your-secret-key-here
ENV=production
CORS_ORIGINS=https://swasthfirst-frontend-abc123.run.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### Frontend (Set During Deployment)

```
REACT_APP_API_URL=https://swasthfirst-backend-xyz789.run.app/api/v1
```

Set automatically by deploy.sh with `--backend $BACKEND_URL`

---

## Cost Breakdown

### Monthly Cost (Approximate)

**Backend Service:**
- Cloud Run: $2-5/month (varies by traffic)
- Database (Neon): free tier or ~$20/month

**Frontend Service:**
- Cloud Run: $1-3/month (mostly static serving)

**Total: $3-28/month**

Both stay within free tier if:
- <2M requests/month total
- <100 concurrent users
- <10GB database

---

## Going Live

### Production Checklist

- ✅ Backend deployed and tested
- ✅ Frontend deployed and tested
- ✅ CORS configured
- ✅ Database seeded with customers (run init-db endpoint)
- ✅ Tested authentication flow
- ✅ Tested order placement
- ✅ Verified no error messages in logs

### What's Next?

1. **Monitor logs:** Regular check on production logs
   ```bash
   gcloud run logs read swasthfirst-backend --region us-central1 --limit=50 --follow
   ```

2. **Set up alerts:** Configure notifications for errors

3. **Set auto-scaling:** Cloud Run auto-scales by default

4. **Backup database:** Set up Neon automated backups

5. **Custom domain:** Associate custom domain (optional)

---

## Quick Command Reference

```bash
# Set variables
export PROJECT_ID="your-project-id"
export BACKEND_URL="https://swasthfirst-backend-xyz.run.app"
export FRONTEND_URL="https://swasthfirst-frontend-abc.run.app"

# Deploy backend
cd swasthfirst-backend
./deploy.sh --project $PROJECT_ID

# Deploy frontend
cd ../frontend-react
./deploy.sh --project $PROJECT_ID --backend $BACKEND_URL

# View logs
gcloud run logs read swasthfirst-backend --region us-central1 --limit=50
gcloud run logs read swasthfirst-frontend --region us-central1 --limit=50

# Get service URLs
gcloud run services describe swasthfirst-backend --region us-central1 --format='value(status.url)'
gcloud run services describe swasthfirst-frontend --region us-central1 --format='value(status.url)'

# Test backend
curl https://swasthfirst-backend-xyz.run.app/api/v1/menu
```

---

## Summary

You now have a complete deployed application:

```
Frontend  → API Calls → Backend → Database
(React)     (HTTP)     (FastAPI)  (PostgreSQL)
```

All running on Google Cloud Run, fully scalable, with automatic CORS management, and real-time updates.

**Congratulations! 🎉 SwasthFirst is live on Cloud Run!**
