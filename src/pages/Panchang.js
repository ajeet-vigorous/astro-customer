import React, { useState, useEffect } from 'react';
import { kundaliApi } from '../api/services';
import './Panchang.css';

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
    setSelectedDate('today');
    setCustomDate('');
    fetchPanchang('today');
  };

  const handleTomorrow = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const iso = tmr.toISOString().split('T')[0];
    setSelectedDate('tomorrow');
    setCustomDate(iso);
    fetchPanchang(iso);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setCustomDate(val);
    setSelectedDate('custom');
    setShowCalendar(false);
    fetchPanchang(val);
  };

  const resp = data?.response || data;

  const getTitle = () => {
    if (selectedDate === 'tomorrow') return "Tomorrow's Panchang (Kal Ka Panchang)";
    if (selectedDate === 'custom' && customDate) return `Panchang for ${new Date(customDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    return "Today's Panchang (Aaj Ka Panchang)";
  };

  return (
    <div className="panchang-page">
      <div className="list-hero">
        <h2>{getTitle()}</h2>
        <p>Daily Panchang based on Vijay Vishwa Panchang — Tithi, Nakshatra, Yoga, and auspicious timings</p>
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
        ) : resp?.tithi ? (
          <div className="panchang-grid">
            {/* Left: Panchang details */}
            <div className="panchang-card">
              <div className="panchang-card-header">Panchang</div>
              <div className="panchang-card-body">
                <div className="panchang-row"><span className="panchang-label">Tithi</span><span className="panchang-value">{resp.tithi?.name || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Nakshatra</span><span className="panchang-value">{resp.nakshatra?.name || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Yoga</span><span className="panchang-value">{resp.yoga?.name || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Karana</span><span className="panchang-value">{resp.karana?.name || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Rasi</span><span className="panchang-value">{resp.rasi?.name || '-'}</span></div>
              </div>
            </div>

            {/* Right: Additional info */}
            <div className="panchang-card">
              <div className="panchang-card-header">Additional Info</div>
              <div className="panchang-card-body">
                <div className="panchang-row"><span className="panchang-label">Sunrise</span><span className="panchang-value">{resp.advanced_details?.sun_rise || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Sunset</span><span className="panchang-value">{resp.advanced_details?.sun_set || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Moonrise</span><span className="panchang-value">{resp.advanced_details?.moon_rise || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Moonset</span><span className="panchang-value">{resp.advanced_details?.moon_set || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Next Full Moon</span><span className="panchang-value">{resp.advanced_details?.next_full_moon || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Next New Moon</span><span className="panchang-value">{resp.advanced_details?.next_new_moon || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Amanta Month</span><span className="panchang-value">{resp.advanced_details?.masa?.amanta_name || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Paksha</span><span className="panchang-value">{resp.advanced_details?.masa?.paksha || '-'}</span></div>
                <div className="panchang-row"><span className="panchang-label">Purnimanta</span><span className="panchang-value">{resp.advanced_details?.masa?.purnimanta_name || '-'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">No Panchang data found for this date</div>
        )}
      </div>
    </div>
  );
};

export default Panchang;
