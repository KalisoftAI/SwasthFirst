# 🍽️ Swasth Cafe - WhatsApp First Order Agent

A complete enterprise-grade WhatsApp Order Management System for cafe operations. Customers receive a daily menu at 9 AM, reply with item numbers, and the system processes multi-item orders in real-time with a modern React dashboard.

**Database**: PostgreSQL | **Backend**: Node.js + Express + Baileys | **Frontend**: React 18 + Tailwind CSS | **Real-time**: Socket.io

## 🎯 Key Features

✅ **WhatsApp Integration via Baileys** - QR code authentication with auto-reconnection  
✅ **Intelligent Order Flow** - 3-state machine (item selection → quantity input → confirmation)  
✅ **Phone Number Normalization** - Handles all WhatsApp JID formats (@lid, @s.whatsapp.net, @g.us)  
✅ **Customer Data Fetching** - All order data pulled from PostgreSQL database, not WhatsApp  
✅ **Daily Menu Broadcast** - Cron job sends menu at 9:00 AM to all registered customers  
✅ **Time-Based Order Acceptance** - Orders accepted 9 AM - 8 PM, auto-rejected after  
✅ **Multi-Item Orders** - Customers can add multiple items with quantities in one order  
✅ **Real-time Dashboard** - Live order updates via Socket.io  
✅ **CSV Export** - One-click export of all orders with timestamps (IST)  
✅ **Customer Management** - Add, view, and delete customers with addresses  
✅ **Database Auto-Setup** - PostgreSQL tables created automatically on first run  
✅ **Beautiful React UI** - 4-tab dashboard with responsive design

## 📁 Project Structure

