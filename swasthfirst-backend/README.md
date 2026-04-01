# SwasthFirst Backend API

Production-ready FastAPI backend for the SwasthFirst health juice bar order management system.

## 🚀 Features

- **Phone-based Authentication**: Simple customer login using phone numbers
- **Admin Dashboard**: Complete management interface with analytics
- **Order Management**: Real-time order tracking and status updates
- **Menu Catalog**: Categorized product listings with health tags
- **Security**: JWT authentication, rate limiting, RBAC
- **Analytics**: Sales reports, customer insights, and performance metrics
- **CSV Export**: Order data export for reporting

## 📋 Prerequisites

- Python 3.11 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

## 🔧 Installation

### 1. Clone and Navigate

```bash
cd swasthfirst-backend
```

### 2. Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Setup

Create a PostgreSQL database:

```bash
# Using psql
createdb swasthfirst

# Or using SQL
psql -U postgres
CREATE DATABASE swasthfirst;
\q
```

### 5. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/swasthfirst
SECRET_KEY=<generate-with-openssl-rand-hex-32>
CORS_ORIGINS=http://localhost:3000
```

**Generate a secure secret key:**

```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### 6. Seed Database

Run the seed script to create tables and add initial data:

```bash
python seed_data.py
```

This creates:
- 15 menu items (juices, detox waters, salads)
- 1 superadmin account (swasthAdmin / Admin@1234)
- 3 sample customer accounts for testing

## 🏃 Running the Server

### Development Mode

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs (Swagger UI)
- **ReDoc**: http://localhost:8000/redoc

### Production Mode

```bash
# Set environment to production
# In .env: ENV=production

uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Quick Endpoint Overview

#### Authentication (`/api/v1/auth`)
- `POST /auth/login` - Customer login
- `GET /auth/me` - Get current customer profile
- `POST /auth/update-goal` - Update health goal

#### Menu (`/api/v1/menu`)
- `GET /menu` - Get all available items
- `GET /menu/categories` - Get items grouped by category
- `GET /menu/{item_id}` - Get single item details

#### Orders (`/api/v1/orders`)
- `POST /orders` - Create new order
- `GET /orders/my-orders` - Get customer's order history
- `GET /orders/{order_id}` - Get order details

#### Admin (`/api/v1/admin`)
- `POST /admin/login` - Admin login
- `GET /admin/customers` - List customers with stats
- `POST /admin/customers` - Create customer (superadmin only)
- `GET /admin/orders` - List orders with filters
- `PATCH /admin/orders/{order_id}/status` - Update order status
- `GET /admin/analytics` - Dashboard analytics
- `GET /admin/export-orders` - Export orders to CSV

## 🔐 Test Accounts

### Admin Account
```
Username: swasthAdmin
Password: Admin@1234
```

### Customer Accounts (phone = password)
```
Name: Priya Sharma
Phone: 9876543210

Name: Rohit Mehta
Phone: 9123456789

Name: Ananya Joshi
Phone: 9988776655
```

## 🗃️ Database Migrations (Alembic)

For production database changes, use Alembic migrations:

### Initialize Alembic (first time only)

```bash
alembic init alembic
```

### Create Migration

```bash
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
alembic upgrade head
```

### View Migration History

```bash
alembic history
alembic current
```

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Customer login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"Priya Sharma","phone":"9876543210"}'

# Get menu (no auth required)
curl http://localhost:8000/api/v1/menu

# Create order (requires auth token)
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"item_id":1,"quantity":2}]}'
```

## 📁 Project Structure

```
swasthfirst-backend/
├── main.py                 # FastAPI application entry point
├── database.py             # SQLAlchemy async engine and session
├── models.py               # ORM models (Customer, Order, Admin, MenuItem)
├── schemas.py              # Pydantic request/response schemas
├── auth.py                 # JWT utilities and authentication
├── routers/                # API route handlers
│   ├── auth.py            # Customer authentication
│   ├── menu.py            # Menu catalog
│   ├── orders.py          # Order management
│   └── admin.py           # Admin dashboard
├── services/               # Business logic layer
│   ├── auth_service.py    # Auth business logic
│   ├── order_service.py   # Order business logic
│   └── admin_service.py   # Admin business logic
├── middleware/             # Custom middleware
│   └── rate_limiter.py    # Rate limiting for login endpoints
├── utils/                  # Utility functions
│   └── csv_export.py      # CSV export helpers
├── seed_data.py           # Database seeding script
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
└── README.md             # This file
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth with configurable expiration
- **Password Hashing**: bcrypt for all passwords
- **Rate Limiting**: 5 login attempts per phone/IP per 15 minutes
- **CORS Configuration**: Restricted origins (no wildcards in production)
- **Input Validation**: Pydantic schemas validate all inputs
- **SQL Injection Protection**: Parameterized queries via SQLAlchemy
- **Role-Based Access Control**: Separate customer and admin roles

## 🚀 Deployment

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)

1. Install Python, PostgreSQL, and nginx
2. Clone repository and install dependencies
3. Set up systemd service for uvicorn
4. Configure nginx as reverse proxy
5. Set up SSL with Let's Encrypt

### Option 2: Docker

(Docker support coming soon - see TODO comments in code)

### Option 3: Platform-as-a-Service (Render, Railway, Heroku)

1. Connect GitHub repository
2. Set environment variables
3. Platform auto-deploys on git push

## 📊 Performance Considerations

- **Connection Pooling**: Configured for 10 base + 20 overflow connections
- **Async Everything**: Fully async database operations
- **Query Optimization**: Proper indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U postgres -d swasthfirst -c "SELECT 1;"

# Check if database exists
psql -U postgres -l | grep swasthfirst
```

### Import Errors

```bash
# Ensure virtual environment is activated
# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

## 📝 TODO / Future Enhancements

- [ ] Add refresh token endpoint
- [ ] Add SMS OTP verification
- [ ] Add WebSocket for real-time order updates
- [ ] Add multi-outlet support
- [ ] Add order time estimation
- [ ] Add customer loyalty program
- [ ] Add payment gateway integration
- [ ] Add delivery management
- [ ] Add inventory tracking
- [ ] Add automated email/SMS notifications

## 📄 License

Proprietary - SwasthFirst © 2026

## 👥 Support

For issues or questions, contact: support@swasthfirst.com

---

**Built with ❤️ for healthy living**
