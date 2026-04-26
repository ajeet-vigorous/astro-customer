import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { horoscopeApi } from '../api/services';
import './Horoscope.css';

const DailyHoroscope = () => {
  const { signId, sign } = useParams();
  const [vedicList, setVedicList] = useState(null);
  const [tab, setTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('en');
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    horoscopeApi.getEnabledLanguages().then(res => {
      const list = res.data?.recordList || [];
      setLanguages(list.length ? list : [{ code: 'en', name: 'English' }]);
    }).catch(() => setLanguages([{ code: 'en', name: 'English' }]));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await horoscopeApi.getDaily({ horoscopeSignId: signId, langcode: lang });
        const d = res.data?.data || res.data;
        setVedicList(d?.vedicList || d || null);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [signId, lang]);

  // Defensive picker: try multiple field-name conventions API might use
  const pickList = (...fields) => {
    if (!vedicList) return [];
    for (const f of fields) {
      const v = vedicList[f];
      if (Array.isArray(v) && v.length) return v;
    }
    return [];
  };

  const getActiveData = () => {
    if (!vedicList) return null;
    switch (tab) {
      case 'daily':
        return pickList('todayHoroscope', 'dailyHoroscope', 'daily', 'today')[0] || null;
      case 'weekly':
        return pickList('weeklyHoroScope', 'weeklyHoroscope', 'weekly')[0] || null;
      case 'yearly':
        return pickList('yearlyHoroScope', 'yearlyHoroscope', 'yearly')[0] || null;
      default:
        return null;
    }
  };

  const data = getActiveData();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="daily-horo-page">
      <div className="list-hero">
        <h2 className="capitalize">{data?.zodiac || sign} Horoscope</h2>
        <p>Your {tab} horoscope prediction</p>
      </div>
      <div className="container">
        <div className="horo-nav">
          <Link to="/horoscope">&larr; All Signs</Link>
        </div>
        <div className="horo-tabs-row">
          <div className="horo-tabs">
            {['daily', 'weekly', 'yearly'].map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
            {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>
        ) : data ? (
          <div className="horo-content">
            {/* Date info */}
            {tab === 'daily' && data.date && <p className="horo-date">Date: {formatDate(data.date)}</p>}
            {tab === 'weekly' && data.start_date && data.end_date && <p className="horo-date">Week: {formatDate(data.start_date)} - {formatDate(data.end_date)}</p>}
            {tab === 'yearly' && data.month_range && <p className="horo-date">Period: {data.month_range}</p>}

            {/* Prediction text */}
            {data.bot_response && (
              <div className="horo-text">
                <p>{data.bot_response}</p>
              </div>
            )}

            {/* Score grid */}
            <div className="horo-scores-grid">
              {data.career != null && <div className="horo-score-item"><span className="score-label">Career</span><span className="score-value">{data.career}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.relationship != null && <div className="horo-score-item"><span className="score-label">Relationship</span><span className="score-value">{data.relationship}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.health != null && <div className="horo-score-item"><span className="score-label">Health</span><span className="score-value">{data.health}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.finances != null && <div className="horo-score-item"><span className="score-label">Finances</span><span className="score-value">{data.finances}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.family != null && <div className="horo-score-item"><span className="score-label">Family</span><span className="score-value">{data.family}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.friends != null && <div className="horo-score-item"><span className="score-label">Friends</span><span className="score-value">{data.friends}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.travel != null && <div className="horo-score-item"><span className="score-label">Travel</span><span className="score-value">{data.travel}{tab === 'yearly' ? '%' : ''}</span></div>}
              {data.status != null && <div className="horo-score-item"><span className="score-label">Status</span><span className="score-value">{data.status}{tab === 'yearly' ? '%' : ''}</span></div>}
            </div>

            {/* Lucky info */}
            {(data.lucky_color || data.lucky_number || data.total_score) && (
              <div className="horo-lucky-row">
                {data.total_score && <div className="horo-lucky"><strong>Score:</strong> {data.total_score}</div>}
                {data.lucky_color && (
                  <div className="horo-lucky">
                    <strong>Lucky Color:</strong> {data.lucky_color}
                    {data.lucky_color_code && <span className="color-dot" style={{ backgroundColor: data.lucky_color_code }}></span>}
                  </div>
                )}
                {data.lucky_number && <div className="horo-lucky"><strong>Lucky Number:</strong> {typeof data.lucky_number === 'string' && data.lucky_number.startsWith('[') ? JSON.parse(data.lucky_number).join(', ') : data.lucky_number}</div>}
              </div>
            )}

            {/* Yearly remarks — all 8 fields like Laravel */}
            {tab === 'yearly' && (data.health_remark || data.career_remark || data.relationship_remark || data.travel_remark || data.family_remark || data.friends_remark || data.finances_remark || data.status_remark) && (
              <div className="horo-remarks">
                {data.health_remark && <div className="remark-item"><strong>Health:</strong> <p>{data.health_remark}</p></div>}
                {data.career_remark && <div className="remark-item"><strong>Career:</strong> <p>{data.career_remark}</p></div>}
                {data.relationship_remark && <div className="remark-item"><strong>Relationship:</strong> <p>{data.relationship_remark}</p></div>}
                {data.travel_remark && <div className="remark-item"><strong>Travel:</strong> <p>{data.travel_remark}</p></div>}
                {data.family_remark && <div className="remark-item"><strong>Family:</strong> <p>{data.family_remark}</p></div>}
                {data.friends_remark && <div className="remark-item"><strong>Friends:</strong> <p>{data.friends_remark}</p></div>}
                {data.finances_remark && <div className="remark-item"><strong>Finances:</strong> <p>{data.finances_remark}</p></div>}
                {data.status_remark && <div className="remark-item"><strong>Status:</strong> <p>{data.status_remark}</p></div>}
              </div>
            )}
          </div>
        ) : (
          <div className="no-data">No horoscope data available for this period</div>
        )}
      </div>
    </div>
  );
};

export default DailyHoroscope;
