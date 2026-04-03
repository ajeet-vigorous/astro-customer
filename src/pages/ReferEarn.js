import React, { useState, useEffect } from 'react';
import { referralApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

const ReferEarn = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user) return;
    referralApi.getInfo().then(res => {
      console.log('Referral response:', res.data);
      setData(res.data);
    }).catch((err) => { console.error('Referral error:', err.response?.data || err.message); }).finally(() => setLoading(false));
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data?.referralCode || '');
    toast.success('Referral code copied!');
  };

  const handleShare = () => {
    const text = `Join AstroGuru and get ₹${data?.refereeBonus} bonus! Use my referral code: ${data?.referralCode}`;
    if (navigator.share) { navigator.share({ title: 'AstroGuru Referral', text }); }
    else { navigator.clipboard.writeText(text); toast.success('Share text copied!'); }
  };

  const handleApply = async () => {
    if (!code.trim()) { toast.error('Enter referral code'); return; }
    setApplying(true);
    try {
      const res = await referralApi.applyCode({ referralCode: code.trim() });
      if (res.data?.status === 200) { toast.success(res.data.message); setCode(''); }
      else toast.error(res.data?.message || 'Failed');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    setApplying(false);
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!data?.enabled) return <div className="account-page"><div className="container"><div className="no-data">Referral system is not available</div></div></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">Refer & Earn</h2>

        {/* Your Code */}
        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', borderRadius: 16, padding: 28, color: '#fff', marginBottom: 24, textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px' }}>Your Referral Code</h3>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px 20px', fontSize: '1.5rem', fontWeight: 700, letterSpacing: 3, display: 'inline-block', marginBottom: 16 }}>
            {data.referralCode}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={handleCopy} style={{ background: '#fff', color: '#7c3aed', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Copy Code</button>
            <button onClick={handleShare} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Share</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #f0e6ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>Total Referred</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>{data.totalReferred}</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #f0e6ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>Completed</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{data.completedReferrals}</p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #f0e6ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem' }}>Total Earned</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>&#8377;{data.totalEarned.toFixed(2)}</p>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background: '#f9f5ff', borderRadius: 14, padding: 20, marginBottom: 24, border: '1px solid #e0d4f5' }}>
          <h4 style={{ margin: '0 0 12px', color: '#1a0533' }}>How it works</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem', color: '#374151' }}>
            <p style={{ margin: 0 }}>1. Share your referral code with friends</p>
            <p style={{ margin: 0 }}>2. Friend registers and enters your code</p>
            <p style={{ margin: 0 }}>3. Friend recharges minimum &#8377;{data.referrerBonus > 0 ? '100' : '0'}</p>
            <p style={{ margin: 0 }}>4. You get <strong style={{ color: '#7c3aed' }}>&#8377;{data.referrerBonus}</strong> and your friend gets <strong style={{ color: '#10b981' }}>&#8377;{data.refereeBonus}</strong></p>
          </div>
        </div>

        {/* Apply Code */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 24, border: '1px solid #f0e6ff' }}>
          <h4 style={{ margin: '0 0 12px', color: '#1a0533' }}>Have a referral code?</h4>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter code" style={{ flex: 1, padding: '12px', border: '2px solid #e0d4f5', borderRadius: 10, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 2 }} />
            <button onClick={handleApply} disabled={applying} style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>{applying ? '...' : 'Apply'}</button>
          </div>
        </div>

        {/* History */}
        {data.history?.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 12px' }}>Referral History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.history.map((h, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #f0e6ff', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{h.refereeName || 'User'}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>{h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN') : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600, background: h.status === 'completed' ? '#d1fae5' : '#fef3c7', color: h.status === 'completed' ? '#065f46' : '#92400e' }}>{h.status}</span>
                    {h.status === 'completed' && <p style={{ margin: '4px 0 0', color: '#059669', fontWeight: 600, fontSize: '0.9rem' }}>+&#8377;{h.referrer_bonus}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferEarn;
