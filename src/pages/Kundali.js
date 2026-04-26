import React, { useState, useRef } from 'react';
import { kundaliApi, astroApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Kundali.css';

const Kundali = () => {
  const [form, setForm] = useState({ name: '', gender: 'Male', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [basicReport, setBasicReport] = useState(null);
  const [basicLoading, setBasicLoading] = useState(false);
  const [chartSvg, setChartSvg] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartStyle, setChartStyle] = useState('north');
  const [chartDiv, setChartDiv] = useState('D1');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chart');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // VedicAstroAPI supported languages
  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'ka', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'ml', label: 'മലയാളം (Malayalam)' },
    { code: 'be', label: 'বাংলা (Bengali)' },
    { code: 'fr', label: 'Français (French)' },
    { code: 'sp', label: 'Español (Spanish)' },
  ];

  // Extract SVG/image from various possible response shapes
  const extractChart = (cd) => {
    if (cd === null || cd === undefined) return null;
    if (typeof cd === 'string') return cd;
    if (typeof cd === 'object') {
      // Try a wide range of possible field names
      const fields = ['svg', 'svgString', 'svg_string', 'base64Image', 'base64', 'b64',
                      'image_url', 'imageUrl', 'imageURL', 'chart_url', 'chartUrl',
                      'chart_image', 'chartImage', 'chart', 'image', 'url', 'src',
                      'data', 'response'];
      for (const f of fields) {
        if (cd[f]) return cd[f];
      }
      // If object has only one key and it's a string, use it
      const keys = Object.keys(cd);
      if (keys.length === 1 && typeof cd[keys[0]] === 'string') return cd[keys[0]];
    }
    return null;
  };

  // Detect what kind of chart payload we have so we can render correctly
  const detectChartType = (val) => {
    if (typeof val !== 'string') return 'unknown';
    const s = val.trim();
    if (s.startsWith('<svg') || s.includes('<svg ')) return 'svg';
    if (s.startsWith('data:image')) return 'dataurl';
    if (/^https?:\/\//.test(s)) return 'url';
    // Pure base64 SVG/PNG (no data: prefix)
    if (s.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(s)) return 'base64';
    return 'unknown';
  };

  // Fetch chart for given record + div + style + language
  const fetchChart = async (recordId, div, style, langCode) => {
    if (!recordId) return;
    setChartLoading(true);
    try {
      const res = await kundaliApi.getChartReport({ kundaliId: recordId, div, style, lang: langCode || lang });
      const cd = res.data?.data || res.data;
      const raw = cd?.chartDetails;
      const extracted = extractChart(raw);
      setChartSvg(extracted || raw);
    } catch (err) {
      setChartSvg(null);
    }
    setChartLoading(false);
  };

  // Fetch planet details (basic report) for record in language
  const fetchBasic = async (recordId, langCode) => {
    if (!recordId) return;
    setBasicLoading(true);
    try {
      const res = await kundaliApi.getBasicReport({ kundaliId: recordId, lang: langCode || lang });
      const bd = res.data?.data || res.data;
      setBasicReport(bd?.planetDetails || bd);
    } catch (err) {
      setBasicReport(null);
    }
    setBasicLoading(false);
  };

  // Refetch both when language changes
  const onChangeLang = (newLang) => {
    setLang(newLang);
    if (kundaliRecord?.id) {
      fetchBasic(kundaliRecord.id, newLang);
      fetchChart(kundaliRecord.id, chartDiv, chartStyle, newLang);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Auto-fetch suggestions when place changes
  const handlePlaceChange = (e) => {
    const place = e.target.value;
    setForm(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await kundaliApi.placeAutocomplete({ query: place });
        if (res.data?.suggestions?.length) {
          setSuggestions(res.data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) { setSuggestions([]); }
      setPlaceLoading(false);
    }, 400);
  };

  const selectPlace = (suggestion) => {
    setForm(prev => ({
      ...prev,
      birthPlace: suggestion.name,
      latitude: suggestion.lat ? String(suggestion.lat) : '',
      longitude: suggestion.lon ? String(suggestion.lon) : '',
    }));
    setSuggestions([]);
    setShowSuggestions(false);

    // If no lat/lon in suggestion (Google), fetch via geocode
    if (!suggestion.lat) {
      kundaliApi.geocode({ place: suggestion.name }).then(res => {
        if (res.data?.latitude) setForm(prev => ({ ...prev, latitude: String(res.data.latitude), longitude: String(res.data.longitude) }));
      }).catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.birthDate || !form.birthTime || !form.birthPlace) {
      toast.error('Please fill all fields');
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Location not found for this place. Please try a more specific place name.');
      return;
    }
    setLoading(true);
    setBasicReport(null);
    setKundaliRecord(null);
    setChartSvg(null);
    try {
      const res = await kundaliApi.add({
        kundali: [{ name: form.name, gender: form.gender, birthDate: form.birthDate, birthTime: form.birthTime, birthPlace: form.birthPlace, latitude: form.latitude, longitude: form.longitude, pdf_type: 'basic' }]
      });
      const d = res.data?.data || res.data;
      const record = d?.recordList?.[0] || d?.recordList || null;
      setKundaliRecord(record);

      if (record?.id) {
        await Promise.all([
          fetchBasic(record.id, lang),
          fetchChart(record.id, chartDiv, chartStyle, lang),
        ]);
      }

      toast.success('Kundali generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate kundali');
    }
    setLoading(false);
  };

  // Format decimal degree to D° M' S" (e.g. 12.5 → 12° 30' 00")
  const fmtDeg = (deg) => {
    if (deg === undefined || deg === null || deg === '') return '-';
    const n = parseFloat(deg);
    if (!Number.isFinite(n)) return String(deg);
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = Math.round((mFloat - m) * 60);
    return `${sign}${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
  };

  const isRetro = (p) => p?.retro === 1 || p?.retro === '1' || p?.retro === true || p?.isRetro === true || p?.isRetro === 'true';

  const renderPlanetDetails = () => {
    if (basicLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading planet details...</div>;
    if (!basicReport) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;
    if (typeof basicReport === 'string') return <p>{basicReport}</p>;

    const rawPlanets = Array.isArray(basicReport) ? basicReport : Object.values(basicReport);
    // Keep only entries that look like real planet rows
    // (must have a name AND at least one positional field — house / zodiac / degree)
    const planets = rawPlanets.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const hasName = p.full_name || p.name || p.planet;
      const hasPosition = p.house != null || p.house_no != null || p.house_number != null
                       || p.zodiac || p.sign || p.current_sign
                       || p.local_degree != null || p.global_degree != null;
      return hasName && hasPosition;
    });
    if (!planets.length) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;

    return (
      <div className="planet-table-wrap">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>House</th>
              <th>Zodiac</th>
              <th>Nakshatra (Pada)</th>
              <th>Degree in Sign</th>
              <th>Total Degree</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => {
              const planetName = p.full_name || p.name || p.planet || '-';
              const retro = isRetro(p);
              const nakshatra = p.nakshatra || p.nakshatra_name || '';
              const pada = p.nakshatra_pada || p.pada || '';
              const isAsc = (p.name === 'As' || planetName === 'Ascendant');
              return (
                <tr key={i} style={isAsc ? { background: '#fef3c7' } : undefined}>
                  <td>
                    <strong>{planetName}</strong>
                    {retro && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>R</span>}
                  </td>
                  <td>{p.house ?? p.house_no ?? p.house_number ?? '-'}</td>
                  <td>{p.zodiac || p.sign || p.current_sign || '-'}</td>
                  <td>{nakshatra ? `${nakshatra}${pada ? ` (${pada})` : ''}` : '-'}</td>
                  <td>{fmtDeg(p.local_degree ?? p.localDegree ?? p.degree)}</td>
                  <td>{fmtDeg(p.global_degree ?? p.globalDegree ?? p.fullDegree)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="kundali-page">
      <div className="list-hero">
        <h2>Free Janam Kundali</h2>
        <p>Generate your birth chart based on Vedic astrology</p>
      </div>
      <div className="container">
        <div className="kundali-layout">
          <form className="kundali-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Time of Birth</label>
                <input type="time" name="birthTime" value={form.birthTime} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Place of Birth</label>
              <div className="place-input-wrap">
                <input type="text" name="birthPlace" value={form.birthPlace} onChange={handlePlaceChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onFocus={() => suggestions.length && setShowSuggestions(true)} placeholder="Enter city name e.g. Delhi, Mumbai" autoComplete="off" />
                {placeLoading && <span className="place-loader"></span>}
                {form.latitude && form.longitude && !placeLoading && <span className="place-check">✓</span>}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0d4f5', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {suggestions.map((s, i) => (
                      <div key={i} onClick={() => selectPlace(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem', color: '#374151' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f9f5ff'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                        📍 {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.latitude && <span className="place-coords">Lat: {form.latitude}, Lon: {form.longitude}</span>}
            </div>
            <button type="submit" className="kundali-btn" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Kundali'}
            </button>
          </form>

          {(kundaliRecord || basicReport) && (
            <div className="kundali-result">
              <h3>Your Kundali — {kundaliRecord?.name || form.name}</h3>

              {kundaliRecord && (
                <div className="kundali-info-row">
                  <span>DOB: {kundaliRecord.birthDate}</span>
                  <span>TOB: {kundaliRecord.birthTime}</span>
                  <span>Place: {kundaliRecord.birthPlace}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div className="kundali-tabs" style={{ marginBottom: 0 }}>
                  <button className={activeTab === 'chart' ? 'active' : ''} onClick={() => setActiveTab('chart')}>Chart</button>
                  <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}>Planet Details</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>🌐 Language:</span>
                  <select value={lang} onChange={(e) => onChangeLang(e.target.value)}
                    style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer' }}>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {activeTab === 'chart' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={chartDiv} onChange={e => { const v = e.target.value; setChartDiv(v); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, v, chartStyle); }}
                      style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, background: '#fff', fontSize: '0.9rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer' }}>
                      <option value="D1">D1 — Lagna (Birth Chart)</option>
                      <option value="D9">D9 — Navamsa (Marriage)</option>
                      <option value="D2">D2 — Hora (Wealth)</option>
                      <option value="D3">D3 — Drekkana (Siblings)</option>
                      <option value="D4">D4 — Chaturthamsa (Property)</option>
                      <option value="D7">D7 — Saptamsa (Children)</option>
                      <option value="D10">D10 — Dasamsa (Career)</option>
                      <option value="D12">D12 — Dwadasamsa (Parents)</option>
                      <option value="D16">D16 — Shodasamsa (Vehicles)</option>
                      <option value="D20">D20 — Vimsamsa (Spirituality)</option>
                      <option value="D24">D24 — Chaturvimsamsa (Education)</option>
                      <option value="D27">D27 — Saptavimsamsa (Strength)</option>
                      <option value="D30">D30 — Trimsamsa (Misfortunes)</option>
                      <option value="D40">D40 — Khavedamsa</option>
                      <option value="D45">D45 — Akshvedamsa (Character)</option>
                      <option value="D60">D60 — Shashtiamsa</option>
                      <option value="chalit">Chalit Chart</option>
                      <option value="moon">Moon Chart</option>
                      <option value="sun">Sun Chart</option>
                    </select>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['north', 'south', 'east'].map(s => (
                        <button key={s} type="button"
                          onClick={() => { setChartStyle(s); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, chartDiv, s); }}
                          style={{ padding: '8px 14px', border: chartStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5', background: chartStyle === s ? '#7c3aed' : '#fff', color: chartStyle === s ? '#fff' : '#1a0533', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                          {s} Indian
                        </button>
                      ))}
                    </div>
                  </div>
                  {chartLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Generating chart...</div>
                  ) : chartSvg ? (
                    (() => {
                      const str = typeof chartSvg === 'string' ? chartSvg : '';
                      const wrapStyle = { background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #f0e6ff', textAlign: 'center', overflowX: 'auto' };
                      // SVG content (with or without XML declaration / DOCTYPE before <svg>)
                      const svgIdx = str.indexOf('<svg');
                      if (svgIdx >= 0) {
                        // Make SVG responsive: ensure viewBox, drop fixed width/height
                        const cleanSvg = str.substring(svgIdx).replace(/<svg([^>]*)>/, (m, attrs) => {
                          const hasViewBox = /viewBox\s*=/i.test(attrs);
                          const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
                          const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
                          let newAttrs = attrs
                            .replace(/\bwidth\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '')
                            .replace(/\bheight\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '');
                          if (!hasViewBox && wMatch && hMatch) {
                            newAttrs = ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"` + newAttrs;
                          }
                          return `<svg width="100%" height="auto" preserveAspectRatio="xMidYMid meet"${newAttrs}>`;
                        });
                        return <div style={{ ...wrapStyle, maxWidth: 520, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: cleanSvg }} />;
                      }
                      // Image URL
                      if (/^https?:\/\//.test(str)) {
                        return <div style={wrapStyle}><img src={str} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
                      }
                      // data: URL
                      if (str.startsWith('data:image')) {
                        return <div style={wrapStyle}><img src={str} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
                      }
                      // Pure base64
                      if (str.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(str)) {
                        const clean = str.replace(/\s+/g, '');
                        const decoded = (() => { try { return atob(clean); } catch (_) { return ''; } })();
                        const isSvg = decoded.includes('<svg');
                        const src = `data:image/${isSvg ? 'svg+xml' : 'png'};base64,${clean}`;
                        return <div style={wrapStyle}><img src={src} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
                      }
                      // Unknown — debug info
                      const debugStr = typeof chartSvg === 'string'
                        ? chartSvg.substring(0, 800)
                        : JSON.stringify(chartSvg, null, 2).substring(0, 800);
                      return (
                        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
                          <p style={{ color: '#92400e', fontWeight: 600, marginBottom: 8 }}>⚠ Chart format not recognized — debug info:</p>
                          <pre style={{ fontSize: '0.75rem', background: '#fff', padding: 12, borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, color: '#374151', margin: 0 }}>
                            {debugStr}
                          </pre>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Chart not available — try regenerating</div>
                  )}
                </div>
              )}

              {activeTab === 'basic' && renderPlanetDetails()}

              {/* Download PDF Button */}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button onClick={async () => {
                  if (!window.confirm('Download detailed Kundali PDF for ₹99?')) return;
                  try {
                    const res = await astroApi.kundaliPDF({
                      name: form.name, dob: form.dob.split('-').reverse().join('/'),
                      tob: form.tob, lat: form.lat, lon: form.lon, tz: 5.5
                    });
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                    const a = document.createElement('a'); a.href = url;
                    a.download = 'kundali_report.pdf'; a.click();
                    window.URL.revokeObjectURL(url);
                    toast.success('PDF downloaded!');
                  } catch(e) { toast.error('Failed to download PDF'); }
                }} style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 50, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                  📄 Download Full Kundali PDF — ₹99
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kundali;
