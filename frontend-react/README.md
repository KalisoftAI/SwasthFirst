# SwasthFirst Frontend

React frontend application for the SwasthFirst health juice bar order management system.

## 🚀 Features

- **Customer Portal**: Browse menu, place orders, track order history
- **Admin Dashboard**: Manage orders, view analytics, export reports
- **Phone-based Authentication**: Simple login using phone numbers
- **Real-time Updates**: Auto-refresh admin dashboard every 30 seconds
- **Responsive Design**: Mobile-first UI with beautiful animations
- **Order Management**: Add items to cart, review, and confirm orders

## 📋 Prerequisites

- Node.js 16+ and npm
- Running SwasthFirst backend API (see backend README)

## 🔧 Installation

### 1. Install Dependencies

```bash
cd frontend-react
npm install
```

### 2. Environment Configuration

Create a `.env` file in the frontend-react directory:

```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

For production, update with your deployed backend URL:

```env
REACT_APP_API_URL=https://api.swasthfirst.com/api/v1
```

### 3. Start Development Server

```bash
npm start
```

The app will open at http://localhost:3000

## 🏗️ Project Structure

```
frontend-react/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── api/
│   │   └── client.js       # API client with all backend calls
│   ├── App.jsx             # Main application component
│   ├── index.jsx           # React entry point
│   └── index.css           # Global styles (Tailwind)
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
└── README.md              # This file
```

## 🧪 Testing the Application

### Test Customer Accounts

After running the backend seed script, use these accounts to log in:

```
Name: Priya Sharma
Phone: 9876543210

Name: Rohit Mehta
Phone: 9123456789

Name: Ananya Joshi
Phone: 9988776655
```

**Note**: Phone number acts as the password!

### Test Admin Account

```
Username: swasthAdmin
Password: Admin@1234
```

## 🎨 Design Features

- **Tailwind CSS**: Utility-first styling
- **Lucide React Icons**: Beautiful, consistent icons
- **Smooth Animations**: CSS transitions and transforms
- **Mobile-First**: Optimized for mobile devices
- **Clean UI**: Modern, minimalist design with emerald color scheme

## 🔄 API Integration

The frontend connects to all backend endpoints through the centralized API client (`src/api/client.js`):

### Customer Endpoints
- `authAPI.customerLogin()` - Login with name and phone
- `authAPI.getCustomerProfile()` - Get profile data
- `authAPI.updateHealthGoal()` - Update health preference
- `menuAPI.getAll()` - Get all menu items
- `ordersAPI.create()` - Place new order
- `ordersAPI.getMyOrders()` - Get order history

### Admin Endpoints
- `adminAPI.login()` - Admin authentication
- `adminAPI.getOrders()` - List all orders with filters
- `adminAPI.updateOrderStatus()` - Update order status
- `adminAPI.getAnalytics()` - Dashboard metrics
- `adminAPI.exportOrders()` - Download CSV report

## 📊 Features by User Type

### Customer Features
1. **Login**: Phone-based authentication
2. **Health Goals**: Select fitness objective (Detox, Energy, etc.)
3. **Menu Browse**: View categorized product catalog
4. **Cart Management**: Add/remove items with quantities
5. **Order Placement**: Review and confirm orders
6. **Order Tracking**: View order code and status

### Admin Features
1. **Dashboard**: Real-time order overview
2. **Analytics**: Daily orders and revenue metrics
3. **Order Management**: Update order status (pending → preparing → ready → completed)
4. **CSV Export**: Download order reports
5. **Auto-refresh**: Dashboard updates every 30 seconds
6. **Customer Info**: View customer details with each order

## 🚀 Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Deploy Options

#### Option 1: Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variable: `REACT_APP_API_URL=https://your-api-url.com/api/v1`
5. Deploy!

#### Option 2: Traditional Web Server (nginx, Apache)

```bash
# Build the app
npm run build

# Copy build/ contents to web server
cp -r build/* /var/www/html/

# Configure nginx to serve the SPA
# Add to nginx.conf:
location / {
  try_files $uri $uri/ /index.html;
}
```

#### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 Security Notes

- **No localStorage**: Tokens stored in sessionStorage (cleared on tab close)
- **HTTPS in Production**: Always use HTTPS for API calls in production
- **CORS**: Backend must allow your frontend origin
- **Input Validation**: All inputs validated before API calls
- **Error Handling**: User-friendly error messages

## 🐛 Troubleshooting

### API Connection Issues

```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify CORS settings in backend .env
CORS_ORIGINS=http://localhost:3000
```

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf build
npm run build
```

### Port Already in Use

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 📝 Customization

### Change Color Scheme

Edit `src/App.jsx` and `tailwind.config.js` to customize colors:

```js
// Replace emerald with your preferred color
bg-emerald-50 → bg-blue-50
text-emerald-600 → text-blue-600
```

### Add New Pages

Create new components in `src/` and update the `step` state in `App.jsx`:

```jsx
const [step, setStep] = useState('landing'); // Add new step values
```

### Customize Menu Display

Modify the menu rendering logic in `renderChat()` to change how items are displayed.

## 🔮 Future Enhancements

- [ ] Add order history page for customers
- [ ] Real-time order updates via WebSocket
- [ ] Push notifications for order status changes
- [ ] Customer loyalty points tracking
- [ ] Advanced menu filters (price, tags, etc.)
- [ ] Multi-language support
- [ ] Dark mode theme

## 📄 License

Proprietary - SwasthFirst © 2026

## 👥 Support

For issues or questions, contact: support@swasthfirst.com

---

**Built with ❤️ for healthy living**
