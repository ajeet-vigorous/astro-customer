import React, { useState } from 'react';
import { astroApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

// =============================================================
// Reusable cards
// =============================================================
const Card = ({ title, icon, accent = '#7c3aed', children, accentBg }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: `4px solid ${accent}`, padding: 18, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent, margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 700, paddingBottom: 10, borderBottom: '2px solid #f3f0fa' }}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span> {title}
    </h3>
    <div style={{ background: accentBg }}>{children}</div>
  </div>
);

const KV = ({ label, value, highlight }) => {
  if (value === undefined || value === null || value === '' || value === '-') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px dashed #f0e6ff' }}>
      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: highlight || '#1a0533', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word' }}>{String(value)}</span>
    </div>
  );
};

const NumberBadge = ({ n, color = '#7c3aed' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: color, color: '#fff', fontSize: '1.7rem', fontWeight: 700, boxShadow: `0 4px 12px ${color}40` }}>
    {n}
  </div>
);

// Map each card to a glyph (suit-based)
const cardGlyph = (arcana) => {
  if (arcana === 'Major') return '✦';
  if (arcana === 'Wands') return '🔥';
  if (arcana === 'Cups') return '💧';
  if (arcana === 'Swords') return '⚔';
  if (arcana === 'Pentacles') return '⭐';
  return '🃏';
};
const cardAccent = (arcana) => {
  if (arcana === 'Major') return '#7c3aed';
  if (arcana === 'Wands') return '#dc2626';
  if (arcana === 'Cups') return '#0ea5e9';
  if (arcana === 'Swords') return '#6b7280';
  if (arcana === 'Pentacles') return '#f59e0b';
  return '#7c3aed';
};

