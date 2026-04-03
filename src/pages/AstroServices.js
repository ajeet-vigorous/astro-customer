import React, { useState } from 'react';
import { astroApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

const AstroServices = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('numerology');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Numerology
  const [numForm, setNumForm] = useState({ name: '', date: '' });
  // Muhurat
  const [muhDate, setMuhDate] = useState('');
  // Transit
  const [transForm, setTransForm] = useState({ dob: '', tob: '' });
  // Remedies
  const [remForm, setRemForm] = useState({ dob: '', tob: '' });

  const formatDate = (d) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

  const handleNumerology = async () => {
    if (!numForm.name || !numForm.date) { toast.error('Enter name and date'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await astroApi.numerology({ name: numForm.name, date: formatDate(numForm.date) });
      if (res.data?.status === 200) setResult({ type: 'numerology', data: res.data.recordList });
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error('Failed'); }
    setLoading(false);
  };

  const handleMuhurat = async () => {
    if (!muhDate) { toast.error('Select date'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await astroApi.muhurat({ date: formatDate(muhDate) });
      if (res.data?.status === 200) setResult({ type: 'muhurat', data: res.data.recordList });
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error('Failed'); }
    setLoading(false);
  };

  const handleTransit = async () => {
    if (!transForm.dob || !transForm.tob) { toast.error('Enter DOB and Time'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await astroApi.transit({ dob: formatDate(transForm.dob), tob: transForm.tob });
      if (res.data?.status === 200) setResult({ type: 'transit', data: res.data.recordList });
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error('Failed'); }
    setLoading(false);
  };

  const handleRemedies = async () => {
    if (!user) { toast.error('Please login'); return; }
    if (!remForm.dob || !remForm.tob) { toast.error('Enter DOB and Time'); return; }
    if (!window.confirm('This will cost ₹149 from your wallet. Continue?')) return;
    setLoading(true); setResult(null);
    try {
      const res = await astroApi.remedies({ dob: formatDate(remForm.dob), tob: remForm.tob });
      if (res.data?.status === 200) setResult({ type: 'remedies', data: res.data.recordList });
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error('Failed'); }
    setLoading(false);
  };

  const handleTarot = async () => {
    if (!user) { toast.error('Please login'); return; }
    setLoading(true); setResult(null);
    try {
      const res = await astroApi.tarot({});
      if (res.data?.status === 200) setResult({ type: 'tarot', data: res.data.recordList });
      else if (res.data?.needPayment) { toast.error(res.data.message); }
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error('Failed'); }
    setLoading(false);
  };

  const tabs = [
    { key: 'numerology', label: 'Numerology', icon: '🔢' },
    { key: 'muhurat', label: 'Muhurat', icon: '🕐' },
    { key: 'transit', label: 'Transit', icon: '🪐' },
    { key: 'tarot', label: 'Tarot', icon: '🃏' },
    { key: 'remedies', label: 'Remedies', icon: '💎' },
  ];

  const inputStyle = { padding: 12, border: '2px solid #e0d4f5', borderRadius: 10, fontSize: '0.95rem', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const btnStyle = { background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', opacity: loading ? 0.5 : 1 };

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">Astro Services</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setResult(null); }} style={{
              padding: '10px 20px', borderRadius: 50, border: activeTab === t.key ? 'none' : '2px solid #e0d4f5',
              background: activeTab === t.key ? '#7c3aed' : '#fff', color: activeTab === t.key ? '#fff' : '#1a0533',
              fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Numerology */}
        {activeTab === 'numerology' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0e6ff' }}>
            <h3 style={{ margin: '0 0 16px' }}>Numerology Analysis</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Enter your name and date of birth to discover your lucky numbers and personality traits.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <input placeholder="Full Name" value={numForm.name} onChange={e => setNumForm({...numForm, name: e.target.value})} style={inputStyle} />
              <input type="date" value={numForm.date} onChange={e => setNumForm({...numForm, date: e.target.value})} style={inputStyle} />
            </div>
            <button onClick={handleNumerology} disabled={loading} style={btnStyle}>{loading ? 'Analyzing...' : 'Get Numerology Report'}</button>
          </div>
        )}

        {/* Muhurat */}
        {activeTab === 'muhurat' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0e6ff' }}>
            <h3 style={{ margin: '0 0 16px' }}>Shubh Muhurat</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Find auspicious time for any event — Rahu Kaal, Gulika, Yamakanta timings.</p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input type="date" value={muhDate} onChange={e => setMuhDate(e.target.value)} style={{ ...inputStyle, maxWidth: 250 }} />
              <button onClick={handleMuhurat} disabled={loading} style={btnStyle}>{loading ? 'Loading...' : 'Get Muhurat'}</button>
            </div>
          </div>
        )}

        {/* Transit */}
        {activeTab === 'transit' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0e6ff' }}>
            <h3 style={{ margin: '0 0 16px' }}>Planet Transit</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>See how current planet positions affect your moon sign.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <input type="date" value={transForm.dob} onChange={e => setTransForm({...transForm, dob: e.target.value})} style={inputStyle} placeholder="Date of Birth" />
              <input type="time" value={transForm.tob} onChange={e => setTransForm({...transForm, tob: e.target.value})} style={inputStyle} />
            </div>
            <button onClick={handleTransit} disabled={loading} style={btnStyle}>{loading ? 'Loading...' : 'Get Transit Report'}</button>
          </div>
        )}

        {/* Tarot */}
        {activeTab === 'tarot' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f0e6ff', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px' }}>Tarot Card Reading</h3>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Draw 3 cards — Past, Present, Future. 1 free reading per day.</p>
            <button onClick={handleTarot} disabled={loading} style={{ ...btnStyle, padding: '16px 40px', fontSize: '1.1rem' }}>{loading ? 'Drawing...' : '🃏 Draw Your Cards'}</button>
          </div>
        )}

        {/* Remedies */}
        {activeTab === 'remedies' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '2px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Dosha Remedies</h3>
              <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem' }}>₹149</span>
            </div>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Get detailed dosha analysis with gemstone, mantra, and puja remedies.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <input type="date" value={remForm.dob} onChange={e => setRemForm({...remForm, dob: e.target.value})} style={inputStyle} />
              <input type="time" value={remForm.tob} onChange={e => setRemForm({...remForm, tob: e.target.value})} style={inputStyle} />
            </div>
            <button onClick={handleRemedies} disabled={loading} style={{ ...btnStyle, background: '#f59e0b' }}>{loading ? 'Analyzing...' : 'Get Remedies Report — ₹149'}</button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ marginTop: 24, background: '#f9f5ff', borderRadius: 14, padding: 24, border: '1px solid #e0d4f5' }}>
            {result.type === 'numerology' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Your Numerology Report</h3>
                {Object.entries(result.data).map(([key, val]) => (
                  <div key={key} style={{ marginBottom: 16, background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e0d4f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ color: '#7c3aed', textTransform: 'capitalize' }}>{val.title || key}</strong>
                      {val.number && <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>#{val.number}</span>}
                    </div>
                    <p style={{ margin: 0, color: '#374151', fontSize: '0.9rem' }}>{val.meaning || val.description || JSON.stringify(val)}</p>
                  </div>
                ))}
              </div>
            )}

            {result.type === 'muhurat' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Muhurat & Timings</h3>
                {Object.entries(result.data).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e0d4f5' }}>
                    <strong style={{ textTransform: 'capitalize', color: '#1a0533' }}>{key.replace(/_/g, ' ')}</strong>
                    <span style={{ color: '#6b7280' }}>{typeof val === 'object' ? (val.start || '') + ' - ' + (val.end || '') : String(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {result.type === 'transit' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Your Moon Sign & Transit</h3>
                {typeof result.data === 'object' && Object.entries(result.data).map(([key, val]) => (
                  <div key={key} style={{ padding: '10px 0', borderBottom: '1px solid #e0d4f5' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> <span style={{ color: '#6b7280' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {result.type === 'tarot' && (
              <div>
                <h3 style={{ marginTop: 0, textAlign: 'center' }}>Your Tarot Cards</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {result.data.map((card, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, textAlign: 'center', border: '2px solid #e0d4f5' }}>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>{card.position}</span>
                      <h4 style={{ color: '#7c3aed', margin: '8px 0' }}>{card.name} {card.isReversed ? '(Reversed)' : ''}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>{card.isReversed ? card.reversed : card.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.type === 'remedies' && (
              <div>
                <h3 style={{ marginTop: 0 }}>Dosha Analysis & Remedies</h3>
                {Object.entries(result.data).map(([key, val]) => val && (
                  <div key={key} style={{ marginBottom: 16, background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e0d4f5' }}>
                    <h4 style={{ color: '#dc2626', margin: '0 0 8px', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</h4>
                    {typeof val === 'object' && Object.entries(val).map(([k, v]) => (
                      <p key={k} style={{ margin: '4px 0', fontSize: '0.85rem' }}><strong>{k.replace(/_/g, ' ')}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AstroServices;
