# Quick Reference Guide - Neon + Cloud Run Deployment

**Fastest way to get your app live in production!**

---

## ⚡ TL;DR - 3 Step Deployment

### Step 1: Create Neon Database (5 minutes)
1. Go to https://console.neon.tech/ → Sign up
2. Create project "swasthfirst"
3. Copy **Pooled connection** string from dashboard
4. Done! Your database is ready.

### Step 2: Prepare Your Environment (5 minutes)
1. Open terminal in `swasthfirst-backend/` directory
2. Edit `.env.production`:
   ```
   DATABASE_URL=<paste-neon-connection-string>
   SECRET_KEY=<generate-32-char-hex-key>
   CORS_ORIGINS=http://localhost:3000
   ENV=production
   ```
3. Save file (don't commit to GitHub!)

### Step 3: Deploy to Cloud Run (10 minutes)
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh --project YOUR_GCP_PROJECT_ID

# Windows
deploy.bat YOUR_GCP_PROJECT_ID
```

🎉 **Done! Your API is live at the URL shown in the output.**

---

## 📋 Complete Step-by-Step Guide

### Prerequisites
- GCP account with billing enabled
- gcloud CLI installed: https://cloud.google.com/sdk/docs/install
- Docker Desktop installed: https://www.docker.com/products/docker-desktop
- Authenticate: `gcloud auth login`

### 1️⃣ Set Up Neon Database

**Why Neon?** Managed PostgreSQL perfect for serverless Cloud Run. Free tier: 10GB storage, 100 hours/month.

```bash
# Step-by-step:
# 1. Visit: https://console.neon.tech/
# 2. Click "Sign Up" → Create account
# 3. Email verification link will be sent
# 4. Click "New Project" in dashboard
# 5. Enter name: swasthfirst
# 6. Choose region (us-east-4 recommended for US)
# 7. Wait for project to initialize (30 seconds)
# 8. Copy the "Pooled connection" string
```

**Example Neon connection string:**
```
postgresql://user_pooled:mypassword@ep-xyz.us-east-4.aws.neon.tech/swasthfirst?sslmode=require
```

### 2️⃣ Set Up GCP Project

```bash
# Create new project or use existing
# In GCP Console: https://console.cloud.google.com/

# 1. Select project or click "New Project"
# 2. Enter name: swasthfirst
# 3. Click "Create"
# 4. Enable billing on the new project

# Then in terminal:
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID
```

### 3️⃣ Prepare Local Environment

```bash
cd swasthfirst-backend/

# Create production environment file
cp .env.production .env.production

# Edit the file with your actual values
# - DATABASE_URL: from Neon console
# - SECRET_KEY: generate with openssl rand -hex 32
# - Other values: keep defaults
```

**Generate SECRET_KEY:**
```bash
# Linux/Mac:
openssl rand -hex 32

# Windows:
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4️⃣ Deploy Using Script

The deployment script automates everything (build, push, deploy).

**For Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh --project YOUR_GCP_PROJECT_ID

# Advanced options:
./deploy.sh \
  --project YOUR_GCP_PROJECT_ID \
  --region us-central1 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 100
```

**For Windows:**
```cmd
deploy.bat YOUR_GCP_PROJECT_ID us-central1
```

**What the script does:**
✅ Validates environment
✅ Enables GCP APIs
✅ Builds Docker image
✅ Pushes to Google Container Registry
✅ Deploys to Cloud Run
✅ Optionally initializes database

### 5️⃣ Verify Deployment

```bash
# Check service status
gcloud run services describe swasthfirst-api --region us-central1

# View logs
gcloud run logs read swasthfirst-api --region us-central1 --limit 20

# Test health endpoint
curl https://swasthfirst-api-XXXXX.a.run.app/health
# Should return: {"status":"ok"}

# View API docs
# Visit: https://swasthfirst-api-XXXXX.a.run.app/docs
```

---

## 🔧 Manual Deployment (Alternative)

If scripts don't work for you:

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"

# Build image
docker build -t gcr.io/$PROJECT_ID/swasthfirst-backend:latest .

# Authenticate Docker with GCP
gcloud auth configure-docker gcr.io

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/swasthfirst-backend:latest

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Deploy to Cloud Run (single command)
gcloud run deploy swasthfirst-api \
  --image gcr.io/$PROJECT_ID/swasthfirst-backend:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=$DATABASE_URL,SECRET_KEY=$SECRET_KEY,CORS_ORIGINS=$CORS_ORIGINS,ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --port 8000
```

---

## 🚨 Common Issues

### "Cannot connect to database"
- [ ] Verify Neon connection string format
- [ ] Ensure `_pooled` role in connection string
- [ ] Check `?sslmode=require` at end
- [ ] Verify Neon project status is green

### "Docker build fails"
- [ ] Verify Docker is running
- [ ] Check `requirements.txt` exists
- [ ] Try: `docker system prune` to clean up

### "gcloud command not found"
- [ ] Install gcloud: https://cloud.google.com/sdk/docs/install
- [ ] Run: `gcloud auth login`
- [ ] Run: `gcloud config set project PROJECT_ID`

### "Service returns 500 errors"
- [ ] Check logs: `gcloud run logs read swasthfirst-api --region us-central1`
- [ ] Verify DATABASE_URL is correct
- [ ] Ensure SECRET_KEY is set and has 32+ characters
- [ ] Check Neon database is active

### "CORS errors from frontend"
- [ ] Update CORS_ORIGINS environment variable:
  ```bash
  gcloud run services update swasthfirst-api \
    --update-env-vars CORS_ORIGINS=https://your-frontend.com \
    --region us-central1
  ```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **CLOUD_RUN_DEPLOYMENT.md** | 📖 Complete detailed guide (100+ lines) |
| **DEPLOYMENT_CHECKLIST.md** | ✅ Step-by-step checklist for deployment |
| **NEON_SETUP.md** | 💾 Neon database setup guide |
| **deploy.sh** | 🚀 Automated deployment script (Linux/Mac) |
| **deploy.bat** | 🚀 Automated deployment script (Windows) |
| **.env.production** | 🔐 Production environment variables |
| **Dockerfile** | 🐳 Container definition for Cloud Run |

---

## 💰 Estimated Costs (Monthly)

| Service | Free Tier | When You Pay |
|---------|-----------|--------------|
| **Cloud Run** | 2M requests | >2M requests or high CPU |
| **Neon** | 10GB storage, 100 hrs/mo | >10GB storage or >100 hours |
| **Total** | **$0/month** | Usually $10-50/mo for small apps |

---

## ✅ Success Indicators

✨ **Your deployment is successful when:**
- [ ] Service URL is accessible from browser
- [ ] Health check returns `{"status":"ok"}`
- [ ] Menu API returns JSON data
- [ ] Logs show no errors
- [ ] Cloud Run shows status "OK" (green)

---

## 📞 Next Steps

1. **Verify everything works:**
   - Visit your service URL
   - Check `/health` endpoint
   - Test menu API: `/api/v1/menu/all`

2. **Initialize database (if needed):**
   ```bash
   curl -X POST https://your-service-url/init-db
   ```

3. **Deploy frontend:**
   - Update frontend API URL to your Cloud Run service URL
   - Deploy React app to Firebase Hosting or similar

4. **Set up monitoring (optional):**
   - Enable Cloud Monitoring
   - Set up alerts for errors

5. **Scale based on traffic (optional):**
   - Adjust `--min-instances` and `--max-instances`
   - Monitor costs in GCP Billing

---

## 🎓 Learn More

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Neon Docs**: https://neon.tech/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Docker Docs**: https://docs.docker.com/

---

## 🎉 You're Live!

Your API is now running on Google Cloud Run with Neon PostgreSQL database.

**Share your service URL with your team and enjoy the scalability of serverless!**
