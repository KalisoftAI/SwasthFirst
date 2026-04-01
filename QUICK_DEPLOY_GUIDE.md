# Quick Start: Deploy Both Backend & Frontend to Cloud Run

## 30-Second Overview

**What:** Deploy React frontend + FastAPI backend to Google Cloud Run  
**Why:** Single platform, simple CORS, easier management  
**Time:** ~25 minutes  
**Cost:** ~$2-10/month (both within free tier)  

---

## The Two Deployment Commands

### 1️⃣ Deploy Backend (~10 min)

```bash
# Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"

# Go to backend
cd SWASTH_FASTAPI_APP/swasthfirst-backend

# Edit config (with Neon credentials)
nano .env.production

# Deploy
chmod +x deploy.sh
./deploy.sh --project $PROJECT_ID

# Save the URL
export BACKEND_URL="https://swasthfirst-backend-ABC123.run.app"
```

### 2️⃣ Deploy Frontend (~10 min)

```bash
# Go to frontend
cd ../frontend-react

# Deploy (with backend URL)
chmod +x deploy.sh
./deploy.sh --project $PROJECT_ID --backend $BACKEND_URL

# Save the URL  
export FRONTEND_URL="https://swasthfirst-frontend-XYZ789.run.app"
```

### 3️⃣ Update CORS (~5 min)

```bash
# Go back to backend
cd ../swasthfirst-backend

# Edit config with frontend URL
nano .env.production
# Change: CORS_ORIGINS=http://localhost:3000
# To: CORS_ORIGINS=$FRONTEND_URL

# Redeploy
./deploy.sh --project $PROJECT_ID
```

### Done! ✅

Open frontend URL: `https://swasthfirst-frontend-XYZ789.run.app`

---

## Architecture

```
Browser
   ↓
Frontend Service (React)     ←→ Backend Service (FastAPI)
https://frontend-url.run.app    https://backend-url.run.app
   Port: 3000                    Port: 8000
                                    ↓
                            Neon PostgreSQL
```

---

## What You Get

```
✅ Frontend running on Cloud Run
✅ Backend running on Cloud Run (same platform)
✅ Real-time database updates
✅ CORS automatically configured
✅ Both services talking to same database
✅ One dashboard to manage everything
✅ Auto-scaling included
✅ Production-ready
```

---

## Files Created

| File | Purpose |
|------|---------|
| `frontend-react/Dockerfile` | Build React for production |
| `frontend-react/deploy.sh` | Deploy frontend to Cloud Run |
| `FRONTEND_CLOUD_RUN_DEPLOYMENT.md` | Detailed frontend guide |
| `DEPLOY_BOTH_TOGETHER.md` | Complete step-by-step walkthrough |
| `CLOUD_RUN_DEPLOYMENT_STRATEGY.md` | Architecture & comparison |

---

## Common Issues

| Problem | Solution |
|---------|----------|
| "Cannot reach API" | Update backend CORS (see Step 3 above) |
| "Frontend won't load" | Check backend URL in deploy.sh command |
| "Build failed" | Use Cloud Shell (auto-configured environment) |
| "503 service unavailable" | Wait 2-3 minutes for startup |

---

## Detailed Guides

**Need more details?** Read in order:

1. **DEPLOY_BOTH_TOGETHER.md** - Complete walkthrough with all steps
2. **FRONTEND_CLOUD_RUN_DEPLOYMENT.md** - Frontend-specific details
3. **CLOUD_RUN_DEPLOYMENT_STRATEGY.md** - Architecture & why Cloud Run

---

## Commands Cheat Sheet

```bash
# Set up (do once)
export PROJECT_ID="your-project-id"

# Check service is running
gcloud run services describe swasthfirst-backend --region us-central1 --format='value(status.url)'

# View logs
gcloud run logs read swasthfirst-backend --region us-central1 --limit=50

# View logs (follow/real-time)
gcloud run logs read swasthfirst-backend --region us-central1 --follow

# Stop/delete service
gcloud run services delete swasthfirst-backend --region us-central1
```

---

## Environment Variables Needed

### For Backend (.env.production)

```
DATABASE_URL=postgresql+asyncpg://user:password@host.neon.tech/dbname
SECRET_KEY=any-random-string
ENV=production
CORS_ORIGINS=https://swasthfirst-frontend-ABC123.run.app
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### For Frontend (Set automatically)

```
REACT_APP_API_URL=https://swasthfirst-backend-XYZ789.run.app/api/v1
```

---

## Testing After Deployment

```bash
# Test backend is up
curl https://swasthfirst-backend-XYZ789.run.app/api/v1/menu

# Test CORS (should not have CORS error)
curl -H "Origin: https://swasthfirst-frontend-ABC123.run.app" \
     https://swasthfirst-backend-XYZ789.run.app/api/v1/menu

# Test frontend loads
curl https://swasthfirst-frontend-ABC123.run.app | head -20
```

---

## Ready?

**Follow:** [DEPLOY_BOTH_TOGETHER.md](DEPLOY_BOTH_TOGETHER.md) for complete step-by-step guide.

**Questions?** Check the detailed guides above or your deployment logs:
```bash
gcloud run logs read swasthfirst-backend --region us-central1 --limit=100
```

**Let's go! 🚀**
