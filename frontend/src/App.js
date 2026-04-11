import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import QRScanner from './components/QRScanner';
import Dashboard from './components/Dashboard';
import OrdersList from './components/OrdersList';
import CustomerManagement from './components/CustomerManagement';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const socket = io(API_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10
});

function App() {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [qrCode, setQrCode] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get initial status
    fetchStatus();
    fetchOrders();
    fetchCustomers();

    // Socket listeners - set up BEFORE any events fire
    const handleConnectionStatus = (data) => {
      console.log('🔄 Connection status update:', data.status);
      setConnectionStatus(data.status);
    };

    const handleQrCode = (qr) => {
      console.log('📱 QR Code received from socket');
      setQrCode(qr);
    };

    const handleNewOrder = (order) => {
      console.log('🎉 New order received:', order);
      setOrders((prev) => [order, ...prev]);
    };

    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      setError('Connection error: Unable to connect to real-time updates');
    };

    const handleDisconnect = () => {
      console.log('⚠️ Socket disconnected');
    };

    // Subscribe to events
    socket.on('connectionStatus', handleConnectionStatus);
    socket.on('qrCode', handleQrCode);
    socket.on('newOrder', handleNewOrder);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    // Request latest status immediately
    console.log('📡 Requesting status from backend...');
    socket.emit('request-status');

    // Refresh orders every 5 seconds
    const orderInterval = setInterval(fetchOrders, 5000);

    return () => {
      clearInterval(orderInterval);
      socket.off('connectionStatus', handleConnectionStatus);
      socket.off('qrCode', handleQrCode);
      socket.off('newOrder', handleNewOrder);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      console.log('🔍 Checking backend status at', API_URL);
      const res = await axios.get(`${API_URL}/api/status`, { timeout: 5000 });
      console.log('✅ Backend response:', res.data);
      setConnectionStatus(res.data.status);
      if (res.data.qrCode) setQrCode(res.data.qrCode);
      setError(null);
    } catch (error) {
      console.error('❌ Error fetching status:', error.message);
      console.error('Backend URL:', API_URL);
      setError('⚠️ Backend not responding. Make sure it\'s running on port 3001.');
      setConnectionStatus('disconnected');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/orders`, { timeout: 5000 });
      setOrders(res.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      // Silently fail - keep existing orders on screen
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/customers`, { timeout: 5000 });
      setCustomers(res.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching customers:', error.message);
      // Silently fail - keep existing customers on screen
    }
  };

  const handleAddCustomer = async (phone, name, address) => {
    try {
      await axios.post(`${API_URL}/api/customers`, { phone, name, address }, { timeout: 5000 });
      fetchCustomers();
      setError(null);
    } catch (error) {
      console.error('Error adding customer:', error.message);
      setError('Failed to add customer. Please check the backend is running.');
      throw error;
    }
  };

  const handleExportCSV = async () => {
    try {
      window.location.href = `${API_URL}/api/orders/export`;
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  // Combined export: contacts + chat activity + order stats in one CSV
  const handleExportCombinedCSV = async () => {
    try {
      window.location.href = `${API_URL}/api/combined/export`;
    } catch (error) {
      console.error('Error exporting combined CSV:', error);
    }
  };

  // Full orders export: all orders with correct customer name + merged items
  const handleExportFullOrders = async () => {
    try {
      window.location.href = `${API_URL}/api/orders/full-export`;
    } catch (error) {
      console.error('Error exporting full orders CSV:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="app-wrapper">
          <div className="flex-between">
            <div>
              <h1>🏥 Swasth Order Agent</h1>
              <p>Real-time WhatsApp Order Management System</p>
            </div>
            <div className="app-header-status">
              <span className={`status-indicator ${connectionStatus === 'connected' ? 'connected' : 'disconnected'}`}></span>
              {connectionStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="app-wrapper mt-4">
          <div className="alert alert-error animate-slide-in">
            <div className="flex-between">
              <span>⚠️ {error}</span>
              <button 
                onClick={() => { setError(null); fetchStatus(); }} 
                className="btn-modern btn-small btn-secondary"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="app-wrapper">
        {connectionStatus !== 'connected' && (
          <QRScanner qrCode={qrCode} connectionStatus={connectionStatus} />
        )}

        {connectionStatus === 'connected' && (
          <div className="animate-fade-in">
            {/* Premium Tab Navigation */}
            <nav className="premium-nav-container">
              <div className="nav-wrapper">
                <button
                  className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                  title="Dashboard"
                >
                  <span className="nav-icon">📊</span>
                  <span className="nav-label">Dashboard</span>
                </button>
                
                <button
                  className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('orders')}
                  title="Orders"
                >
                  <span className="nav-icon">📦</span>
                  <span className="nav-label">Orders</span>
                  {orders.length > 0 && (
                    <span className="nav-badge badge-orders">{orders.length}</span>
                  )}
                </button>
                
                <button
                  className={`nav-tab ${activeTab === 'customers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('customers')}
                  title="Customers"
                >
                  <span className="nav-icon">👥</span>
                  <span className="nav-label">Customers</span>
                  {customers.length > 0 && (
                    <span className="nav-badge badge-customers">{customers.length}</span>
                  )}
                </button>
              </div>
            </nav>

            {/* Tab Content */}
            <div className="tab-content animate-fade-in">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  ordersCount={orders.length} 
                  customersCount={customers.length}
                  onExportCSV={handleExportCSV}
                  onExportCombinedCSV={handleExportCombinedCSV}
                  onExportFullOrders={handleExportFullOrders}
                />
              )}

              {activeTab === 'orders' && (
                <OrdersList 
                  orders={orders}
                  onExportCSV={handleExportCSV}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerManagement 
                  customers={customers}
                  onAddCustomer={handleAddCustomer}
                  onRefresh={fetchCustomers}
                  apiUrl={API_URL}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
