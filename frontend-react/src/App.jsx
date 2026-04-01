import React, { useState, useEffect, useRef } from 'react';
import { 
  Leaf, 
  Droplets, 
  Flame, 
  Zap, 
  ShoppingCart, 
  User, 
  ArrowLeft,
  Sparkles,
  Search,
  Plus,
  Minus,
  Smartphone,
  CheckCircle,
  CreditCard,
  X,
  ChevronRight,
  LayoutDashboard,
  Download,
  Calendar,
  LogOut,
  Clock,
  AlertCircle
} from 'lucide-react';

import { authAPI, menuAPI, ordersAPI, adminAPI, tokenManager } from './api/client';

const HEALTH_GOALS = [
  { id: 'Detox', label: 'Detox', icon: Droplets, color: 'bg-blue-100 text-blue-700' },
  { id: 'Energy', label: 'Energy', icon: Zap, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'Immunity', label: 'Immunity', icon: Leaf, color: 'bg-green-100 text-green-700' },
  { id: 'Weight Loss', label: 'Weight Loss', icon: Flame, color: 'bg-orange-100 text-orange-700' },
];

export default function App() {
  const [step, setStep] = useState('landing'); // landing, admin-login, admin-dashboard, preference, chat, checkout, success
  const [user, setUser] = useState({ name: '', phone: '', goal: '', preferences: [] });
  const [cart, setCart] = useState({}); // { itemId: quantity }
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]); // Admin orders
  const [analytics, setAnalytics] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastOrderCode, setLastOrderCode] = useState('');
  const chatEndRef = useRef(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Load menu data on mount
  useEffect(() => {
    loadMenuData();
  }, []);

  // Auto-refresh admin dashboard
  useEffect(() => {
    if (step === 'admin-dashboard') {
      loadAdminData();
      const interval = setInterval(() => {
        loadAdminData();
      }, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [step]);

  const loadMenuData = async () => {
    try {
      const data = await menuAPI.getAll();
      setMenuData(data);
    } catch (err) {
      console.error('Failed to load menu:', err);
      setError('Failed to load menu. Please refresh.');
    }
  };

  const loadAdminData = async () => {
    try {
      const [ordersData, analyticsData] = await Promise.all([
        adminAPI.getOrders(1, 50),
        adminAPI.getAnalytics()
      ]);
      setOrderHistory(ordersData.items || []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Login handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await authAPI.customerLogin(user.name, user.phone);
      setUser({ ...user, ...result.customer });
      setStep('preference');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    try {
      const result = await adminAPI.login(username, password);
      setAdminInfo(result.admin);
      setStep('admin-dashboard');
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Admin login failed.');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (goal) => {
    setLoading(true);
    try {
      // Update health goal in backend
      await authAPI.updateHealthGoal(goal);
      setUser({ ...user, goal });
      setStep('chat');
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          { 
            id: 1, 
            sender: 'ai', 
            text: `Hello ${user.name}! 🌿 Welcome to SwasthFirst. Based on your focus on ${goal}, here's our menu. Tap + to add items to your tray!` 
          }
        ]);
        setIsTyping(false);
      }, 1500);
    } catch (err) {
      setError('Failed to update preference');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      }
      return { ...prev, [id]: next };
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuData.find(m => m.id === parseInt(id));
    return sum + (item?.price || 0) * qty;
  }, 0);

  // Complete Order & Call API
  const finalizeOrder = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Convert cart to API format
      const items = Object.entries(cart).map(([id, quantity]) => ({
        item_id: parseInt(id),
        quantity
      }));
      
      const result = await ordersAPI.create(items);
      setLastOrderCode(result.order_code);
      setCart({});
      setStep('success');
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Export orders to CSV
  const exportOrders = async () => {
    try {
      await adminAPI.exportOrders(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError('Failed to export orders');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus);
      await loadAdminData(); // Refresh data
    } catch (err) {
      setError('Failed to update order status');
    }
  };

  const renderLanding = () => (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8 border-4 border-emerald-400 relative">
        <Leaf className="text-emerald-500" size={48} />
      </div>
      <h1 className="text-3xl font-bold text-emerald-900 mb-2">SwasthFirst</h1>
      <p className="text-emerald-700 mb-8 max-w-xs">Scan successful! Log in to access your personalized health menu.</p>
      
      {error && (
        <div className="w-full max-w-sm mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <input 
          required 
          className="w-full p-4 rounded-2xl border-none shadow-sm outline-none" 
          placeholder="Your Name" 
          value={user.name} 
          onChange={e => setUser({...user, name: e.target.value})} 
        />
        <input 
          required 
          type="tel" 
          pattern="[0-9]{10}"
          className="w-full p-4 rounded-2xl border-none shadow-sm outline-none" 
          placeholder="Phone Number (10 digits)" 
          value={user.phone} 
          onChange={e => setUser({...user, phone: e.target.value})} 
        />
        <button 
          disabled={loading}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Get Started'}
        </button>
      </form>

      <button 
        onClick={() => {setStep('admin-login'); setError('');}} 
        className="mt-12 text-xs font-bold text-emerald-600/50 flex items-center gap-2 hover:text-emerald-600 transition-colors"
      >
        <LayoutDashboard size={14} /> Admin Access
      </button>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
        <LayoutDashboard size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2">Outlet Dashboard</h2>
      <p className="text-gray-400 mb-8 text-sm">Restricted access for outlet managers.</p>
      
      {error && (
        <div className="w-full max-w-sm mb-4 p-3 bg-red-900/50 border border-red-700 rounded-2xl flex items-center gap-2 text-red-200 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleAdminLogin} className="w-full max-w-sm space-y-4">
        <input 
          required 
          name="username"
          placeholder="Username" 
          className="w-full p-4 rounded-2xl bg-gray-800 border-none outline-none text-center" 
        />
        <input 
          required 
          name="password"
          type="password" 
          placeholder="Password" 
          className="w-full p-4 rounded-2xl bg-gray-800 border-none outline-none text-center" 
        />
        <button 
          disabled={loading}
          className="w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login as Admin'}
        </button>
        <button 
          type="button" 
          onClick={() => {setStep('landing'); setError('');}} 
          className="text-gray-500 text-sm"
        >
          Back to User App
        </button>
      </form>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white p-6 border-b flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Order Logs</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={12}/> Daily Overview {adminInfo && `• ${adminInfo.username}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportOrders} className="bg-emerald-50 text-emerald-600 p-3 rounded-xl hover:bg-emerald-100">
            <Download size={20}/>
          </button>
          <button onClick={() => {adminAPI.logout(); setStep('landing');}} className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100">
            <LogOut size={20}/>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-emerald-600">{analytics?.total_orders_today || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Revenue</p>
            <p className="text-2xl font-bold text-gray-800">₹{analytics?.revenue_today || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700">Recent Activity</span>
            <Calendar size={16} className="text-gray-400"/>
          </div>
          <div className="divide-y divide-gray-100">
            {orderHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p>No orders recorded yet today.</p>
              </div>
            ) : (
              orderHistory.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                        {order.order_code}
                      </span>
                      <h4 className="font-bold text-gray-800 mt-1">{order.customer_name}</h4>
                      <p className="text-xs text-gray-500">{order.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">₹{order.total_amount}</span>
                      <select 
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="block text-xs mt-1 border border-gray-200 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-1">
                    {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-2 italic">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferences = () => (
    <div className="min-h-screen bg-white p-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-2 mt-4">What's your goal today?</h2>
      <p className="text-gray-500 mb-8 text-sm">We'll tailor our menu suggestions just for you.</p>
      <div className="grid grid-cols-2 gap-4 mb-10">
        {HEALTH_GOALS.map(goal => {
          const IconComponent = goal.icon;
          return (
            <button 
              key={goal.id} 
              onClick={() => startChat(goal.label)} 
              disabled={loading}
              className={`${goal.color} p-6 rounded-3xl flex flex-col items-center gap-3 transition-transform active:scale-95 shadow-sm disabled:opacity-50`}
            >
              <IconComponent size={20} />
              <span className="font-bold text-sm">{goal.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-screen bg-gray-50 animate-in slide-in-from-right duration-300">
      <header className="bg-white px-4 py-4 border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('preference')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="font-bold text-sm text-gray-800 leading-tight">Swasth Assistant</h3>
            <span className="text-[10px] text-emerald-500 font-medium tracking-wide">• ONLINE</span>
          </div>
        </div>
        <User size={20} className="text-gray-400" />
      </header>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-40">
        {messages.map(msg => (
          <div key={msg.id} className="flex flex-col gap-4">
            <div className="max-w-[85%] bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 text-sm leading-relaxed">
              {msg.text}
            </div>
            
            <div className="space-y-6">
              {Object.entries(menuData.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {})).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase">{category}</span>
                    <div className="h-[1px] flex-1 bg-emerald-100" />
                  </div>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-800 text-sm">{item.name}</h4>
                          <span className="text-xs font-bold text-emerald-600">₹{item.price}</span>
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-1">
                          {cart[item.id] ? (
                            <>
                              <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 bg-white text-emerald-600 rounded-lg shadow-sm flex items-center justify-center">
                                <Minus size={14} />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{cart[item.id]}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 bg-emerald-600 text-white rounded-lg shadow-sm flex items-center justify-center">
                                <Plus size={14} />
                              </button>
                            </>
                          ) : (
                            <button onClick={() => updateQuantity(item.id, 1)} className="px-4 py-1 bg-white text-emerald-600 text-xs font-bold rounded-lg shadow-sm">
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {isTyping && <div className="animate-pulse text-emerald-600 text-xs">AI is typing...</div>}
        <div ref={chatEndRef} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t p-4 pb-8 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {totalItems > 0 && (
          <button onClick={() => setStep('checkout')} className="w-full flex items-center justify-between bg-emerald-900 text-white p-4 rounded-2xl shadow-xl hover:bg-emerald-800 transition-colors">
            <div className="flex items-center gap-3">
              <span className="bg-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{totalItems}</span>
              <span className="font-bold">View Cart</span>
            </div>
            <span className="font-bold">₹{totalPrice} →</span>
          </button>
        )}
        <div className="flex gap-2 items-center bg-gray-100 rounded-full px-4 py-2">
          <input className="flex-1 bg-transparent border-none outline-none text-sm py-1" placeholder="Ask health questions..." />
          <Sparkles size={18} className="text-emerald-600" />
        </div>
      </div>
    </div>
  );

  const renderCheckout = () => (
    <div className="min-h-screen bg-gray-50 p-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setStep('chat')} className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold">Review Tray</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-dashed">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <Leaf className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Outlet #04</p>
            <p className="font-bold">SwasthFirst Central</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(cart).map(([id, qty]) => {
            const item = menuData.find(m => m.id === parseInt(id));
            return item ? (
              <div key={id} className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 w-6 h-6 flex items-center justify-center rounded">
                    {qty}x
                  </span>
                  <p className="text-sm font-medium text-gray-700">{item.name}</p>
                </div>
                <p className="text-sm font-bold">₹{item.price * qty}</p>
              </div>
            ) : null;
          })}
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-bold">₹{totalPrice}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service Fee</span>
            <span className="font-bold text-emerald-600">FREE</span>
          </div>
          <div className="flex justify-between border-t border-emerald-100 pt-2 mt-2">
            <span className="font-bold">Total Pay</span>
            <span className="font-black text-lg">₹{totalPrice}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={finalizeOrder} 
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-all mb-4 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Proceed to Confirm Order'}
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
        <CheckCircle className="text-emerald-500" size={48} />
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">Order Placed!</h2>
      <p className="text-emerald-100 mb-8">Your nutrients are being prepared and will be served shortly, {user.name}.</p>
      <div className="bg-emerald-700/50 w-full p-6 rounded-3xl mb-12 text-white">
        <p className="text-xs text-emerald-200 uppercase font-black tracking-widest mb-2">Order Tracking</p>
        <p className="text-2xl font-mono">{lastOrderCode || 'SF-XXXX'}</p>
      </div>
      <button onClick={() => {setCart({}); setStep('chat')}} className="w-full bg-white text-emerald-700 font-bold py-4 rounded-2xl shadow-xl">
        Order More
      </button>
    </div>
  );

  return (
    <div className="antialiased font-sans bg-gray-100 min-h-screen sm:py-8">
      <div className="max-w-md mx-auto bg-white min-h-screen sm:min-h-[812px] shadow-2xl overflow-hidden sm:rounded-[3rem] relative">
        {step === 'landing' && renderLanding()}
        {step === 'admin-login' && renderAdminLogin()}
        {step === 'admin-dashboard' && renderAdminDashboard()}
        {step === 'preference' && renderPreferences()}
        {step === 'chat' && renderChat()}
        {step === 'checkout' && renderCheckout()}
        {step === 'success' && renderSuccess()}
      </div>
    </div>
  );
}
