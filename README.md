# SwasthFirst - Full Stack Application

Complete health juice bar order management system with FastAPI backend and React frontend.

## 📁 Project Structure

```
SWASTH_FASTAPI_APP/
├── swasthfirst-backend/       # FastAPI backend (Python)
│   ├── main.py                # Application entry point
│   ├── database.py            # PostgreSQL configuration
│   ├── models.py              # ORM models
│   ├── schemas.py             # Pydantic schemas
│   ├── auth.py                # JWT authentication
│   ├── routers/               # API endpoints
│   ├── services/              # Business logic
│   ├── middleware/            # Rate limiting, etc.
│   ├── utils/                 # Helper functions
│   ├── seed_data.py           # Database seeding
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment template
│   └── README.md              # Backend documentation
│
└── frontend-react/            # React frontend
    ├── src/
    │   ├── api/client.js      # API client
    │   ├── App.jsx            # Main component
    │   └── index.jsx          # React entry point
    ├── public/
    ├── package.json           # Node dependencies
    └── README.md              # Frontend documentation
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to backend
cd swasthfirst-backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create PostgreSQL database
createdb swasthfirst

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and secret key

# Seed database
python seed_data.py

# Start backend server
uvicorn main:app --reload --port 8000
```

Backend will run at: http://localhost:8000
API Docs: http://localhost:8000/docs

### 2. Frontend Setup

```bash
# Navigate to frontend (in a new terminal)
cd frontend-react

# Install dependencies
npm install

# Configure environment
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env

# Start development server
npm start
```

Frontend will run at: http://localhost:3000

## 🎯 Features

### Customer Features
- ✅ Phone-based authentication
- ✅ Browse categorized menu (juices, salads, detox waters)
- ✅ Select health goals (Detox, Energy, Weight Loss, Immunity)
- ✅ Add items to cart with quantities
- ✅ Place orders with real-time validation
- ✅ View order confirmation with tracking code

### Admin Features
- ✅ Separate admin authentication
- ✅ Real-time dashboard with auto-refresh
- ✅ View all orders with customer details
- ✅ Update order status (pending → preparing → ready → completed)
- ✅ Analytics (daily orders, revenue, customer count)
- ✅ Export orders to CSV
- ✅ Customer management

### Technical Features
- ✅ JWT authentication with role-based access control
- ✅ Rate limiting (5 login attempts per 15 minutes)
- ✅ Async PostgreSQL with SQLAlchemy
- ✅ Phone number as password (bcrypt hashed)
- ✅ Server-side price validation
- ✅ Comprehensive error handling
- ✅ API documentation with Swagger UI
- ✅ Mobile-first responsive design

## 🔐 Test Accounts

### Customers (Phone = Password)
```
Name: Priya Sharma | Phone: 9876543210
Name: Rohit Mehta | Phone: 9123456789
Name: Ananya Joshi | Phone: 9988776655
```

### Admin
```
Username: swasthAdmin
Password: Admin@1234
```

## 📚 Documentation

- **Backend API**: See [swasthfirst-backend/README.md](swasthfirst-backend/README.md)
- **Frontend**: See [frontend-react/README.md](frontend-react/README.md)
- **API Docs**: http://localhost:8000/docs (when backend is running)

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM with async support
- **Pydantic** - Data validation
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **Alembic** - Database migrations

### Frontend
- **React 18** - UI library
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Fetch API** - HTTP requests

## 🚀 Deployment

### Backend Deployment

#### Option 1: Traditional VPS
```bash
# Install dependencies
sudo apt update
sudo apt install python3-pip postgresql nginx

# Clone and setup
git clone <repo>
cd swasthfirst-backend
pip install -r requirements.txt

# Setup systemd service
sudo nano /etc/systemd/system/swasthfirst.service
sudo systemctl start swasthfirst
sudo systemctl enable swasthfirst

# Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/swasthfirst
sudo nginx -t
sudo systemctl reload nginx
```

#### Option 2: Platform-as-a-Service
- **Render.com**: Connect repo → Set env vars → Deploy
- **Railway.app**: Similar to Render
- **Heroku**: Use Procfile and PostgreSQL add-on

### Frontend Deployment

#### Option 1: Static Hosting
```bash
# Build production bundle
npm run build

# Deploy to:
# - Netlify: Drag & drop build/ folder
# - Vercel: Connect GitHub repo
# - Cloudflare Pages: Connect GitHub repo
```

## 🔧 Configuration

### Backend Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:5432/swasthfirst
SECRET_KEY=<generate-with-openssl-rand-hex-32>
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
ENV=production
```

### Frontend Environment Variables
```env
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
```

## 📊 Database Schema

### Tables
1. **customers** - User accounts with phone-based auth
2. **admins** - Staff accounts with role-based permissions
3. **menu_items** - Product catalog with pricing and tags
4. **orders** - Customer orders with items (JSON) and status

### Relationships
- Customer → Orders (one-to-many)
- Orders store items as JSON for flexibility

## 🐛 Common Issues

### Backend Won't Start
```bash
# Check database connection
psql -U postgres -d swasthfirst -c "SELECT 1;"

# Verify Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Frontend Can't Connect to API
```bash
# Check CORS settings in backend .env
CORS_ORIGINS=http://localhost:3000

# Verify API is running
curl http://localhost:8000/health

# Check browser console for errors
```

### Database Migration Issues
```bash
# Reset database (development only!)
python seed_data.py

# Or manually
psql -U postgres
DROP DATABASE swasthfirst;
CREATE DATABASE swasthfirst;
\q
python seed_data.py
```

## 📝 Future Enhancements

- [ ] WebSocket integration for real-time order updates
- [ ] SMS notifications via Twilio/MSG91
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Customer loyalty program
- [ ] Multi-outlet support
- [ ] Inventory management
- [ ] Delivery tracking
- [ ] Mobile apps (React Native)
- [ ] Email receipts
- [ ] Advanced analytics dashboard

## 📄 License

Proprietary - SwasthFirst © 2026

## 👥 Contributors

Built by SwasthFirst Team with ❤️

---

For detailed documentation, see individual README files in backend and frontend directories.
