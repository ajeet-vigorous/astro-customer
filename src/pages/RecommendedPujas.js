import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

const RecommendedPujas = () => {
  const { user } = useAuth();
  const [pujas, setPujas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res = await pujaApi.getRecommended();
      setPujas(res.data?.recordList || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleCancel = async (suggestedId) => {
    if (!window.confirm('Cancel this recommendation?')) return;
    try {
      await pujaApi.deleteRecommended({ id: suggestedId });
      toast.success('Recommendation cancelled');
      setPujas(prev => prev.filter(p => p.puja_suggested_id !== suggestedId));
    } catch (err) { toast.error('Failed'); }
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">Recommended Pujas</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>Pujas recommended by your astrologer during consultations</p>

        {pujas.length === 0 ? (
          <div className="no-data">No recommended pujas</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pujas.map((p) => (
              <div key={p.puja_suggested_id || p.id} style={{ background: '#fff', border: '2px solid #f0e6ff', borderRadius: 14, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px', color: '#1a0533' }}>{p.puja_title}</h4>
                  <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.85rem' }}>Recommended by <strong style={{ color: '#7c3aed' }}>{p.astrologername || 'Astrologer'}</strong></p>
                  <p style={{ margin: 0, color: '#7c3aed', fontWeight: 700, fontSize: '1.1rem' }}>&#8377;{p.puja_price || 0}</p>
                  {p.puja_place && <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.8rem' }}>Place: {p.puja_place}</p>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link to={`/puja/${p.id}`} style={{ background: '#7c3aed', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Accept & Book</Link>
                  <button onClick={() => handleCancel(p.puja_suggested_id)} style={{ background: '#fff', color: '#dc2626', border: '2px solid #dc2626', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedPujas;
