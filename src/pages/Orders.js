import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/services';
import './Account.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await accountApi.getOrders({});
        const d = res.data?.data || res.data;
        setOrders(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">My Orders</h2>
        {orders.length === 0 ? (
          <div className="no-data">No orders found</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-id">Order #{order.id}</span>
                  <span className={`order-status ${(order.status || '').toLowerCase()}`}>{order.status || 'Pending'}</span>
                </div>
                <div className="order-body">
                  <p><strong>{order.productName || order.pujaName || order.name || '-'}</strong></p>
                  <p className="order-meta">Amount: &#8377;{order.amount || order.totalAmount || 0}</p>
                  {order.createdAt && <p className="order-meta">Date: {new Date(order.createdAt).toLocaleDateString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
