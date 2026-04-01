/**
 * API Client for SwasthFirst Backend
 * 
 * Centralized API calls with error handling and authentication.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * Storage keys for tokens
 */
const CUSTOMER_TOKEN_KEY = 'swasth_customer_token';
const ADMIN_TOKEN_KEY = 'swasth_admin_token';

/**
 * Get auth headers with token
 */
const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` })
});

/**
 * Generic API request handler
 */
const apiRequest = async (method, path, body = null, token = null) => {
  try {
    const options = {
      method,
      headers: getAuthHeaders(token),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, options);
    
    // Handle non-JSON responses (like CSV downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      if (response.ok) {
        return await response.blob();
      }
      throw new Error('Download failed');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${method} ${path}]:`, error);
    throw error;
  }
};

/**
 * Token management
 */
export const tokenManager = {
  getCustomerToken: () => sessionStorage.getItem(CUSTOMER_TOKEN_KEY),
  setCustomerToken: (token) => sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token),
  clearCustomerToken: () => sessionStorage.removeItem(CUSTOMER_TOKEN_KEY),
  
  getAdminToken: () => sessionStorage.getItem(ADMIN_TOKEN_KEY),
  setAdminToken: (token) => sessionStorage.setItem(ADMIN_TOKEN_KEY, token),
  clearAdminToken: () => sessionStorage.removeItem(ADMIN_TOKEN_KEY),
  
  clearAll: () => {
    sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

/**
 * Authentication API
 */
export const authAPI = {
  // Customer login
  customerLogin: async (name, phone) => {
    const data = await apiRequest('POST', '/auth/login', { name, phone });
    tokenManager.setCustomerToken(data.access_token);
    return data;
  },

  // Get current customer profile
  getCustomerProfile: async () => {
    const token = tokenManager.getCustomerToken();
    return await apiRequest('GET', '/auth/me', null, token);
  },

  // Update health goal
  updateHealthGoal: async (health_goal) => {
    const token = tokenManager.getCustomerToken();
    return await apiRequest('POST', '/auth/update-goal', { health_goal }, token);
  },

  // Customer logout
  customerLogout: () => {
    tokenManager.clearCustomerToken();
  }
};

/**
 * Menu API
 */
export const menuAPI = {
  // Get all menu items
  getAll: async () => {
    return await apiRequest('GET', '/menu');
  },

  // Get menu grouped by category
  getByCategory: async () => {
    return await apiRequest('GET', '/menu/categories');
  },

  // Get single item
  getItem: async (itemId) => {
    return await apiRequest('GET', `/menu/${itemId}`);
  }
};

/**
 * Orders API
 */
export const ordersAPI = {
  // Create new order
  create: async (items) => {
    const token = tokenManager.getCustomerToken();
    return await apiRequest('POST', '/orders', { items }, token);
  },

  // Get customer's orders
  getMyOrders: async () => {
    const token = tokenManager.getCustomerToken();
    return await apiRequest('GET', '/orders/my-orders', null, token);
  },

  // Get single order
  getOrder: async (orderId) => {
    const token = tokenManager.getCustomerToken();
    return await apiRequest('GET', `/orders/${orderId}`, null, token);
  }
};

/**
 * Admin API
 */
export const adminAPI = {
  // Admin login
  login: async (username, password) => {
    const data = await apiRequest('POST', '/admin/login', { username, password });
    tokenManager.setAdminToken(data.access_token);
    return data;
  },

  // Get customers list
  getCustomers: async (page = 1, limit = 20, search = '') => {
    const token = tokenManager.getAdminToken();
    const params = new URLSearchParams({ page, limit, ...(search && { search }) });
    return await apiRequest('GET', `/admin/customers?${params}`, null, token);
  },

  // Create customer
  createCustomer: async (name, phone, health_goal = null) => {
    const token = tokenManager.getAdminToken();
    return await apiRequest('POST', '/admin/customers', { name, phone, health_goal }, token);
  },

  // Get orders list
  getOrders: async (page = 1, limit = 20, date = null, status = null) => {
    const token = tokenManager.getAdminToken();
    const params = new URLSearchParams({ page, limit });
    if (date) params.append('date', date);
    if (status) params.append('status', status);
    return await apiRequest('GET', `/admin/orders?${params}`, null, token);
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    const token = tokenManager.getAdminToken();
    return await apiRequest('PATCH', `/admin/orders/${orderId}/status`, { status }, token);
  },

  // Get analytics
  getAnalytics: async () => {
    const token = tokenManager.getAdminToken();
    return await apiRequest('GET', '/admin/analytics', null, token);
  },

  // Export orders to CSV
  exportOrders: async (date = null) => {
    const token = tokenManager.getAdminToken();
    const params = date ? `?date=${date}` : '';
    const blob = await apiRequest('GET', `/admin/export-orders${params}`, null, token);
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swasthfirst_orders_${date || new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Admin logout
  logout: () => {
    tokenManager.clearAdminToken();
  }
};

/**
 * Health check
 */
export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`);
    return await response.json();
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};
