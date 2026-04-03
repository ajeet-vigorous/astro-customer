import React, { useState, useRef } from 'react';
import { kundaliApi, astroApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Kundali.css';

const Kundali = () => {
  const [form, setForm] = useState({ name: '', gender: 'Male', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [basicReport, setBasicReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

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
    try {
      const res = await kundaliApi.add({
        kundali: [{ name: form.name, gender: form.gender, birthDate: form.birthDate, birthTime: form.birthTime, birthPlace: form.birthPlace, latitude: form.latitude, longitude: form.longitude, pdf_type: 'basic' }]
      });
      const d = res.data?.data || res.data;
      const record = d?.recordList?.[0] || d?.recordList || null;
      setKundaliRecord(record);

      if (record?.id) {
        const basicRes = await kundaliApi.getBasicReport({ kundaliId: record.id, dob: form.birthDate, tob: form.birthTime, lat: form.latitude, lon: form.longitude, tz: 5.5, lang: 'en' });
        const bd = basicRes.data?.data || basicRes.data;
        setBasicReport(bd?.planetDetails || bd);
      }

      toast.success('Kundali generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate kundali');
    }
    setLoading(false);
  };

  const renderPlanetDetails = () => {
    if (!basicReport) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;
    if (typeof basicReport === 'string') return <p>{basicReport}</p>;

    const planets = Array.isArray(basicReport) ? basicReport : Object.values(basicReport);
    if (!planets.length) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;

    return (
      <div className="planet-table-wrap">
        <table className="planet-table">
          <thead>
            <tr>
              <th>Planet</th>
              <th>Sign</th>
              <th>Sign Lord</th>
              <th>Degree</th>
              <th>House</th>
              <th>Retro</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, i) => (
              <tr key={i}>
                <td><strong>{p.name || p.planet || '-'}</strong></td>
                <td>{p.sign || p.zodiac || '-'}</td>
                <td>{p.sign_lord || p.signLord || '-'}</td>
                <td>{p.fullDegree ? parseFloat(p.fullDegree).toFixed(2) + '°' : p.degree || '-'}</td>
                <td>{p.house || '-'}</td>
                <td>{p.isRetro === 'true' || p.isRetro === true ? 'Yes' : 'No'}</td>
              </tr>
            ))}
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

              <div className="kundali-tabs">
                {['basic'].map(t => (
                  <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)}>
                    {t === 'basic' ? 'Planet Details' : t}
                  </button>
                ))}
              </div>

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
