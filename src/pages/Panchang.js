import React, { useState, useEffect } from 'react';
import { kundaliApi } from '../api/services';
import './Panchang.css';

// Reusable card wrapper
const Card = ({ title, icon, accent = '#7c3aed', children, accentBg }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: `4px solid ${accent}`, padding: 18, marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent, margin: '0 0 14px', fontSize: '1.05rem', fontWeight: 700, paddingBottom: 10, borderBottom: '2px solid #f3f0fa' }}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span> {title}
    </h3>
    <div style={{ background: accentBg }}>{children}</div>
  </div>
);

// Key-Value row component
const KV = ({ label, value, highlight }) => {
  if (value === undefined || value === null || value === '' || value === '-') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px dashed #f0e6ff' }}>
      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
      <span style={{ color: highlight || '#1a0533', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word' }}>{String(value)}</span>
    </div>
  );
};

const Panchang = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);

  const fetchPanchang = async (dateParam) => {
    setLoading(true);
    try {
      const params = { lang: 'en' };
      if (dateParam && dateParam !== 'today') {
        const d = new Date(dateParam);
        params.date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
      const res = await kundaliApi.getPanchang(params);
      const d = res.data?.data || res.data;
      setData(d);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPanchang('today'); }, []);

  const handleToday = () => {
    setSelectedDate('today'); setCustomDate(''); fetchPanchang('today');
  };
  const handleTomorrow = () => {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    const iso = tmr.toISOString().split('T')[0];
    setSelectedDate('tomorrow'); setCustomDate(iso); fetchPanchang(iso);
  };
  const handleDateChange = (e) => {
    const val = e.target.value;
    setCustomDate(val); setSelectedDate('custom'); setShowCalendar(false); fetchPanchang(val);
  };

  const resp = data?.response || data;

  const getTitle = () => {
    if (selectedDate === 'tomorrow') return "Tomorrow's Panchang (Kal Ka Panchang)";
    if (selectedDate === 'custom' && customDate) return `Panchang for ${new Date(customDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    return "Today's Panchang (Aaj Ka Panchang)";
  };

  // Helper — extract from common shapes
  const adv = resp?.advanced_details || {};
  const masa = adv?.masa || {};
  const years = adv?.years || {};
  const sunPos = resp?.sun_position || {};
  const moonPos = resp?.moon_position || {};

  return (
    <div className="panchang-page">
      <div className="list-hero">
        <h2>{getTitle()}</h2>
        <p>Daily Panchang — Tithi, Nakshatra, Yoga, Karana, Muhurat & Hindu calendar details</p>
      </div>
      <div className="container">
        {/* Date selector */}
        <div className="panchang-date-bar">
          <button className={selectedDate === 'today' ? 'active' : ''} onClick={handleToday}>Today</button>
          <button className={selectedDate === 'tomorrow' ? 'active' : ''} onClick={handleTomorrow}>Tomorrow</button>
          <button className={showCalendar || selectedDate === 'custom' ? 'active' : ''} onClick={() => setShowCalendar(!showCalendar)}>
            Calendar ▾
          </button>
          {showCalendar && (
            <input type="date" className="panchang-date-input" value={customDate} onChange={handleDateChange} autoFocus />
          )}
        </div>

        {loading ? (
          <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>
        ) : !resp?.tithi ? (
          <div className="no-data">No Panchang data found for this date</div>
        ) : (
          <>
            {/* Hero info banner */}
            <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderRadius: 14, padding: 22, marginBottom: 16, textAlign: 'center', border: '1px solid #f0e6ff' }}>
              <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{resp.day?.name || '-'}</div>
              <div style={{ fontSize: '1.6rem', color: '#1a0533', fontWeight: 700, margin: '6px 0' }}>{resp.date || '-'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12, fontSize: '0.85rem' }}>
                {resp.tithi?.type && <span style={{ background: '#fff', padding: '4px 12px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{resp.tithi.type} Paksha</span>}
                {masa.amanta_name && <span style={{ background: '#fff', padding: '4px 12px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{masa.amanta_name} Month</span>}
                {masa.ritu && <span style={{ background: '#fff', padding: '4px 12px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{masa.ritu} Ritu</span>}
                {adv.vaara && <span style={{ background: '#fff', padding: '4px 12px', borderRadius: 50, color: '#7c3aed', fontWeight: 600, border: '1px solid #e0d4f5' }}>{adv.vaara}</span>}
              </div>
            </div>

            {/* 5 Limbs of Panchang — 2-col layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Tithi */}
              {resp.tithi && (
                <Card title="Tithi (Lunar Day)" icon="🌒" accent="#7c3aed">
                  <KV label="Name" value={resp.tithi.name} highlight="#7c3aed" />
                  <KV label="Number" value={resp.tithi.number} />
                  <KV label="Paksha" value={resp.tithi.type} />
                  <KV label="Deity" value={resp.tithi.diety} />
                  <KV label="Start" value={resp.tithi.start} />
                  <KV label="End" value={resp.tithi.end} />
                  <KV label="Next Tithi" value={resp.tithi.next_tithi} />
                  {resp.tithi.meaning && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '10px 0 4px', fontStyle: 'italic', lineHeight: 1.5 }}><strong>Meaning:</strong> {resp.tithi.meaning}</p>}
                  {resp.tithi.special && <p style={{ fontSize: '0.78rem', color: '#7c3aed', margin: '6px 0 0', lineHeight: 1.5 }}><strong>Special:</strong> {resp.tithi.special}</p>}
                </Card>
              )}

              {/* Nakshatra */}
              {resp.nakshatra && (
                <Card title="Nakshatra (Star)" icon="⭐" accent="#ec4899">
                  <KV label="Name" value={resp.nakshatra.name} highlight="#ec4899" />
                  <KV label="Number" value={resp.nakshatra.number} />
                  <KV label="Pada" value={resp.nakshatra.pada} />
                  <KV label="Lord" value={resp.nakshatra.lord} />
                  <KV label="Deity" value={resp.nakshatra.diety} />
                  <KV label="Start" value={resp.nakshatra.start} />
                  <KV label="End" value={resp.nakshatra.end} />
                  <KV label="Next Nakshatra" value={resp.nakshatra.next_nakshatra} />
                  <KV label="Auspicious Direction" value={Array.isArray(resp.nakshatra.auspicious_disha) ? resp.nakshatra.auspicious_disha.join(', ') : resp.nakshatra.auspicious_disha} />
                  {resp.nakshatra.meaning && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '10px 0 4px', fontStyle: 'italic', lineHeight: 1.5 }}><strong>Meaning:</strong> {resp.nakshatra.meaning}</p>}
                  {resp.nakshatra.special && <p style={{ fontSize: '0.78rem', color: '#ec4899', margin: '6px 0 4px', lineHeight: 1.5 }}><strong>Special:</strong> {resp.nakshatra.special}</p>}
                  {resp.nakshatra.summary && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>{resp.nakshatra.summary}</p>}
                </Card>
              )}

              {/* Yoga */}
              {resp.yoga && (
                <Card title="Yoga" icon="🧘" accent="#0ea5e9">
                  <KV label="Name" value={resp.yoga.name} highlight="#0ea5e9" />
                  <KV label="Number" value={resp.yoga.number} />
                  <KV label="Start" value={resp.yoga.start} />
                  <KV label="End" value={resp.yoga.end} />
                  <KV label="Next Yoga" value={resp.yoga.next_yoga} />
                  {resp.yoga.meaning && <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '10px 0 4px', fontStyle: 'italic', lineHeight: 1.5 }}><strong>Meaning:</strong> {resp.yoga.meaning}</p>}
                  {resp.yoga.special && <p style={{ fontSize: '0.78rem', color: '#0ea5e9', margin: '6px 0 0', lineHeight: 1.5 }}><strong>Special:</strong> {resp.yoga.special}</p>}
                </Card>
              )}

              {/* Karana */}
              {resp.karana && (
                <Card title="Karana" icon="⏳" accent="#10b981">
                  <KV label="Name" value={resp.karana.name} highlight="#10b981" />
                  <KV label="Number" value={resp.karana.number} />
                  <KV label="Type" value={resp.karana.type} />
                  <KV label="Lord" value={resp.karana.lord} />
                  <KV label="Deity" value={resp.karana.diety} />
                  <KV label="Start" value={resp.karana.start} />
                  <KV label="End" value={resp.karana.end} />
                  <KV label="Next Karana" value={resp.karana.next_karana} />
                  {resp.karana.special && <p style={{ fontSize: '0.78rem', color: '#10b981', margin: '10px 0 0', lineHeight: 1.5 }}><strong>Special:</strong> {resp.karana.special}</p>}
                </Card>
              )}
            </div>

            {/* Sun, Moon & Auspicious Time */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              {/* Sun & Moon Times */}
              <Card title="Sunrise / Sunset / Moon" icon="🌅" accent="#f59e0b">
                <KV label="Sunrise" value={adv.sun_rise} highlight="#f59e0b" />
                <KV label="Sunset" value={adv.sun_set} />
                <KV label="Moonrise" value={adv.moon_rise} />
                <KV label="Moonset" value={adv.moon_set} />
                <KV label="Next Full Moon" value={adv.next_full_moon} />
                <KV label="Next New Moon" value={adv.next_new_moon} />
              </Card>

              {/* Auspicious Time */}
              {adv.abhijit_muhurta && (
                <Card title="Auspicious Muhurat" icon="✨" accent="#10b981" accentBg="#f0fdf4">
                  <KV label="Abhijit Muhurta Start" value={adv.abhijit_muhurta.start} highlight="#10b981" />
                  <KV label="Abhijit Muhurta End" value={adv.abhijit_muhurta.end} />
                  <p style={{ fontSize: '0.78rem', color: '#15803d', margin: '12px 0 0', lineHeight: 1.5, padding: '8px 12px', background: '#dcfce7', borderRadius: 6 }}>
                    💡 Abhijit Muhurta is the most auspicious time of the day — ideal for new beginnings, important decisions.
                  </p>
                </Card>
              )}

              {/* INAUSPICIOUS times */}
              <Card title="Inauspicious Times" icon="⚠️" accent="#dc2626" accentBg="#fef2f2">
                <KV label="Rahukaal" value={resp.rahukaal} highlight="#dc2626" />
                <KV label="Gulika Kaal" value={resp.gulika} />
                <KV label="Yamakanta Kaal" value={resp.yamakanta} />
                <p style={{ fontSize: '0.78rem', color: '#991b1b', margin: '12px 0 0', lineHeight: 1.5, padding: '8px 12px', background: '#fee2e2', borderRadius: 6 }}>
                  ⚠ Avoid important new work during these times. Especially Rahukaal — most malefic.
                </p>
              </Card>
            </div>

            {/* Sun & Moon Positions */}
            {(sunPos.zodiac || moonPos.moon_degree !== undefined) && (
              <Card title="Sun & Moon Position" icon="☀️" accent="#f59e0b">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '4px 24px' }}>
                  <div>
                    <KV label="Sun Zodiac" value={sunPos.zodiac} highlight="#f59e0b" />
                    <KV label="Sun Nakshatra" value={sunPos.nakshatra} />
                    <KV label="Sun Degree at Rise" value={typeof sunPos.sun_degree_at_rise === 'number' ? `${sunPos.sun_degree_at_rise.toFixed(2)}°` : sunPos.sun_degree_at_rise} />
                  </div>
                  <div>
                    <KV label="Moon Rasi" value={resp.rasi?.name} highlight="#7c3aed" />
                    <KV label="Moon Degree" value={typeof moonPos.moon_degree === 'number' ? `${moonPos.moon_degree.toFixed(2)}°` : moonPos.moon_degree} />
                    <KV label="Moon Phase" value={masa.moon_phase} />
                    <KV label="Yogini Nivas" value={adv.moon_yogini_nivas} />
                  </div>
                </div>
              </Card>
            )}

            {/* Hindu Calendar Info */}
            <Card title="Hindu Calendar" icon="📅" accent="#7c3aed">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '4px 24px' }}>
                <div>
                  <KV label="Vikram Samvat" value={years.vikram_samvaat ? `${years.vikram_samvaat} (${years.vikram_samvaat_name || ''})` : null} highlight="#7c3aed" />
                  <KV label="Saka Samvat" value={years.saka ? `${years.saka} (${years.saka_samvaat_name || ''})` : null} />
                  <KV label="Kali Samvat" value={years.kali ? `${years.kali} (${years.kali_samvaat_name || ''})` : null} />
                  <KV label="Ayanamsa" value={resp.ayanamsa?.name} />
                </div>
                <div>
                  <KV label="Amanta Month" value={masa.amanta_name} />
                  <KV label="Amanta Period" value={masa.amanta_start && masa.amanta_end ? `${masa.amanta_start} → ${masa.amanta_end}` : null} />
                  <KV label="Purnimanta Month" value={masa.purnimanta_name} />
                  <KV label="Purnimanta Period" value={masa.purnimanta_start && masa.purnimanta_end ? `${masa.purnimanta_start} → ${masa.purnimanta_end}` : null} />
                </div>
                <div>
                  <KV label="Paksha" value={masa.paksha} />
                  <KV label="Ritu (Season)" value={masa.ritu} />
                  <KV label="Ayana" value={masa.ayana} />
                  <KV label="Adhik Maasa" value={masa.adhik_maasa === true ? 'Yes' : masa.adhik_maasa === false ? 'No' : null} />
                  <KV label="Tamil Month" value={masa.tamil_month} />
                  <KV label="Tamil Day" value={masa.tamil_day} />
                </div>
              </div>
            </Card>

            {/* Direction (Disha Shool) */}
            {(adv.disha_shool || resp.nakshatra?.auspicious_disha) && (
              <Card title="Directions" icon="🧭" accent="#0ea5e9">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '4px 24px' }}>
                  <div>
                    {adv.disha_shool && (
                      <div style={{ background: '#fef2f2', padding: 12, borderRadius: 8, border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '0.72rem', color: '#7f1d1d', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>⚠ Avoid Travel Direction (Disha Shool)</div>
                        <div style={{ fontSize: '1.2rem', color: '#dc2626', fontWeight: 700 }}>{adv.disha_shool}</div>
                      </div>
                    )}
                  </div>
                  <div>
                    {resp.nakshatra?.auspicious_disha && (
                      <div style={{ background: '#dcfce7', padding: 12, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#14532d', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>✓ Auspicious Directions</div>
                        <div style={{ fontSize: '1rem', color: '#166534', fontWeight: 700 }}>
                          {Array.isArray(resp.nakshatra.auspicious_disha) ? resp.nakshatra.auspicious_disha.join(' · ') : resp.nakshatra.auspicious_disha}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Footer note */}
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>
              💡 Panchang times computed for current location. Tithi/Nakshatra times shown in 12-hour format.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Panchang;