const AstroServices = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('numerology');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [numForm, setNumForm] = useState({ name: '', date: '' });
  const [muhDate, setMuhDate] = useState('');
  const [transForm, setTransForm] = useState({ dob: '', tob: '' });
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

  // =============================================================
  // RICH NUMEROLOGY RENDER
  // =============================================================
  const renderNumerology = () => {
    const d = result.data;
    if (!d) return <p>No data</p>;

    // Common VedicAstroAPI numerology field shapes — defensive extraction
    const numbers = [];
    const pickNumber = (key, label, color = '#7c3aed') => {
      const obj = d[key];
      if (!obj) return;
      const n = typeof obj === 'object' ? (obj.number ?? obj.value ?? obj.num) : obj;
      const meaning = typeof obj === 'object' ? (obj.meaning || obj.description || obj.report || obj.prediction) : null;
      if (n !== undefined && n !== null) numbers.push({ key, label, number: n, meaning, color });
    };

    pickNumber('destiny_number', 'Destiny Number', '#7c3aed');
    pickNumber('fadic_number', 'Fadic / Birth Number', '#ec4899');
    pickNumber('lo_shu_grid', 'Lo Shu Grid', '#0ea5e9');
    pickNumber('soul_urge_number', 'Soul Urge Number', '#10b981');
    pickNumber('personality_number', 'Personality Number', '#f59e0b');
    pickNumber('expression_number', 'Expression Number', '#dc2626');

    // Lucky info
    const luckyColors = d.lucky_colors || d.lucky_color;
    const luckyDays = d.lucky_days || d.lucky_day;
    const luckyGems = d.lucky_gems || d.lucky_gem;
    const luckyMetals = d.lucky_metals || d.lucky_metal;
    const luckyDirections = d.lucky_directions || d.lucky_direction;
    const luckyDeities = d.lucky_deities || d.lucky_deity;
    const luckyMantras = d.lucky_mantras || d.lucky_mantra;
    const conclusion = d.conclusion || d.bot_response || d.report || d.summary;

    const renderArr = (val) => Array.isArray(val) ? val.join(', ') : (val ? String(val) : null);

    return (
      <div>
        <h3 style={{ marginTop: 0, color: '#7c3aed' }}>🔢 Your Numerology Report</h3>

        {/* Big number badges grid */}
        {numbers.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 18 }}>
            {numbers.map((n, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f0e6ff', borderTop: `4px solid ${n.color}`, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <NumberBadge n={n.number} color={n.color} />
                <h4 style={{ color: n.color, margin: '12px 0 8px', fontSize: '0.95rem', fontWeight: 700 }}>{n.label}</h4>
                {n.meaning && <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{n.meaning}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Lucky info card */}
        {(luckyColors || luckyDays || luckyGems || luckyMetals || luckyDirections || luckyDeities) && (
          <Card title="Your Lucky Info" icon="🍀" accent="#10b981">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 24px' }}>
              <KV label="Lucky Colors" value={renderArr(luckyColors)} highlight="#7c3aed" />
              <KV label="Lucky Days" value={renderArr(luckyDays)} />
              <KV label="Lucky Gems" value={renderArr(luckyGems)} />
              <KV label="Lucky Metals" value={renderArr(luckyMetals)} />
              <KV label="Lucky Directions" value={renderArr(luckyDirections)} />
              <KV label="Lucky Deities" value={renderArr(luckyDeities)} />
            </div>
            {luckyMantras && (
              <div style={{ marginTop: 12, background: '#f0fdf4', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <strong style={{ color: '#166534', fontSize: '0.85rem' }}>🕉 Lucky Mantras:</strong>
                <p style={{ margin: '4px 0 0', color: '#374151', fontSize: '0.85rem', lineHeight: 1.6 }}>{renderArr(luckyMantras)}</p>
              </div>
            )}
          </Card>
        )}

        {/* Conclusion */}
        {conclusion && (
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderLeft: '4px solid #7c3aed', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
            <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 6 }}>📜 Conclusion</strong>
            <p style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>{String(conclusion)}</p>
          </div>
        )}

        {/* Other unrecognized fields — fallback */}
        {Object.entries(d).filter(([k]) => !['destiny_number','fadic_number','lo_shu_grid','soul_urge_number','personality_number','expression_number','lucky_colors','lucky_color','lucky_days','lucky_day','lucky_gems','lucky_gem','lucky_metals','lucky_metal','lucky_directions','lucky_direction','lucky_deities','lucky_deity','lucky_mantras','lucky_mantra','conclusion','bot_response','report','summary'].includes(k)).map(([k, v]) => v && (
          <div key={k} style={{ marginBottom: 10, background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #f0e6ff' }}>
            <strong style={{ color: '#7c3aed', textTransform: 'capitalize', fontSize: '0.85rem' }}>{k.replace(/_/g, ' ')}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>{typeof v === 'object' ? (v.meaning || v.description || JSON.stringify(v)) : String(v)}</p>
          </div>
        ))}
      </div>
    );
  };

  // =============================================================
  // RICH MUHURAT RENDER (panchang-style)
  // =============================================================
  const renderMuhurat = () => {
    const resp = result.data;
    if (!resp) return <p>No data</p>;
    const adv = resp.advanced_details || {};
    const masa = adv.masa || {};

    return (
      <div>
        <h3 style={{ marginTop: 0, color: '#7c3aed' }}>🕐 Muhurat & Panchang for {resp.date || ''}</h3>

        {/* Hero day banner */}
        <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderRadius: 14, padding: 18, marginBottom: 16, textAlign: 'center', border: '1px solid #f0e6ff' }}>
          <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase' }}>{resp.day?.name || '-'}</div>
          <div style={{ fontSize: '1.4rem', color: '#1a0533', fontWeight: 700, margin: '6px 0' }}>{resp.date || '-'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8, fontSize: '0.8rem' }}>
            {resp.tithi?.type && <span style={{ background: '#fff', padding: '3px 10px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{resp.tithi.type} Paksha</span>}
            {masa.amanta_name && <span style={{ background: '#fff', padding: '3px 10px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{masa.amanta_name}</span>}
            {masa.ritu && <span style={{ background: '#fff', padding: '3px 10px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{masa.ritu}</span>}
          </div>
        </div>

        {/* Main 5 limbs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
          {resp.tithi && (
            <Card title="Tithi" icon="🌒" accent="#7c3aed">
              <KV label="Name" value={resp.tithi.name} highlight="#7c3aed" />
              <KV label="Paksha" value={resp.tithi.type} />
              <KV label="Deity" value={resp.tithi.diety} />
              <KV label="Start" value={resp.tithi.start} />
              <KV label="End" value={resp.tithi.end} />
              {resp.tithi.special && <p style={{ fontSize: '0.78rem', color: '#7c3aed', margin: '8px 0 0' }}>✦ {resp.tithi.special}</p>}
            </Card>
          )}
          {resp.nakshatra && (
            <Card title="Nakshatra" icon="⭐" accent="#ec4899">
              <KV label="Name" value={resp.nakshatra.name} highlight="#ec4899" />
              <KV label="Pada" value={resp.nakshatra.pada} />
              <KV label="Lord" value={resp.nakshatra.lord} />
              <KV label="Start" value={resp.nakshatra.start} />
              <KV label="End" value={resp.nakshatra.end} />
              {resp.nakshatra.auspicious_disha && <KV label="Auspicious Direction" value={Array.isArray(resp.nakshatra.auspicious_disha) ? resp.nakshatra.auspicious_disha.join(', ') : resp.nakshatra.auspicious_disha} />}
            </Card>
          )}
          {resp.yoga && (
            <Card title="Yoga" icon="🧘" accent="#0ea5e9">
              <KV label="Name" value={resp.yoga.name} highlight="#0ea5e9" />
              <KV label="Start" value={resp.yoga.start} />
              <KV label="End" value={resp.yoga.end} />
              {resp.yoga.special && <p style={{ fontSize: '0.78rem', color: '#0ea5e9', margin: '8px 0 0' }}>✦ {resp.yoga.special}</p>}
            </Card>
          )}
          {resp.karana && (
            <Card title="Karana" icon="⏳" accent="#10b981">
              <KV label="Name" value={resp.karana.name} highlight="#10b981" />
              <KV label="Type" value={resp.karana.type} />
              <KV label="Lord" value={resp.karana.lord} />
              {resp.karana.special && <p style={{ fontSize: '0.78rem', color: '#10b981', margin: '8px 0 0' }}>✦ {resp.karana.special}</p>}
            </Card>
          )}
        </div>

        {/* Auspicious + Inauspicious times */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 14 }}>
          {adv.abhijit_muhurta && (
            <Card title="✨ Auspicious Muhurat" icon="✨" accent="#10b981" accentBg="#f0fdf4">
              <KV label="Abhijit Start" value={adv.abhijit_muhurta.start} highlight="#10b981" />
              <KV label="Abhijit End" value={adv.abhijit_muhurta.end} />
              <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '10px 0 0', padding: '8px 10px', background: '#dcfce7', borderRadius: 6 }}>
                💡 Most auspicious time of day — ideal for new beginnings
              </p>
            </Card>
          )}
          <Card title="⚠ Inauspicious Times" icon="⚠️" accent="#dc2626" accentBg="#fef2f2">
            <KV label="Rahukaal" value={resp.rahukaal} highlight="#dc2626" />
            <KV label="Gulika Kaal" value={resp.gulika} />
            <KV label="Yamakanta" value={resp.yamakanta} />
            <p style={{ fontSize: '0.78rem', color: '#991b1b', margin: '10px 0 0', padding: '8px 10px', background: '#fee2e2', borderRadius: 6 }}>
              ⚠ Avoid important new work during these times
            </p>
          </Card>
        </div>

        {/* Sun/Moon times */}
        <Card title="Sunrise / Sunset" icon="🌅" accent="#f59e0b">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px 24px' }}>
            <div>
              <KV label="Sunrise" value={adv.sun_rise} highlight="#f59e0b" />
              <KV label="Sunset" value={adv.sun_set} />
            </div>
            <div>
              <KV label="Moonrise" value={adv.moon_rise} />
              <KV label="Moonset" value={adv.moon_set} />
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // =============================================================
  // RICH TAROT RENDER (per-card detailed)
  // =============================================================
  const renderTarot = () => {
    if (!Array.isArray(result.data)) return <p>No tarot data</p>;
    return (
      <div>
        <h3 style={{ marginTop: 0, textAlign: 'center', color: '#7c3aed' }}>🃏 Your 3-Card Tarot Reading</h3>
        <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.85rem', marginBottom: 20 }}>Drawn from a complete 78-card Rider-Waite deck</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {result.data.map((card, i) => {
            const accent = cardAccent(card.arcana);
            const meaning = card.isReversed ? card.reversed : card.meaning;
            return (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 20, textAlign: 'center', border: `2px solid ${accent}33`, borderTop: `4px solid ${accent}`, position: 'relative' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
                  {card.position}
                </div>
                <div style={{ fontSize: '3.5rem', margin: '8px 0', transform: card.isReversed ? 'rotate(180deg)' : 'none', display: 'inline-block', color: accent }}>
                  {cardGlyph(card.arcana)}
                </div>
                <h4 style={{ color: accent, margin: '8px 0 4px', fontSize: '1.05rem', fontWeight: 700 }}>{card.name}</h4>
                {card.arcana && (
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    {card.arcana} Arcana
                  </div>
                )}
                {card.isReversed && (
                  <div style={{ display: 'inline-block', background: '#fee2e2', color: '#b91c1c', padding: '2px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, marginBottom: 8 }}>
                    ↺ Reversed
                  </div>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{meaning}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Enter your name and date of birth to discover your destiny number, lucky numbers and personality traits.</p>
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
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Find auspicious time for any event — full Panchang, Tithi, Nakshatra, Yoga, Karana + Rahu Kaal/Gulika/Yamakanta + Abhijit Muhurat.</p>
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
            <p style={{ color: '#6b7280', marginBottom: 16 }}>Draw 3 cards from full 78-card Rider-Waite deck — Past, Present, Future. 1 free reading per day.</p>
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
          <div style={{ marginTop: 24 }}>
            {result.type === 'numerology' && renderNumerology()}
            {result.type === 'muhurat' && renderMuhurat()}
            {result.type === 'tarot' && renderTarot()}

            {/* Transit + Remedies — basic fallback render */}
            {result.type === 'transit' && (
              <div style={{ background: '#f9f5ff', borderRadius: 14, padding: 24, border: '1px solid #e0d4f5' }}>
                <h3 style={{ marginTop: 0 }}>🪐 Your Moon Sign & Transit</h3>
                {typeof result.data === 'object' && Object.entries(result.data).map(([key, val]) => (
                  <div key={key} style={{ padding: '10px 0', borderBottom: '1px solid #e0d4f5' }}>
                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong>{' '}
                    <span style={{ color: '#6b7280' }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            )}

            {result.type === 'remedies' && (
              <div style={{ background: '#f9f5ff', borderRadius: 14, padding: 24, border: '1px solid #e0d4f5' }}>
                <h3 style={{ marginTop: 0 }}>💎 Dosha Analysis & Remedies</h3>
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
