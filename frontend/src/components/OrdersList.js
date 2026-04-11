import React from 'react';

// Parse JSONB items, merge duplicates, return readable string: "Amla juice ×2, Carrot juice ×1"
const formatItems = (items) => {
  try {
    const arr = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(arr)) return items || 'N/A';
    // Merge duplicate items (same id or name) by summing quantities
    const merged = new Map();
    for (const i of arr) {
      const key = i.id != null ? i.id : i.name;
      if (merged.has(key)) {
        const ex = merged.get(key);
        ex.quantity = (ex.quantity || 1) + (i.quantity || 1);
      } else {
        merged.set(key, { ...i });
      }
    }
    return Array.from(merged.values()).map(i => `${i.name} ×${i.quantity}`).join(', ');
  } catch {
    return items || 'N/A';
  }
};

const OrdersList = ({ orders, onExportCSV }) => {
  return (
    <div className="card-modern">
      <div className="flex-between mb-6">
        <h3 className="h3">📋 Recent Orders</h3>
        <button 
          onClick={onExportCSV}
          className="btn-modern btn-primary btn-small"
        >
          📥 Export CSV
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
          <p className="text-muted text-lg">No orders yet</p>
          <p className="text-small text-muted mt-2">Orders will appear here once customers place them</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table-modern">
            <thead>
              <tr>
                <th>📅 Date & Time</th>
                <th>👤 Customer Name</th>
                <th>📱 Phone</th>
                <th>🍽️ Items</th>
                <th>💰 Total</th>
                <th>✅ Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => (
                <tr key={idx}>
                  <td className="text-small">
                    {new Date(order.timestamp).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <span className="text-bold">{order.name}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {order.phone}
                  </td>
                  <td className="text-small">
                    <span style={{ fontWeight: 500, color: 'var(--primary)' }}>
                      {formatItems(order.items)}
                    </span>
                  </td>
                  <td className="text-bold">
                    <span style={{ color: 'var(--success)' }}>₹{order.total_price || 0}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      order.status === 'completed' ? 'badge-success' : 'badge-warning'
                    }`}>
                      {order.status === 'completed' ? '✓ Completed' : '⏳ Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
