import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/services';
import './Account.css';

const typeColors = {
  puja: { bg: '#f0fdf4', border: '#10b981', text: '#059669', label: 'Puja' },
  chat: { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb', label: 'Chat' },
  call: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706', label: 'Call' },
  report: { bg: '#f5f3ff', border: '#7c3aed', text: '#7c3aed', label: 'Report' },
  astromall: { bg: '#fce7f3', border: '#ec4899', text: '#db2777', label: 'Product' },
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await accountApi.getOrders();
        const d = res.data?.data || res.data;
        setOrders(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.orderType === filter);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">My Orders</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'puja', 'chat', 'call', 'report'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 16px', borderRadius: 20, border: filter === f ? 'none' : '1px solid #d1d5db',
              background: filter === f ? '#7c3aed' : '#fff', color: filter === f ? '#fff' : '#374151',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', textTransform: 'capitalize'
            }}>{f === 'all' ? 'All' : typeColors[f]?.label || f}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="no-data">No orders found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((order) => {
              const tc = typeColors[order.orderType] || { bg: '#f9fafb', border: '#d1d5db', text: '#374151', label: order.orderType };
              return (
                <div key={order.orderType + '_' + order.id} style={{ background: '#fff', border: '1px solid #f0e6ff', borderLeft: `4px solid ${tc.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: tc.bg, color: tc.text, padding: '3px 12px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>{tc.label}</span>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>#{order.id}</span>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600,
                      background: (order.status || '').toLowerCase().includes('complet') ? '#d1fae5' : (order.status || '').toLowerCase().includes('cancel') ? '#fee2e2' : '#fef3c7',
                      color: (order.status || '').toLowerCase().includes('complet') ? '#065f46' : (order.status || '').toLowerCase().includes('cancel') ? '#991b1b' : '#92400e'
                    }}>{order.status || 'Placed'}</span>
                  </div>
                  <h4 style={{ margin: '0 0 4px', color: '#1a0533' }}>{order.name || order.orderType}</h4>
                  {order.astrologerName && <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.85rem' }}>Astrologer: {order.astrologerName}</p>}
                  {order.packageName && <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.85rem' }}>Package: {order.packageName}</p>}
                  {order.totalMin > 0 && <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.85rem' }}>Duration: {order.totalMin} min</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: '1.05rem' }}>&#8377;{parseFloat(order.amount || 0).toFixed(2)}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