```
swasth-order-agent/
├── backend/
│   ├── server.js                    # Main WhatsApp engine (1000+ lines)
│   ├── package.json                 # Dependencies: Baileys, Express, pg, Socket.io
│   ├── .env                         # PostgreSQL config, ports
│   ├── .gitignore
│   ├── auth/                        # WhatsApp session storage (auto-created)
│   ├── customers.json               # Sample customer data
│   ├── orders.csv                   # Order export file (auto-created)
│   └── run-setup.js                 # Optional database setup script (not needed)
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                   # Main component (4-tab navigation)
│   │   ├── App.css                  # Styling
│   │   ├── index.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── QRScanner.js         # WhatsApp QR code display & connection status
│   │       ├── Dashboard.js         # Order stats, customer count, export button
│   │       ├── OrdersList.js        # View/delete orders, order details
│   │       └── CustomerManagement.js # Add/delete customers, customer list
│   ├── package.json
│   ├── .gitignore
│   └── ...
├── Documentation/
│   ├── README.md                    # This file
│   ├── QUICKSTART.md                # 5-minute setup guide
│   ├── DATABASE_MIGRATION.md        # SQLite to PostgreSQL migration
│   ├── SETUP.md                     # Detailed setup instructions
│   └── ...
└── .git/
```

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- **Node.js** v14+ (download from https://nodejs.org)
- **PostgreSQL** 12+ (download from https://www.postgresql.org/download)
- npm (comes with Node.js)

### Step 1: PostgreSQL Database Setup

```bash
# Create PostgreSQL user and database
psql -U postgres -c "CREATE USER swasth WITH PASSWORD 'password';"
psql -U postgres -c "CREATE DATABASE swasth_cafe OWNER swasth;"
```

**✅ Note:** Your `server.js` **automatically creates all tables** when it starts. No manual SQL needed.

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the server (development mode with nodemon)
npm run dev
```

**Expected Output:**
```
✅ PostgreSQL connection established
✅ Customers table ready
✅ Orders table ready
✅ Menu table ready
✅ Database indexes created
📊 PostgreSQL database initialized successfully
✅ ✅ ✅ WhatsApp Connected Successfully! ✅ ✅ ✅
```

The backend runs on **`http://localhost:3001`**

### Step 3: Frontend Setup (New Terminal)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React app
npm start
```

The frontend automatically opens at **`http://localhost:3000`**

### Step 4: Connect WhatsApp

1. Open **`http://localhost:3000`** in your browser
2. Go to the **QR Scanner** tab
3. You'll see a QR code
4. Open **WhatsApp** on your phone → **Settings** → **Linked Devices** → **Link a Device**
5. **Scan the QR code** with your phone camera
6. ✅ WhatsApp is now connected!

## 📱 How to Use

### 1️⃣ Add Customers (Pre-registration Required)

Go to **Customers** tab in dashboard:
- Enter phone number: `919656898754` (Include country code 91)
- Enter customer name: `Raj Kumar`
- Enter address: `123 Main St, Mumbai`
- Click **Add Customer**

Customers must be pre-registered to place orders.

### 2️⃣ Daily Menu Broadcast (Automatic at 9 AM)

Every day at **9:00 AM IST**, all customers receive:

```
🍽️ *SWASTH CAFE MENU* 🍽️

*🥤 JUICES*
1️⃣ Amla juice – 25/-
2️⃣ Beetroot juice – 25/-
3️⃣ Carrot juice – 25/-
4️⃣ Karela juice – 25/-
5️⃣ Palak juice – 25/-
6️⃣ Ash gourd juice – 25/-

*🥛 MIX JUICES*
7️⃣ ABC Juice – 25/-
8️⃣ Amla + Karela juice – 25/-
9️⃣ Beetroot + Carrot juice – 25/-
🔟 Amla + Palak – 25/-

*💧 DETOX WATERS*
1️⃣1️⃣ Liver cleanser detox – 10/-
1️⃣2️⃣ Beauty boost detox – 15/-
1️⃣3️⃣ Digestive boost kanji water – 15/-

*🥗 SALADS*
1️⃣4️⃣ Mix sprouts salad – 40/-
1️⃣5️⃣ Paneer + sprout salad – 85/-
```

### 3️⃣ Ordering Hours (9 AM - 8 PM IST - ✅ ACTIVE)

Orders are **ONLY accepted between 9:00 AM and 7:59 PM IST**. Customers cannot place orders:
- ❌ **Before 9:00 AM** → System shows: "Ordering opens at 9:00 AM daily"
- ❌ **After 8:00 PM** → System shows: "Swasth Cafe is Closed. See you tomorrow! 🌅"

This ensures kitchen staff works within designated hours. To customize ordering hours, edit `ORDERING_CONFIG` in `server.js` (lines 417-420).

### 4️⃣ Customer Places Order

Customer replies with item numbers:
```
1,3,5,12
```

**System asks:** "Now, please reply with quantities for each item"

Customer replies:
```
2,1,3,1
```

**Item Selection:** 
- 1x Amla juice (qty 2) = ₹50
- 3x Carrot juice (qty 1) = ₹25
- 5x Palak juice (qty 3) = ₹75
- 12x Beauty boost detox (qty 1) = ₹15
- **Total: ₹165**

**System asks:** "Do you want to order more items?"

If **Yes**: Show menu again, can add more items  
If **No**: Show order summary and UPI number for payment

### 5️⃣ Order Confirmation

Customer receives:
```
✅ *ORDER CONFIRMED!*

📦 *Items:*
Amla juice x2 = ₹50
Carrot juice x1 = ₹25
Palak juice x3 = ₹75
Beauty boost detox x1 = ₹15

💰 *Total: ₹165*

💳 *Payment Details:*
Pay UPI Number - *9373332785*

Thank you for your order! 🙏
```

Order automatically saved to:
- ✅ PostgreSQL database
- ✅ CSV file (orders.csv)
- ✅ Real-time dashboard

### 6️⃣ View Orders in Dashboard

Go to **Orders** tab:
- See all orders with timestamps (IST)
- Customer name, phone, items, total price
- Status: pending/confirmed
- Click delete to remove
- Export as CSV

### 7️⃣ Dashboard Stats

**Dashboard** tab shows:
- 📊 Total orders count
- 👥 Active customers count
- ✅ Connection status (Online/Offline)  
- 📥 Recent orders
- 📥 Quick export button

## 🍹 Complete Menu (15 Items)

### 🥤 Juices (₹25 each)
| # | Item | Price |
|---|------|-------|
| 1 | Amla juice | ₹25 |
| 2 | Beetroot juice | ₹25 |
| 3 | Carrot juice | ₹25 |
| 4 | Karela juice | ₹25 |
| 5 | Palak juice | ₹25 |
| 6 | Ash gourd juice | ₹25 |

### 🥛 Mix Juices (₹25 each)
| # | Item | Price |
|---|------|-------|
| 7 | ABC Juice | ₹25 |
| 8 | Amla + Karela juice | ₹25 |
| 9 | Beetroot + Carrot juice | ₹25 |
| 10 | Amla + Palak | ₹25 |

### 💧 Detox Waters
| # | Item | Price |
|---|------|-------|
| 11 | Liver cleanser detox | ₹10 |
| 12 | Beauty boost detox | ₹15 |
| 13 | Digestive boost kanji water | ₹15 |

### 🥗 Salads
| # | Item | Price |
|---|------|-------|
| 14 | Mix sprouts salad | ₹40 |
| 15 | Paneer + sprout salad | ₹85 |

**To customize the menu**, edit the `COMPLETE_MENU` object in `backend/server.js` (lines 35-48)

## � Sample Customers

The `backend/customers.json` includes pre-configured customers:

```json
[
  { "phone": "919876543210", "name": "Raj Kumar" },
  { "phone": "919876543211", "name": "Priya Singh" },
  { "phone": "919876543212", "name": "Amit Patel" }
]
```

You can:
- ✅ Add customers via dashboard (Customers tab)
- ✅ Add customers via API (POST /api/customers)
- ✅ Edit phone/name in the database directly
- ✅ Delete customers from dashboard

## 🔌 API Endpoints (22 Total)

### Status & Connection
- **GET** `/api/status` - WhatsApp connection status + QR code
  ```json
  { "status": "connected", "qrCode": null }
  ```

### Orders (CRUD + Export)
- **GET** `/api/orders` - Get all orders (with items as JSONB/string)
- **GET** `/api/orders/export` - Download orders as CSV file
- **POST** `/api/orders` - Create new order (from WhatsApp, not manual)
- **DELETE** `/api/orders/:id` - Delete order by ID
- **PATCH** `/api/orders/:id` - Update order status
- **GET** `/api/orders/stats` - Order statistics

### Customers (CRUD)
- **GET** `/api/customers` - Get all customers
  ```json
  [
    { "id": 1, "phone": "919876543210", "name": "Raj Kumar", "address": "123 Main St", "created_at": "2024-02-27..." }
  ]
  ```
- **POST** `/api/customers` - Add new customer
  ```json
  { "phone": "919876543210", "name": "Customer Name", "address": "Address" }
  ```
- **DELETE** `/api/customers/:phone` - Delete customer by phone
- **PATCH** `/api/customers/:phone` - Update customer details
- **GET** `/api/customers/stats` - Customer statistics

### Menu
- **GET** `/api/menu` - Get all menu items (15 items)
  ```json
  [
    { "id": 1, "name": "Amla juice", "price": 25, "category": "Juice" }
  ]
  ```
- **GET** `/api/menu/category/:category` - Get items by category
- **GET** `/api/menu/:id` - Get single menu item
- **GET** `/api/menu/formatted-text` - Get menu as formatted text message

## 🔧 Configuration (.env)

Edit `backend/.env` to customize:

```env
# ========================
# FRONTEND & BACKEND URLs
# ========================
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# ========================
# POSTGRESQL DATABASE
# ========================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swasth_cafe
DB_USER=swasth
DB_PASSWORD=password

# ========================
# SERVER CONFIG
# ========================
PORT=3001
NODE_ENV=development
```

### Order Flow Configuration (Edit in server.js)

```javascript
// Line 417-420: Customize order timing
const ORDERING_CONFIG = {
  startTime: 9,    // 9:00 AM - start accepting orders
  endTime: 20,     // 8:00 PM (20:00) - stop accepting orders
  timezone: 'IST'
};

// Line 422-424: Time validation (ENABLED - Orders rejected after 8 PM)
const isOrderingAllowed = () => {
  const currentHour = new Date().getHours();
  return currentHour >= ORDERING_CONFIG.startTime && currentHour < ORDERING_CONFIG.endTime;
};

// Line 1226: Daily menu broadcast (9 AM every day)
cron.schedule('0 9 * * *', async () => {  // 0 9 = 09:00 AM daily
  // Broadcasts menu to all customers with 500ms delay between messages
});

// Change UPI number in confirmation message (find & replace the number)
var confirmationMessage = `... Pay UPI Number - *9373332785*`;
```

### Menu Configuration (Edit in server.js)

Edit `COMPLETE_MENU` object (lines 35-48) to add/remove/modify items:

```javascript
const COMPLETE_MENU = {
  1: { id: 1, name: 'Item Name', price: 25, category: 'Juice' },
  // ... Add more items
};
```

## 📦 Dependencies

### Backend (Node.js)
| Package | Version | Purpose |
|---------|---------|---------|
| **express** | 4.18.2 | Web framework |
| **@whiskeysockets/baileys** | 6.6.0 | WhatsApp API |
| **socket.io** | 4.5.4 | Real-time communication |
| **pg** | 8.10.0 | PostgreSQL driver |
| **node-cron** | 3.0.2 | Scheduled tasks (9 AM broadcast) |
| **qrcode** | 1.5.3 | QR code generation |
| **pino** | 8.14.1 | Logging |
| **cors** | 2.8.5 | Cross-origin requests |
| **dotenv** | 16.0.3 | Environment variables |
| **fast-csv** | 4.3.6 | CSV export |
| **nodemon** | 2.0.20 | Dev auto-reload |

### Frontend (React)
| Package | Version | Purpose |
|---------|---------|---------|
| **react** | 18.2.0 | UI library |
| **react-dom** | 18.2.0 | DOM rendering |
| **socket.io-client** | 4.5.4 | Real-time updates |
| **axios** | 1.4.0 | HTTP requests |
| **react-scripts** | 5.0.1 | Create React App scripts |

### Database
| Software | Role |
|----------|------|
| **PostgreSQL 12+** | Primary database (5 tables) |

Install all with:
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

## 🐛 Troubleshooting

### ❌ PostgreSQL Connection Error: "ECONNREFUSED localhost:5432"
**Solution:**
- ✅ Ensure PostgreSQL is running: `pg_ctl status` or check Services
- ✅ Verify credentials in `.env` match your setup
- ✅ Create database: `createdb swasth_cafe -U swasth`
- ✅ Restart PostgreSQL service

### ❌ "Port 3001 already in use"
**Solution:**
```bash
# Windows: Kill process on port
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change PORT in .env to 3002, 3003, etc.
```

### ❌ WhatsApp QR Code Not Showing
**Solution:**
- ✅ Make sure **both** backend and frontend are running
- ✅ Check browser console (F12) for errors
- ✅ Clear browser cache and refresh (`Ctrl+Shift+Del`)
- ✅ Verify Socket.io connection in Network tab
- ✅ Try scanning from different browser/device

### ❌ "Tables already exist" Error
**Solution:**
- ✅ This is **OK** - it means tables already exist
- ✅ The code uses `CREATE TABLE IF NOT EXISTS`
- ✅ No error, just skip and continue using the app

### ❌ Orders Not Saving to Database
**Solution:**
- ✅ Check PostgreSQL is running: `psql -U swasth -d swasth_cafe`
- ✅ Verify tables exist: `\dt` in psql
- ✅ Check console logs for error messages
- ✅ Ensure customer is pre-registered (required)
- ✅ Verify phone number format (include 91 for India)

### ❌ Menu Not Broadcasting at 9 AM
**Solution:**
- ✅ Keep backend running 24/7 (cron only works if server is running)
- ✅ Check system time matches IST (UTC+5:30)
- ✅ Look for console logs: "📢 Broadcasting menu at 9 AM..."
- ✅ Change cron timing in `server.js` line 1226: `cron.schedule('0 9 * * *',...)`

### ❌ WhatsApp Connection Drops/Reconnects
**Solution:**
- ✅ Auto-reconnection enabled (built-in retry logic)
- ✅ Check internet connection
- ✅ WhatsApp on phone must stay connected
- ✅ Restart backend: `npm run dev`

### ❌ Customer Not Found When Ordering
**Solution:**
- ✅ **Pre-register customer first** in Customers tab
- ✅ Use exact phone: with country code (e.g., 919876543210)
- ✅ System normalizes phone numbers (removes @lid, @s.whatsapp.net)
- ✅ Check database: `psql -c "SELECT * FROM customers;"`

### ❌ CSV Export Shows "Customer" Instead of Name
**Solution:**
- ✅ This means customer wasn't pre-registered
- ✅ Always add customers to database BEFORE they order
- ✅ The app fetches name from PostgreSQL, not WhatsApp
- ✅ Check orders table: `SELECT * FROM orders;`

### ❌ Frontend Shows "Connection error"
**Solution:**
- ✅ Check backend is running on port 3001
- ✅ Verify CORS settings in backend
- ✅ Check browser console (F12) → Network tab
- ✅ Ensure Socket.io URL is correct: `http://localhost:3001`

### ✅ Enable Debug Logging
View detailed logs by adding in `server.js`:
```javascript
console.log(`🔍 [DEBUG] Customer: ${customerDetails.name}`);
console.log(`📝 [DEBUG] Phone normalized: ${normalizedPhone}`);
console.log(`📦 [DEBUG] Items: ${JSON.stringify(cart)}`);
```

### 📋 Check System Logs
```bash
# Backend logs
npm run dev  # Shows all console.log output

# Frontend logs
Press F12 → Console tab → Check for errors

# Database logs
psql -U swasth -d swasth_cafe -c "SELECT * FROM orders;"
```

## 🔄 Order Processing Flow

### State Machine (3 States)

```
Customer sends message
        ↓
┌─────────────────────────────────────┐
│ State 1: AWAITING_ITEMS             │
│ System shows menu                   │
│ Customer replies: "1,3,5,12"        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ State 2: AWAITING_QUANTITY          │
│ System asks: Quantities?            │
│ Customer replies: "2,1,3,1"         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ State 3: AWAITING_MORE              │
│ System shows cart total             │
│ Customer replies: "Yes" or "No"     │
│                                     │
│ If YES → Back to State 1            │
│ If NO → Save order & Clear session  │
└─────────────────────────────────────┘
```

### Data Flow

```
WhatsApp Message (919876543210@lid)
          ↓
normalizePhone() → "919876543210"
          ↓
getCustomerDetails() → Query PostgreSQL
          ↓
Fetch {name, phone, address} from customers table
          ↓
Process order with DATABASE DATA (not WhatsApp)
          ↓
├─→ INSERT into orders table ✅
├─→ APPEND to orders.csv ✅
├─→ Emit 'newOrder' to dashboard ✅
└─→ Send confirmation to customer ✅
```

### Phone Normalization

WhatsApp provides numbers in JID format:
```
919656898754@lid
919656898754@s.whatsapp.net
919656898754@g.us
```

System normalizes to:
```
919656898754  ← Stored in database
```

### Timestamp Handling

All timestamps converted to **IST (UTC+5:30)**:
```
2024-02-27 14:30:00 IST  ← User sees this
2024-02-27T09:00:00Z     ← Stored in database (UTC)
```

Function: `getISTTimestamp()` at line 174

## 💾 Database Schema

### PostgreSQL Tables (Auto-Created)

#### 1️⃣ **customers** Table
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,     -- "919876543210" (normalized)
  name VARCHAR(255) NOT NULL,             -- "Raj Kumar"
  address TEXT,                           -- "123 Main St, Mumbai"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2️⃣ **orders** Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,           -- IST formatted
  name VARCHAR(255) NOT NULL,             -- From customers table
  phone VARCHAR(20) NOT NULL,             -- From customers table (normalized)
  items JSONB NOT NULL,                   -- [{id,name,price,qty,lineTotal}...]
  total_price DECIMAL(10,2) NOT NULL,     -- ₹165.00
  status VARCHAR(50) DEFAULT 'pending',   -- pending/confirmed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Example Order Items (JSONB):
```json
[
  { "id": 1, "name": "Amla juice", "price": 25, "quantity": 2, "lineTotal": 50 },
  { "id": 3, "name": "Carrot juice", "price": 25, "quantity": 1, "lineTotal": 25 },
  { "id": 12, "name": "Beauty boost detox", "price": 15, "quantity": 1, "lineTotal": 15 }
]
```

#### 3️⃣ **menu** Table
```sql
CREATE TABLE menu (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL,               -- 1-15
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,         -- "Juice", "Detox waters", "Salads"
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_orders_timestamp ON orders(timestamp DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_phone ON orders(phone);
```

### Query Examples
```bash
# Connect to database
psql -U swasth -d swasth_cafe

# View all customers
SELECT * FROM customers;

# View all orders
SELECT * FROM orders;

# View total orders today
SELECT COUNT(*) FROM orders 
WHERE DATE(timestamp) = CURRENT_DATE;

# View total revenue
SELECT SUM(total_price) FROM orders 
WHERE DATE(timestamp) = CURRENT_DATE;
```

## 📡 Real-time Events (Socket.io)

### Frontend Listens To
| Event | Payload | Purpose |
|-------|---------|---------|
| `connectionStatus` | `{status: "connected"\|"disconnected"}` | WhatsApp connection state |
| `qrCode` | `<SVG DataURL>` | QR code for scanning |
| `newOrder` | `{timestamp, name, phone, items, total}` | New order received |
| `broadcast_sent` | `{success: true, count: 5}` | Menu broadcast done |
| `broadcast_failed` | `{error: "..."}` | Broadcast error |

### Example Socket.io Listener (frontend)
```javascript
const socket = io('http://localhost:3001');

socket.on('connectionStatus', (data) => {
  console.log('WhatsApp:', data.status);  // "connected" or "disconnected"
});

socket.on('newOrder', (order) => {
  console.log('New order:', order.name, '₹' + order.total);
  //  Update dashboard in real-time
});

socket.on('qrCode', (qrDataUrl) => {
  // Display QR code for scanning
});
```

## 📚 Key Code Locations

| Feature | Location | Line |
|---------|----------|------|
| Phone normalization | `server.js` | 187 |
| Customer lookup | `server.js` | 218 |
| Order state machine | `server.js` | 645 |
| Item selection handler | `server.js` | 375 |
| Quantity input handler | `server.js` | 420 |
| Order final handler | `server.js` | 492 |
| IST timestamp | `server.js` | 174 |
| Menu definition | `server.js` | 35 |
| Cron job (9 AM) | `server.js` | 565 |
| PostgreSQL setup | `server.js` | 116 |

## 🚀 Production Considerations

### Before Going Live

- [ ] Change default PostgreSQL password from `password`
- [ ] Update UPI number in order confirmation message
- [ ] Configure proper domain in CORS settings
- [ ] Set `NODE_ENV=production` in .env
- [ ] Use environment variable for DATABASE credentials
- [ ] Setup proper logging (Pino is configured)
- [ ] Configure SSL/HTTPS for production
- [ ] Setup database backups
- [ ] Configure firewall rules
- [ ] Setup monitoring and alerts
- [ ] Test menu broadcast with all customers
- [ ] Verify phone number normalization logic
- [ ] **✅ Verify ordering time cutoff** is set correctly (9 AM - 8 PM IST)
- [ ] **✅ Test that orders are rejected after 8 PM**

### Deployment Options

- **VPS** (AWS, DigitalOcean, Linode) - Best for production
- **Docker** - Containerize for easy deployment
- **Heroku** - Simple but limited free tier
- **Railway** - Modern alternative to Heroku
- **CapRover** - Self-hosted with Docker

## 📞 Support & Contributions

For issues:
1. Check the **Troubleshooting** section above
2. Review console logs (both terminal and F12)
3. Check if PostgreSQL is running
4. Verify WhatsApp connection in dashboard
5. Test API endpoints with Postman

## 📄 License & Credits

**Open Source** - Feel free to use, modify, and distribute!

Built with ❤️ using Baileys, Express, React, and PostgreSQL.

---

**Made for Swasth Cafe - March 2026** 🍹
- ✅ This means customer wasn't pre-registered
- ✅ Always add customers to database BEFORE they order
- ✅ The app fetches name from PostgreSQL, not WhatsApp
- ✅ Check orders table: `SELECT * FROM orders;`

### ❌ Frontend Shows "Connection error"
**Solution:**
- ✅ Check backend is running on port 3001
- ✅ Verify CORS settings in backend
- ✅ Check browser console (F12) → Network tab
- ✅ Ensure Socket.io URL is correct: `http://localhost:3001`

### ✅ Enable Debug Logging
View detailed logs by adding in `server.js`:
```javascript
console.log(`🔍 [DEBUG] Customer: ${customerDetails.name}`);
console.log(`📝 [DEBUG] Phone normalized: ${normalizedPhone}`);
console.log(`📦 [DEBUG] Items: ${JSON.stringify(cart)}`);
```

### 📋 Check System Logs
```bash
# Backend logs
npm run dev  # Shows all console.log output

# Frontend logs
Press F12 → Console tab → Check for errors

# Database logs
psql -U swasth -d swasth_cafe -c "SELECT * FROM orders;"
```

## 🔄 Order Processing Flow

### State Machine (3 States)

```
Customer sends message
        ↓
┌─────────────────────────────────────┐
│ State 1: AWAITING_ITEMS             │
│ System shows menu                   │
│ Customer replies: "1,3,5,12"        │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ State 2: AWAITING_QUANTITY          │
│ System asks: Quantities?            │
│ Customer replies: "2,1,3,1"         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ State 3: AWAITING_MORE              │
│ System shows cart total             │
│ Customer replies: "Yes" or "No"     │
│                                     │
│ If YES → Back to State 1            │
│ If NO → Save order & Clear session  │
└─────────────────────────────────────┘
```

### Data Flow

```
WhatsApp Message (919876543210@lid)
          ↓
normalizePhone() → "919876543210"
          ↓
getCustomerDetails() → Query PostgreSQL
          ↓
Fetch {name, phone, address} from customers table
          ↓
Process order with DATABASE DATA (not WhatsApp)
          ↓
├─→ INSERT into orders table ✅
├─→ APPEND to orders.csv ✅
├─→ Emit 'newOrder' to dashboard ✅
└─→ Send confirmation to customer ✅
```

### Phone Normalization

WhatsApp provides numbers in JID format:
```
919656898754@lid
919656898754@s.whatsapp.net
919656898754@g.us
```

System normalizes to:
```
919656898754  ← Stored in database
```

### Timestamp Handling

All timestamps converted to **IST (UTC+5:30)**:
```
2024-02-27 14:30:00 IST  ← User sees this
2024-02-27T09:00:00Z     ← Stored in database (UTC)
```

Function: `getISTTimestamp()` at line 174

## 📞 Support

For issues or questions:
1. Check the console logs (both terminal and browser)
2. Verify all ports are available
3. Ensure all npm packages are installed
4. Try restarting both backend and frontend servers

## 📄 License

Open source - Feel free to use and modify!

---

**Happy ordering! 🎉**
