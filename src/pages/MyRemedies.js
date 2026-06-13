import React, { useState, useEffect } from 'react';
import { remedyApi } from '../api/services';
import './Account.css';

const CATEGORY_ICON = { Gemstone: '💎', Mantra: '🕉️', Puja: '🪔', Daan: '🙏', Other: '✨' };

const MyRemedies = () => {
  const [remedies, setRemedies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await remedyApi.myRemedies();
        setRemedies(res.data?.recordList || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">My Remedies</h2>
        <p style={{ color: '#6b7280', marginTop: -8, marginBottom: 18 }}>Remedies (upaay) suggested by your astrologers</p>

        {remedies.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>No remedies suggested yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {remedies.map((r) => (
              <div key={r.id} style={{ border: '1px solid #e0d4f5', borderRadius: 12, padding: 16, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#faf7ff', border: '1px solid #e0d4f5', color: '#7c3aed', padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
                    {CATEGORY_ICON[r.category] || '✨'} {r.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', color: '#1f2937', whiteSpace: 'pre-wrap' }}>{r.remedy}</p>
                {r.astrologerName && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>— {r.astrologerName}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRemedies;
