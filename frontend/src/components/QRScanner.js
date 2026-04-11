import React from 'react';

const QRScanner = ({ qrCode, connectionStatus }) => {
  return (
    <div className="card-modern mb-6">
      <div className="text-center">
        <h2 className="h2 mb-2">📱 WhatsApp Connection</h2>
        <p className="text-muted mb-6">Scan the QR code with WhatsApp to establish connection</p>
        
        {qrCode ? (
          <div className="flex flex-col items-center">
            <div style={{
              padding: '1.5rem',
              background: 'var(--bg-light)',
              borderRadius: 'var(--radius-xl)',
              border: '3px solid var(--primary)',
              position: 'relative'
            }}>
              <img 
                src={qrCode} 
                alt="WhatsApp QR Code" 
                style={{
                  width: '320px',
                  height: '320px',
                  borderRadius: 'var(--radius-lg)'
                }}
              />
            </div>
            <div className="badge badge-success mt-4">
              ✅ QR Code Ready - Scan with your phone
            </div>
          </div>
        ) : (
          <div style={{
            width: '320px',
            height: '320px',
            margin: '0 auto',
            background: 'var(--bg-light)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            animation: 'fadeIn 2s infinite'
          }}>
            <p style={{ fontSize: '1.5rem' }}>⏳</p>
            <p className="text-muted mt-3">Generating QR Code...</p>
            <p className="text-small text-muted mt-2">Backend must be running</p>
          </div>
        )}

        {/* Instructions */}
        <div className="card-compact mt-6 bg-gradient-to-r from-blue-50 to-indigo-50" style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <p className="text-small text-bold mb-3">📋 How to connect:</p>
          <ol style={{ textAlign: 'left', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            <li className="mb-2">1️⃣ Open WhatsApp on your phone</li>
            <li className="mb-2">2️⃣ Tap Settings → Linked Devices → Link a Device</li>
            <li>3️⃣ Point camera at QR code above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
