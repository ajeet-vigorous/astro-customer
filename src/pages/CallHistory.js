import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/services';
import './Account.css';

const CallHistory = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await accountApi.getCallHistory({});
        const d = res.data?.data || res.data;
        setCalls(Array.isArray(d) ? d : d?.recordList || []);
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
        <h2 className="account-title">Call History</h2>
        {calls.length === 0 ? (
          <div className="no-data">No call history found</div>
        ) : (
          <div className="history-list">
            {calls.map((call) => (
              <div key={call.id} className="history-card">
                <div className="history-avatar">
                  <img src={call.profileImage ? (call.profileImage.startsWith('http') ? call.profileImage : `http://localhost:5000${call.profileImage}`) : '/default-avatar.png'} alt={call.astrologerName || 'Astrologer'} />
                </div>
                <div className="history-info">
                  <h4>{call.astrologerName || call.name || 'Astrologer'}</h4>
                  <p className="history-meta">Duration: {call.duration || call.call_duration || 0} min</p>
                  <p className="history-meta">Amount: &#8377;{call.amount || call.deduction || 0}</p>
                  {call.createdAt && <p className="history-date">{new Date(call.createdAt).toLocaleDateString()}</p>}
                </div>
                <span className={`history-status ${(call.status || '').toLowerCase()}`}>{call.status || 'Completed'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistory;
