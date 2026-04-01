# ⚡ SwasthFirst - 2 Minute Quick Start

Get the full-stack application running in 2 minutes!

## Prerequisites Check
- [ ] Python 3.11+ installed (`python --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] PostgreSQL running (`psql --version`)
h
## Step 1: Backend (60 seconds)

```bash
# Terminal 1
cd swasthfirst-backend
python -m venv venv
venv\Scripts\activate  # Windows: OR source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

# Create database
createdb swasthfirst

# Create .env file (copy-paste this)
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swasthfirst
SECRET_KEY=dev-secret-key-change-in-production-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
ADMIN_TOKEN_EXPIRE_HOURS=8
CORS_ORIGINS=http://localhost:3000
ENV=development' > .env

# Seed database
python seed_data.py

# Start server
uvicorn main:app --reload --port 8000
```

✅ Backend ready at http://localhost:8000 | Docs: http://localhost:8000/docs

## Step 2: Frontend (60 seconds)

```bash
# Terminal 2 (NEW terminal)
cd frontend-react

npm install

# Create .env
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env

npm start
```

✅ Frontend ready at http://localhost:3000

## Step 3: Test (30 seconds)

### Customer Login
- Open http://localhost:3000
- Name: **Priya Sharma**
- Phone: **9876543210**
- Choose "Detox" → Browse menu → Add items → Place order!

### Admin Dashboard
- Click "Admin Access"
- Username: **swasthAdmin**
- Password: **Admin@1234**
- View orders, update status, export CSV!

---

## 🎉 That's It! You're Running!

**What Now?**
- Read [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md) for full details
- Explore API docs: http://localhost:8000/docs
- Check [README.md](README.md) for detailed documentation

**Troubleshooting?**
- Backend won't start? Check PostgreSQL is running: `psql -U postgres`
- Frontend errors? Check backend is running: `curl http://localhost:8000/health`
- Database errors? Verify .env DATABASE_URL matches your PostgreSQL credentials

---

**Built with ❤️ for SwasthFirst**
