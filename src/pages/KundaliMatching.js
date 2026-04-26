import React, { useState, useRef } from 'react';
import { kundaliApi } from '../api/services';
import { toast } from 'react-toastify';
import './Kundali.css';

const emptyPerson = {
  name: '',
  gender: 'Male',
  birthDate: '',
  birthTime: '',
  birthPlace: '',
  latitude: '',
  longitude: '',
};

const KOOTA_META = {
  varna:        { label: 'Varna',         max: 1, hint: 'Spiritual / ego compatibility' },
  vasya:        { label: 'Vasya',         max: 2, hint: 'Mutual attraction & control' },
  tara:         { label: 'Tara',          max: 3, hint: 'Birth-star auspiciousness' },
  yoni:         { label: 'Yoni',          max: 4, hint: 'Sexual & physical compatibility' },
  grahamaitri:  { label: 'Graha Maitri',  max: 5, hint: 'Mental compatibility' },
  graha_maitri: { label: 'Graha Maitri',  max: 5, hint: 'Mental compatibility' },
  gana:         { label: 'Gana',          max: 6, hint: 'Temperament harmony' },
  bhakoot:      { label: 'Bhakoot',       max: 7, hint: 'Wealth, family welfare' },
  nadi:         { label: 'Nadi',          max: 8, hint: 'Health & progeny' },
};

const KOOTA_ORDER = ['varna', 'vasya', 'tara', 'yoni', 'grahamaitri', 'graha_maitri', 'gana', 'bhakoot', 'nadi'];

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fb;
};

const pickStr = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return String(v);
  return null;
};

