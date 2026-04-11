import React, { useState } from 'react';

const CustomerManagement = ({ customers, onAddCustomer, onRefresh, apiUrl = 'http://localhost:3001' }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !name) {
      alert('Please fill in phone and name');
      return;
    }

    setLoading(true);
    try {
      await onAddCustomer(phone, name, address);
      setPhone('');
      setName('');
      setAddress('');
      alert('Customer added successfully!');
    } catch (error) {
      alert('Error adding customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerPhone) => {
    try {
      const url = `${apiUrl}/api/customers/${encodeURIComponent(customerPhone)}`;
      console.log('🗑️ Deleting customer from:', url);
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Customer deleted successfully!');
        setDeleteConfirm(null);
        if (onRefresh) onRefresh();
      } else {
        const errorData = await response.json();
        console.error('Delete error:', errorData);
        alert(`Error: ${errorData.error || 'Failed to delete customer'}`);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(`Error deleting customer: ${error.message}`);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
      {/* Add Customer Form */}
      <div className="card-modern">
        <h3 className="h3 mb-5">➕ Add Customer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label>Customer Name</label>
            <input
              type="text"
              placeholder="e.g., Rajesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-modern"
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="e.g., 919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-modern"
            />
            <p className="text-small text-muted mt-1">Include country code (91 for India)</p>
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              placeholder="e.g., 123 Main Street, Apt 4B"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-modern"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-modern btn-primary btn-block"
          >
            {loading ? '⏳ Adding...' : '➕ Add Customer'}
          </button>
        </form>
      </div>

      {/* Customers List */}
      <div className="card-modern" style={{ gridColumn: 'span 2', maxWidth: '100%' }}>
        <div className="flex-between mb-6 pb-4" style={{ borderBottom: '1px solid var(--text-200)' }}>
          <h3 className="h3 mb-0">👥 Customers <span className="badge badge-primary">{customers.length}</span></h3>
          <button
            onClick={() => { window.location.href = `${apiUrl}/api/customers/export`; }}
            className="btn-modern btn-secondary btn-small"
            title="Download WhatsApp contacts as CSV (plain name + number)"
          >
            📥 Download Contacts CSV
          </button>
        </div>
        
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</p>
            <p className="text-muted">No customers added yet</p>
            <p className="text-small text-muted mt-2">Add your first customer using the form on the left</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>👤 Name</th>
                  <th>📱 Phone</th>
                  <th>📍 Address</th>
                  <th style={{ textAlign: 'center' }}>⚙️ Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="text-bold">{customer.name}</span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.85rem', background: 'var(--bg-light)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                        {customer.phone}
                      </code>
                    </td>
                    <td className="text-small">
                      {customer.address ? (
                        customer.address
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setDeleteConfirm(customer.phone)}
                        className="btn-modern btn-small btn-danger"
                        title="Delete customer"
                      >
                        🗑️ Delete
                      </button>

                      {/* Delete Confirmation */}
                      {deleteConfirm === customer.phone && (
                        <div style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1000
                        }}>
                          <div className="card-modern" style={{ maxWidth: '400px' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-900)' }}>
                              ⚠️ Delete Customer?
                            </h4>
                            <p className="text-muted mb-6">
                              Are you sure you want to delete <span className="text-bold">{customer.name}</span>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <button
                                onClick={() => handleDelete(customer.phone)}
                                className="btn-modern btn-danger flex-1"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="btn-modern btn-secondary flex-1"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerManagement;
