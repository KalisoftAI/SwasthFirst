# 🚀 Swasth Order Agent - Complete Setup & Run Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Issues Fixed](#issues-fixed)
4. [Installation Steps](#installation-steps)
5. [Running the Project](#running-the-project)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ **Required Software:**
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) - Verify with: `npm --version`
- **Git** (optional, for version control)

✅ **Verify Installation:**
```powershell
node --version
npm --version
```

---

## Project Overview

### Architecture
```
Frontend (React)              Backend (Node.js/Express)
   ↓                              ↓
- React 18.2.0                - Express.js
- Socket.io-client            - Socket.io Server
- Axios (HTTP)                - Baileys (WhatsApp)
- Tailwind CSS                - SQLite Database
- DaisyUI                      - Fast-CSV
                              - Node-Cron
```

### Real-time Flow
1. **Frontend** connects to backend via Socket.io
2. **Backend** receives WhatsApp messages
3. **Messages processed** and orders saved to database
4. **Real-time updates** pushed to frontend via Socket.io
5. **Daily 9 AM broadcast** sends menu to all customers

---

## Issues Fixed

### ✅ Backend Fixes (server.js)
1. **Fixed socket.io handler indentation** - Proper closure braces for event listeners
2. **Fixed cron job error handling** - Now checks if WhatsApp is connected before sending
3. **Added null checks** - Prevents crashes when socket/sock is undefined
4. **Improved message handler** - Better error handling for WhatsApp message processing
5. **Added status code to orders** - Database schema now includes 'pending' status
6. **Fixed CSV export endpoint** - Added comprehensive error handling
7. **Enhanced CORS configuration** - Uses environment variables for flexibility

### ✅ Frontend Fixes (App.js)
1. **Made API URL configurable** - Uses `REACT_APP_API_URL` environment variable
2. **Added error handling** - Proper try-catch in all API calls
3. **Added socket.io error listeners** - Handles connection failures gracefully
4. **Added error display in UI** - Shows user-friendly error messages with retry options
5. **Improved socket.io configuration** - Added reconnection settings
6. **Added timeout to API calls** - Prevents hanging requests
7. **Added error state management** - Tracks and displays errors

### ✅ Configuration Fixes
1. **Created frontend `.env` file** - Configurable API URL for different environments
2. **Updated backend `.env`** - Now includes BACKEND_URL and FRONTEND_URL
3. **Fixed body-parser limits** - Increased to 10MB for larger CSV files
4. **Updated .gitignore** - Properly excludes .env files in frontend

---

## Installation Steps

### Step 1: Install Backend Dependencies

```powershell
# Navigate to backend directory
cd c:\Swasth_order_agent\backend

# Install all dependencies
npm install

# Verify installation
npm list
```

**Expected Packages:**
- @whiskeysockets/baileys (WhatsApp)
- express (Web server)
- socket.io (Real-time)
- sqlite3 (Database)
- fast-csv (CSV export)
- qrcode (QR code generation)
- node-cron (Scheduled tasks)
- dotenv (Environment variables)

### Step 2: Install Frontend Dependencies

```powershell
# Navigate to frontend directory (in a NEW terminal)
cd c:\Swasth_order_agent\frontend

# Install all dependencies
npm install

# Verify installation
npm list
```

**Expected Packages:**
- react & react-dom
- socket.io-client (Real-time client)
- axios (HTTP requests)
- react-scripts (Build tools)

### Step 3: Verify Configuration Files

**Backend (.env):**
```powershell
# Check backend/.env
Get-Content c:\Swasth_order_agent\backend\.env
```

Expected content:
```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

**Frontend (.env):**
```powershell
# Check frontend/.env
Get-Content c:\Swasth_order_agent\frontend\.env
```

Expected content:
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ENVIRONMENT=development
```

---

## Running the Project

### Option 1: Run Both in Same Terminal (Sequential)

```powershell
# Terminal 1 - Start Backend
cd c:\Swasth_order_agent\backend
npm run dev

# Wait for "✅ Backend running on http://localhost:3001" message
# Then in another terminal:

# Terminal 2 - Start Frontend
cd c:\Swasth_order_agent\frontend
npm start

# Frontend opens at http://localhost:3000 automatically
```

### Option 2: Run in Multiple Terminals (Recommended)

**Terminal 1 - Backend:**
```powershell
cd c:\Swasth_order_agent\backend
npm run dev
```

**Shows messages like:**
```
═══════════════════════════════════════════════
🍽️  SWASTH ORDER AGENT - Server Started
═══════════════════════════════════════════════
✅ Backend running on http://localhost:3001
📱 Frontend: http://localhost:3000

🔄 Initializing WhatsApp Connection...
```

**Terminal 2 - Frontend (in new PowerShell window):**
```powershell
cd c:\Swasth_order_agent\frontend
npm start
```

**Shows messages like:**
```
Compiled successfully!

You can now view swasth-order-agent-frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.x.x.x:3000

Note that the development build is not optimized.
```

---

## Testing the System

### ✅ Step 1: Check Backend Health

```powershell
# Test if backend is running
Invoke-WebRequest http://localhost:3001/api/status | ConvertTo-Json
```

Expected response:
```json
{
  "status": "disconnected",
  "qrCode": null
}
```

### ✅ Step 2: Check Frontend Connection

Open browser: `http://localhost:3000`

You should see:
- 🍽️ Swasth Order Agent header
- ❌ WhatsApp Disconnected status
- Loading spinner for QR code

### ✅ Step 3: Connect WhatsApp

1. **Terminal should show:**
   ```
   📱 Setting up WhatsApp connection...
   🔐 QR CODE GENERATED
   ```

2. **Frontend shows QR code**

3. **Scan with WhatsApp on phone:**
   - Open WhatsApp
   - Settings → Linked Devices → Link a Device
   - Point phone at QR code on screen

4. **After scanning:**
   - Status changes to ✅ Connected
   - Terminal shows: `✅ ✅ ✅ WhatsApp Connected Successfully! ✅ ✅ ✅`

### ✅ Step 4: Test Sending Message

From a WhatsApp contact (must be in customers.json):
```
Send: 1
Expected: ✅ Thank you! Your order for Juice ₹60 has been received.
```

### ✅ Step 5: Check Dashboard

The orders should appear in:
- **Real-time** on Dashboard tab
- **List view** on Orders tab
- **Database** as confirmed status

---

## Troubleshooting

### ❌ Backend Won't Start

**Error:** `Error: EADDRINUSE: address already in use :::3001`

**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or use different port (edit .env)
```

### ❌ Frontend Can't Connect to Backend

**Error:** `Failed to connect to backend. Make sure it's running on port 3001.`

**Solutions:**
1. Verify backend is running: `http://localhost:3001/api/status`
2. Check .env file: `REACT_APP_API_URL=http://localhost:3001`
3. Restart frontend: `npm start`

### ❌ WhatsApp QR Code Not Appearing

**Possible causes:**
1. Backend not properly initialized
2. `auth/` folder permissions issue
3. Baileys dependency issue

**Solution:**
```powershell
# Delete auth folder (will regenerate)
Remove-Item c:\Swasth_order_agent\backend\auth -Recurse -Force

# Reinstall Baileys
cd c:\Swasth_order_agent\backend
npm install @whiskeysockets/baileys

# Restart backend
npm run dev
```

### ❌ Database Errors

**Error:** `❌ Orders table error`

**Solution:**
```powershell
# Delete database and restart (will recreate)
Remove-Item c:\Swasth_order_agent\backend\database.db -Force

# Restart backend
cd c:\Swasth_order_agent\backend
npm run dev
```

### ❌ Port 3000 Already in Use

**Error:** `Something is already running on port 3000`

**Solution:**
```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F

# Or update frontend package.json to use different port (if needed)
```

### ❌ Socket.io Connection Issues

**Error:** `WebSocket connection closed` or `WebSocket connection failed`

**Troubleshooting steps:**
1. Check CORS in backend .env - should match frontend URL
2. Verify both ports are open
3. Check firewall settings
4. Try restarting both services

```powershell
# Test socket.io connection
curl http://localhost:3001/socket.io/?EIO=4&transport=polling
```

### ✅ Verify Everything Works

```powershell
# 1. Check backend is running and accessible
$resp = Invoke-WebRequest http://localhost:3001/api/status -ErrorAction SilentlyContinue
if ($resp) { Write-Host "✅ Backend OK" } else { Write-Host "❌ Backend Down" }

# 2. Check database
if (Test-Path c:\Swasth_order_agent\backend\database.db) { Write-Host "✅ Database exists" }

# 3. Check customers.json
if (Test-Path c:\Swasth_order_agent\backend\customers.json) { Write-Host "✅ Customers file exists" }

# 4. Check frontend can load
# Open http://localhost:3000 in browser
```

---

## Environment Variables Reference

### Backend (.env)
```env
# Server Configuration
PORT=3001                                    # Backend server port
NODE_ENV=development                         # Environment (development/production)

# URLs (for CORS and Frontend communication)
FRONTEND_URL=http://localhost:3000          # Frontend URL for CORS
BACKEND_URL=http://localhost:3001           # Backend URL for frontend
```

### Frontend (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:3001     # Backend API URL
REACT_APP_ENVIRONMENT=development           # Environment
```

---

## Production Deployment

### For Production, Update .env Files:

**Backend (.env):**
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

**Frontend (.env.production):**
```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

---

## Summary of All Changes Made

### Backend (server.js)
✅ Fixed socket.io event handler indentation and closure issues
✅ Improved error handling in WhatsApp connection
✅ Enhanced message processing with null checks
✅ Updated cron job with existence checks for files and connection
✅ Added proper error handling to CSV export
✅ Configured CORS to use environment variables
✅ Increased body-parser size limits
✅ Added status code to database orders schema

### Frontend (App.js)
✅ Made API URL configurable via environment variable
✅ Added error state management and display
✅ Implemented comprehensive error handling for all API calls
✅ Added socket.io error event listeners
✅ Added connection timeout configurations
✅ Improved user feedback with error messages and retry options

### Configuration Files
✅ Created frontend/.env with API configuration
✅ Updated backend/.env with additional variables
✅ Updated frontend/.gitignore to exclude .env files
✅ Ensured all sensitive files are properly ignored

---

## Next Steps

1. ✅ Install backend dependencies: `npm install` (backend)
2. ✅ Install frontend dependencies: `npm install` (frontend)
3. ✅ Start backend: `npm run dev` (backend)
4. ✅ Start frontend: `npm start` (frontend)
5. ✅ Open browser: http://localhost:3000
6. ✅ Scan QR code with WhatsApp
7. ✅ Test by sending menu number to the bot
8. ✅ Check dashboard for orders

---

## Support

If you encounter any issues:
1. Check the **Troubleshooting** section above
2. Verify all ports (3000, 3001) are available
3. Ensure Node.js and npm are properly installed
4. Check browser console (F12) for frontend errors
5. Check terminal output for backend errors
6. Verify .env files are configured correctly

---

**🎉 You're all set! The system is now ready to use.**