const KundaliMatching = () => {
  const [boy, setBoy] = useState({ ...emptyPerson, gender: 'Male' });
  const [girl, setGirl] = useState({ ...emptyPerson, gender: 'Female' });
  const [matchType, setMatchType] = useState('North');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [boySuggestions, setBoySuggestions] = useState([]);
  const [girlSuggestions, setGirlSuggestions] = useState([]);
  const [boyShow, setBoyShow] = useState(false);
  const [girlShow, setGirlShow] = useState(false);
  const boyDebounce = useRef(null);
  const girlDebounce = useRef(null);

  // ---------------- Charts ----------------
  const [chartStyle, setChartStyle] = useState('north');
  const [chartsLoading, setChartsLoading] = useState(false);
  // Each: { D1: svgString, D9: svgString }
  const [boyCharts, setBoyCharts] = useState({});
  const [girlCharts, setGirlCharts] = useState({});
  const [boyKundaliId, setBoyKundaliId] = useState(null);
  const [girlKundaliId, setGirlKundaliId] = useState(null);

  // Extract SVG/image from various response shapes
  const extractChart = (cd) => {
    if (cd === null || cd === undefined) return null;
    if (typeof cd === 'string') return cd;
    if (typeof cd === 'object') {
      const fields = ['svg', 'svgString', 'svg_string', 'base64Image', 'base64', 'b64',
                      'image_url', 'imageUrl', 'chart_url', 'chartUrl',
                      'chart_image', 'chartImage', 'chart', 'image', 'url', 'src',
                      'data', 'response'];
      for (const f of fields) if (cd[f]) return cd[f];
      const keys = Object.keys(cd);
      if (keys.length === 1 && typeof cd[keys[0]] === 'string') return cd[keys[0]];
    }
    return null;
  };

  // Make SVG responsive (strip XML decl, add viewBox)
  const cleanSvg = (str) => {
    if (typeof str !== 'string') return null;
    const idx = str.indexOf('<svg');
    if (idx < 0) return null;
    return str.substring(idx).replace(/<svg([^>]*)>/, (m, attrs) => {
      const hasViewBox = /viewBox\s*=/i.test(attrs);
      const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
      const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
      let newAttrs = attrs
        .replace(/\bwidth\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '')
        .replace(/\bheight\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '');
      if (!hasViewBox && wMatch && hMatch) newAttrs = ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"` + newAttrs;
      return `<svg width="100%" height="auto" preserveAspectRatio="xMidYMid meet"${newAttrs}>`;
    });
  };

  const fetchOneChart = async (kundaliId, div, style) => {
    try {
      const res = await kundaliApi.getChartReport({ kundaliId, div, style });
      const cd = res.data?.data || res.data;
      return extractChart(cd?.chartDetails);
    } catch { return null; }
  };

  const fetchAllCharts = async (bId, gId, style) => {
    if (!bId || !gId) return;
    setChartsLoading(true);
    const [bD1, bD9, gD1, gD9] = await Promise.all([
      fetchOneChart(bId, 'D1', style),
      fetchOneChart(bId, 'D9', style),
      fetchOneChart(gId, 'D1', style),
      fetchOneChart(gId, 'D9', style),
    ]);
    setBoyCharts({ D1: bD1, D9: bD9 });
    setGirlCharts({ D1: gD1, D9: gD9 });
    setChartsLoading(false);
  };

  const onChangeChartStyle = (s) => {
    setChartStyle(s);
    if (boyKundaliId && girlKundaliId) fetchAllCharts(boyKundaliId, girlKundaliId, s);
  };

  // ---------------- Place autocomplete ----------------
  const onPlaceChange = (which) => (e) => {
    const place = e.target.value;
    const setter = which === 'boy' ? setBoy : setGirl;
    const debRef = which === 'boy' ? boyDebounce : girlDebounce;
    const setSugg = which === 'boy' ? setBoySuggestions : setGirlSuggestions;
    const setShow = which === 'boy' ? setBoyShow : setGirlShow;

    setter(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));
    if (debRef.current) clearTimeout(debRef.current);
    if (place.length < 2) { setSugg([]); setShow(false); return; }

    debRef.current = setTimeout(async () => {
      try {
        const res = await kundaliApi.placeAutocomplete({ query: place });
        const list = res.data?.suggestions || [];
        setSugg(list);
        setShow(list.length > 0);
      } catch { setSugg([]); setShow(false); }
    }, 400);
  };

  const onSelectPlace = (which, suggestion) => {
    const setter = which === 'boy' ? setBoy : setGirl;
    const setSugg = which === 'boy' ? setBoySuggestions : setGirlSuggestions;
    const setShow = which === 'boy' ? setBoyShow : setGirlShow;
    setter(prev => ({
      ...prev,
      birthPlace: suggestion.name,
      latitude: suggestion.lat ? String(suggestion.lat) : '',
      longitude: suggestion.lon ? String(suggestion.lon) : '',
    }));
    setSugg([]); setShow(false);
    if (!suggestion.lat) {
      kundaliApi.geocode({ place: suggestion.name }).then(res => {
        if (res.data?.latitude) {
          setter(prev => ({ ...prev, latitude: String(res.data.latitude), longitude: String(res.data.longitude) }));
        }
      }).catch(() => {});
    }
  };

  // ---------------- Submit ----------------
  const validatePerson = (p, label) => {
    if (!p.name || !p.birthDate || !p.birthTime || !p.birthPlace) {
      toast.error(`Please fill all ${label} details`);
      return false;
    }
    if (!p.latitude || !p.longitude) {
      toast.error(`Pick ${label}'s birth place from suggestions to set location`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePerson(boy, 'Boy') || !validatePerson(girl, 'Girl')) return;

    setLoading(true);
    setResult(null);
    try {
      const [boyRes, girlRes] = await Promise.all([
        kundaliApi.add({ kundali: [{ name: boy.name, gender: 'Male', birthDate: boy.birthDate, birthTime: boy.birthTime, birthPlace: boy.birthPlace, latitude: boy.latitude, longitude: boy.longitude, pdf_type: 'basic' }] }),
        kundaliApi.add({ kundali: [{ name: girl.name, gender: 'Female', birthDate: girl.birthDate, birthTime: girl.birthTime, birthPlace: girl.birthPlace, latitude: girl.latitude, longitude: girl.longitude, pdf_type: 'basic' }] }),
      ]);
      const extractId = (r) => {
        const d = r.data?.data || r.data;
        const rec = d?.recordList;
        return Array.isArray(rec) ? rec[0]?.id : rec?.id;
      };
      const boyId = extractId(boyRes);
      const girlId = extractId(girlRes);
      if (!boyId || !girlId) {
        toast.error('Could not save kundali records. Please try again.');
        setLoading(false);
        return;
      }
      setBoyKundaliId(boyId);
      setGirlKundaliId(girlId);
      // Fetch matching report and all 4 charts in parallel
      const [matchRes] = await Promise.all([
        kundaliApi.matchReport({ maleKundaliId: boyId, femaleKundaliId: girlId, match_type: matchType }),
        fetchAllCharts(boyId, girlId, chartStyle),
      ]);
      const d = matchRes.data?.data || matchRes.data;
      setResult(d);
      toast.success('Matching report generated!');
      setTimeout(() => {
        const el = document.getElementById('match-result-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate matching report');
    }
    setLoading(false);
  };

  const handleReset = () => {
    setBoy({ ...emptyPerson, gender: 'Male' });
    setGirl({ ...emptyPerson, gender: 'Female' });
    setResult(null);
    setBoySuggestions([]); setGirlSuggestions([]);
    setBoyShow(false); setGirlShow(false);
    setBoyCharts({}); setGirlCharts({});
    setBoyKundaliId(null); setGirlKundaliId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Chart card renderer
  const ChartCard = ({ title, svg, accent }) => {
    const cleaned = cleanSvg(svg);
    return (
      <div style={{ background: '#fff', border: `1px solid ${accent}33`, borderTop: `3px solid ${accent}`, borderRadius: 12, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ fontWeight: 700, color: accent, fontSize: '0.85rem', marginBottom: 10, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
        {chartsLoading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 20px', fontSize: '0.85rem' }}>Generating...</div>
        ) : cleaned ? (
          <div style={{ maxWidth: 320, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: cleaned }} />
        ) : svg && typeof svg === 'string' && /^https?:\/\//.test(svg) ? (
          <img src={svg} alt={title} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
        ) : svg && typeof svg === 'string' && svg.startsWith('data:image') ? (
          <img src={svg} alt={title} style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 10px', fontSize: '0.8rem' }}>Chart unavailable</div>
        )}
      </div>
    );
  };

  // ---------------- Person form (inline so place suggestions stay aligned) ----------------
  const renderPerson = (which) => {
    const data = which === 'boy' ? boy : girl;
    const setter = which === 'boy' ? setBoy : setGirl;
    const suggestions = which === 'boy' ? boySuggestions : girlSuggestions;
    const show = which === 'boy' ? boyShow : girlShow;
    const setShow = which === 'boy' ? setBoyShow : setGirlShow;
    const accent = which === 'boy' ? '#3b82f6' : '#ec4899';
    const label = which === 'boy' ? 'Boy' : 'Girl';

    return (
      <div className="match-person" style={{ borderTop: `4px solid ${accent}`, borderRadius: 12, padding: 20, background: '#fff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <h4 style={{ color: accent, borderBottomColor: '#f0e6ff' }}>
          {which === 'boy' ? '👨' : '👩'} {label}'s Birth Details
        </h4>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" value={data.name} onChange={(e) => setter({ ...data, name: e.target.value })} placeholder={`${label}'s name`} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" value={data.birthDate} onChange={(e) => setter({ ...data, birthDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Time of Birth</label>
            <input type="time" value={data.birthTime} onChange={(e) => setter({ ...data, birthTime: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Place of Birth</label>
          <div className="place-input-wrap">
            <input
              type="text"
              value={data.birthPlace}
              onChange={onPlaceChange(which)}
              onFocus={() => suggestions.length && setShow(true)}
              onBlur={() => setTimeout(() => setShow(false), 200)}
              placeholder="Type city e.g. Mumbai"
              autoComplete="off"
            />
            {data.latitude && data.longitude && <span className="place-check">✓</span>}
            {show && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0d4f5', borderRadius: '0 0 10px 10px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', zIndex: 20, maxHeight: 200, overflowY: 'auto' }}>
                {suggestions.map((s, i) => (
                  <div key={i} onClick={() => onSelectPlace(which, s)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f0fa', fontSize: '0.85rem', color: '#374151' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f9f5ff'}
                    onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                    📍 {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {data.latitude && <span className="place-coords">Lat: {parseFloat(data.latitude).toFixed(4)}, Lon: {parseFloat(data.longitude).toFixed(4)}</span>}
        </div>
      </div>
    );
  };

  // ---------------- Result helpers ----------------
  const matchData = result?.recordList || result?.match_report || result?.data || null;
  const totalReceived = num(matchData?.total?.received_points ?? matchData?.score?.received_points ?? matchData?.received_points);
  const totalMax = num(matchData?.total?.total_points ?? matchData?.score?.total_points ?? 36, 36);
  const conclusionText = pickStr(
    matchData?.conclusion?.report,
    typeof matchData?.conclusion === 'string' ? matchData.conclusion : null,
    matchData?.bot_response,
    matchData?.message
  );

  const compatibilityBand = (received, max) => {
    if (!max) return { label: 'N/A', color: '#9ca3af', emoji: '—' };
    const pct = (received / max) * 100;
    if (pct >= 75) return { label: 'Excellent Match', color: '#10b981', emoji: '🌟' };
    if (pct >= 50) return { label: 'Good Match',      color: '#3b82f6', emoji: '✨' };
    if (pct >= 25) return { label: 'Average Match',   color: '#f59e0b', emoji: '⚖️' };
    return                { label: 'Poor Match',      color: '#ef4444', emoji: '⚠️' };
  };
  const band = compatibilityBand(totalReceived, totalMax);
  const scorePct = totalMax ? Math.min(100, (totalReceived / totalMax) * 100) : 0;

  // Pull each koota safely
  const renderKoota = (key) => {
    if (!matchData) return null;
    const meta = KOOTA_META[key];
    const data = matchData[key];
    if (!meta || !data || typeof data !== 'object') return null;
    const got = num(data.received_points ?? data.score, 0);
    const max = num(data.total_points ?? data.max_points ?? meta.max, meta.max);
    const desc = pickStr(data.description, data.bot_response, data.report);
    const pct = max ? Math.min(100, (got / max) * 100) : 0;
    const barColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444';
    return (
      <div key={key} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #f0e6ff', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, color: '#1a0533', fontSize: '0.95rem' }}>{meta.label}</span>
          <span style={{ fontWeight: 700, color: barColor, fontSize: '0.95rem' }}>{got} / {max}</span>
        </div>
        <div style={{ height: 6, background: '#f3f0fa', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>{meta.hint}</div>
        {desc && <div style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5 }}>{desc}</div>}
      </div>
    );
  };

  // De-dupe graha_maitri vs grahamaitri (only show whichever the API returned)
  const kootasToRender = (() => {
    if (!matchData) return [];
    const seen = new Set();
    const out = [];
    for (const k of KOOTA_ORDER) {
      if (matchData[k] && typeof matchData[k] === 'object') {
        const meta = KOOTA_META[k];
        if (meta && !seen.has(meta.label)) { out.push(k); seen.add(meta.label); }
      }
    }
    return out;
  })();

  // Manglik dosh extraction
  const extractManglik = (rpt) => {
    if (!rpt || typeof rpt !== 'object') return null;
    const isManglik =
      rpt.is_present === true || rpt.is_present === 'true' ||
      rpt.manglik_present_rule?.is_present === true ||
      rpt.manglik === true || rpt.is_manglik === true;
    const status = pickStr(rpt.manglik_status, rpt.status, rpt.bot_response);
    const presentRules = rpt.manglik_present_rule?.based_on_rules || rpt.manglik_present_rule?.rules || [];
    const cancelRules = rpt.manglik_cancel_rule?.based_on_rules || rpt.manglik_cancel_rule?.rules || [];
    const percentage = rpt.percentage_manglik_present ?? rpt.manglik_percent;
    return { isManglik, status, presentRules, cancelRules, percentage };
  };
  const boyManglik = extractManglik(result?.boyManaglikRpt || result?.boyManglikRpt || result?.boy_manglik);
  const girlManglik = extractManglik(result?.girlMangalikRpt || result?.girlManglikRpt || result?.girl_manglik);

  const ManglikCard = ({ side, data, accent }) => {
    if (!data) return null;
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 18, border: `1px solid ${data.isManglik ? '#fecaca' : '#bbf7d0'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ color: accent, fontSize: '1rem' }}>{side}</strong>
          <span style={{
            padding: '4px 12px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 700,
            background: data.isManglik ? '#fee2e2' : '#dcfce7',
            color: data.isManglik ? '#b91c1c' : '#166534',
          }}>
            {data.isManglik ? '⚠ Manglik' : '✓ Not Manglik'}
          </span>
        </div>
        {data.percentage != null && (
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 8 }}>
            Manglik intensity: <strong style={{ color: '#1a0533' }}>{data.percentage}%</strong>
          </div>
        )}
        {data.status && <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{data.status}</div>}
        {data.presentRules.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Reasons:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: '#6b7280' }}>
              {data.presentRules.slice(0, 4).map((r, i) => <li key={i}>{typeof r === 'string' ? r : (r.description || r.rule || JSON.stringify(r))}</li>)}
            </ul>
          </div>
        )}
        {data.cancelRules.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: 4 }}>Cancellations:</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: '#6b7280' }}>
              {data.cancelRules.slice(0, 4).map((r, i) => <li key={i}>{typeof r === 'string' ? r : (r.description || r.rule || JSON.stringify(r))}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ---------------- Render ----------------
  return (
    <div className="kundali-page">
      <div className="list-hero">
        <h2>Kundali Matching</h2>
        <p>Vedic compatibility check using Ashtakoot Guna Milan & Manglik dosha analysis</p>
      </div>

      <div className="container">
        <form className="matching-form" onSubmit={handleSubmit}>
          {/* Match style toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <span style={{ alignSelf: 'center', fontWeight: 600, color: '#6b7280', marginRight: 6, fontSize: '0.9rem' }}>Match Style:</span>
            {[
              { v: 'North', l: 'Ashtakoot (North)' },
              { v: 'South', l: 'Dashakoot (South)' },
            ].map(opt => (
              <button key={opt.v} type="button"
                onClick={() => setMatchType(opt.v)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 50,
                  border: matchType === opt.v ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                  background: matchType === opt.v ? '#7c3aed' : '#fff',
                  color: matchType === opt.v ? '#fff' : '#1a0533',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                {opt.l}
              </button>
            ))}
          </div>

          <div className="matching-grid">
            {renderPerson('boy')}
            {renderPerson('girl')}
          </div>

          <button type="submit" className="kundali-btn match-btn" disabled={loading}>
            {loading ? '⏳ Matching...' : '💞 Check Compatibility'}
          </button>
          {result && (
            <button type="button" onClick={handleReset}
              style={{ display: 'block', margin: '12px auto 0', background: 'transparent', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
              ↺ Reset & match another couple
            </button>
          )}
        </form>

        {/* ============ RESULT SECTION ============ */}
        {result && (
          <div id="match-result-section" className="kundali-result match-result" style={{ textAlign: 'left' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h3 style={{ marginBottom: 4 }}>
                {result.maleKundali?.name || boy.name} <span style={{ color: '#ec4899' }}>♥</span> {result.femaleKundali?.name || girl.name}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
                {matchType === 'North' ? 'Ashtakoot Guna Milan (North Indian)' : 'Dashakoot Milan (South Indian)'}
              </p>
            </div>

            {/* Score donut + band */}
            {totalMax > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #f0e6ff', marginBottom: 20 }}>
                <div style={{ position: 'relative', width: 140, height: 140 }}>
                  <svg viewBox="0 0 140 140" width="140" height="140">
                    <circle cx="70" cy="70" r="60" fill="none" stroke="#f3f0fa" strokeWidth="14" />
                    <circle cx="70" cy="70" r="60" fill="none" stroke={band.color} strokeWidth="14"
                      strokeDasharray={`${(scorePct * 2 * Math.PI * 60) / 100} ${2 * Math.PI * 60}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 70 70)"
                      strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 700, color: band.color, lineHeight: 1 }}>{totalReceived}</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>of {totalMax}</div>
                  </div>
                </div>
                <div style={{ flex: '1 1 220px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: band.color }}>{band.emoji} {band.label}</div>
                  <div style={{ color: '#6b7280', marginTop: 6, fontSize: '0.9rem' }}>
                    Compatibility Score: <strong>{Math.round(scorePct)}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Birth Charts (Lagna + Navamsa for both) */}
            {(boyCharts.D1 || boyCharts.D9 || girlCharts.D1 || girlCharts.D9 || chartsLoading) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  <h4 style={{ color: '#1a0533', fontSize: '1.05rem', margin: 0 }}>🪐 Birth Charts (Lagna + Navamsa)</h4>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['north', 'south', 'east'].map(s => (
                      <button key={s} type="button" onClick={() => onChangeChartStyle(s)}
                        style={{
                          padding: '6px 12px',
                          border: chartStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                          background: chartStyle === s ? '#7c3aed' : '#fff',
                          color: chartStyle === s ? '#fff' : '#1a0533',
                          borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                        }}>
                        {s} Indian
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  <ChartCard title={`👨 ${result.maleKundali?.name || boy.name} — Lagna (D1)`}    svg={boyCharts.D1}  accent="#3b82f6" />
                  <ChartCard title={`👨 ${result.maleKundali?.name || boy.name} — Navamsa (D9)`}  svg={boyCharts.D9}  accent="#3b82f6" />
                  <ChartCard title={`👩 ${result.femaleKundali?.name || girl.name} — Lagna (D1)`}   svg={girlCharts.D1} accent="#ec4899" />
                  <ChartCard title={`👩 ${result.femaleKundali?.name || girl.name} — Navamsa (D9)`} svg={girlCharts.D9} accent="#ec4899" />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
                  💡 Lagna chart shows personality & life path. Navamsa is the primary chart for marriage & spouse compatibility.
                </p>
              </div>
            )}

            {/* Conclusion banner */}
            {conclusionText && (
              <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderLeft: '4px solid #7c3aed', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
                <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 6 }}>📜 Conclusion</strong>
                <div style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.6 }}>{conclusionText}</div>
              </div>
            )}

            {/* Koota grid */}
            {kootasToRender.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ color: '#1a0533', marginBottom: 12, fontSize: '1.05rem' }}>📊 Guna-by-Guna Breakdown</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                  {kootasToRender.map(k => renderKoota(k))}
                </div>
              </div>
            )}

            {/* Manglik */}
            {(boyManglik || girlManglik) && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ color: '#1a0533', marginBottom: 12, fontSize: '1.05rem' }}>🔥 Manglik Dosha Analysis</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  <ManglikCard side={`👨 ${result.maleKundali?.name || boy.name}`} data={boyManglik} accent="#3b82f6" />
                  <ManglikCard side={`👩 ${result.femaleKundali?.name || girl.name}`} data={girlManglik} accent="#ec4899" />
                </div>
              </div>
            )}

            {/* Birth details summary */}
            <div style={{ background: '#fafaf9', borderRadius: 12, padding: 16, border: '1px dashed #e0d4f5' }}>
              <h4 style={{ color: '#6b7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Birth Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.82rem' }}>
                <div>
                  <strong style={{ color: '#3b82f6' }}>{result.maleKundali?.name || boy.name}</strong>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>📅 {result.maleKundali?.birthDate || boy.birthDate}</div>
                  <div style={{ color: '#6b7280' }}>🕐 {result.maleKundali?.birthTime || boy.birthTime}</div>
                  <div style={{ color: '#6b7280' }}>📍 {result.maleKundali?.birthPlace || boy.birthPlace}</div>
                </div>
                <div>
                  <strong style={{ color: '#ec4899' }}>{result.femaleKundali?.name || girl.name}</strong>
                  <div style={{ color: '#6b7280', marginTop: 4 }}>📅 {result.femaleKundali?.birthDate || girl.birthDate}</div>
                  <div style={{ color: '#6b7280' }}>🕐 {result.femaleKundali?.birthTime || girl.birthTime}</div>
                  <div style={{ color: '#6b7280' }}>📍 {result.femaleKundali?.birthPlace || girl.birthPlace}</div>
                </div>
              </div>
            </div>

            {/* Fallback: nothing recognised */}
            {!matchData && !boyManglik && !girlManglik && (
              <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                <strong style={{ color: '#92400e' }}>Match data received in unexpected format.</strong>
                <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 10, borderRadius: 6, marginTop: 8, overflowX: 'auto', maxHeight: 240 }}>
                  {JSON.stringify(result, null, 2).substring(0, 1500)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KundaliMatching;
