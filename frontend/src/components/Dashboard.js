import React from 'react';

const Dashboard = ({ ordersCount, customersCount, onExportCSV, onExportCombinedCSV, onExportFullOrders }) => {
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid-3 mb-6">
        <div className="card-stat">
          <div className="flex-between">
            <div>
              <p className="text-muted mb-2">📦 Total Orders</p>
              <h3 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>
                {ordersCount}
              </h3>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.2 }}>📦</div>
          </div>
        </div>

        <div className="card-stat">
          <div className="flex-between">
            <div>
              <p className="text-muted mb-2">👥 Active Customers</p>
              <h3 style={{ fontSize: '2.5rem', color: 'var(--accent-blue)' }}>
                {customersCount}
              </h3>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.2 }}>👥</div>
          </div>
        </div>

        <div className="card-stat">
          <div className="flex-between">
            <div>
              <p className="text-muted mb-2">⏰ Ordering Hours</p>
              <h3 style={{ fontSize: '1.2rem', color: '#16a34a', fontWeight: 600 }}>
                9 AM - 8 PM
              </h3>
              <p className="text-small mt-2">Daily ordering window</p>
            </div>
            <div style={{ fontSize: '3rem', opacity: 0.2 }}>⏰</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-modern">
        <h3 className="mb-4">⚡ Quick Actions</h3>
        <div className="space-x-4">
          <button 
            onClick={onExportCSV}
            className="btn-modern btn-primary"
          >
            📥 Export Orders CSV
          </button>
          <button 
            onClick={onExportFullOrders}
            className="btn-modern btn-primary"
          >
            📋 Full Orders + Contact CSV
          </button>
          <button 
            onClick={onExportCombinedCSV}
            className="btn-modern btn-secondary"
          >
            📊 Contacts + Orders Activity CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
