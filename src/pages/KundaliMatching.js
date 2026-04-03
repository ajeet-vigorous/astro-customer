import React, { useState, useRef, useCallback } from 'react';
import { kundaliApi } from '../api/services';
import { toast } from 'react-toastify';
import './Kundali.css';

const KundaliMatching = () => {
  const [boy, setBoy] = useState({ name: '', dateOfBirth: '', timeOfBirth: '', placeOfBirth: '', latitude: '', longitude: '' });
  const [girl, setGirl] = useState({ name: '', dateOfBirth: '', timeOfBirth: '', placeOfBirth: '', latitude: '', longitude: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const boyDebounce = useRef(null);
  const girlDebounce = useRef(null);

  const [boySuggestions, setBoySuggestions] = useState([]);
  const [girlSuggestions, setGirlSuggestions] = useState([]);

  const geocodePlace = (place, setter, data, debounceRef, setSugg) => {
    setter({ ...data, placeOfBirth: place, latitude: '', longitude: '' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 2) { setSugg([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await kundaliApi.placeAutocomplete({ query: place });
        if (res.data?.suggestions?.length) setSugg(res.data.suggestions);
        else setSugg([]);
      } catch (err) { setSugg([]); }
    }, 400);
  };

  const selectSuggestion = (suggestion, setter, setSugg) => {
    setter(prev => ({ ...prev, placeOfBirth: suggestion.name, latitude: suggestion.lat ? String(suggestion.lat) : '', longitude: suggestion.lon ? String(suggestion.lon) : '' }));
    setSugg([]);
    if (!suggestion.lat) {
      kundaliApi.geocode({ place: suggestion.name }).then(res => {
        if (res.data?.latitude) setter(prev => ({ ...prev, latitude: String(res.data.latitude), longitude: String(res.data.longitude) }));
      }).catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!boy.name || !boy.dateOfBirth || !boy.timeOfBirth || !boy.placeOfBirth ||
        !girl.name || !girl.dateOfBirth || !girl.timeOfBirth || !girl.placeOfBirth) {
      toast.error('Please fill all fields for both');
      return;
    }
    if (!boy.latitude || !girl.latitude) {
      toast.error('Location not found. Please try more specific place names.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // Create kundali records for both
      const [boyRes, girlRes] = await Promise.all([
        kundaliApi.add({
          kundali: [{ name: boy.name, gender: 'Male', birthDate: boy.dateOfBirth, birthTime: boy.timeOfBirth, birthPlace: boy.placeOfBirth, latitude: boy.latitude, longitude: boy.longitude, pdf_type: 'basic' }]
        }),
        kundaliApi.add({
          kundali: [{ name: girl.name, gender: 'Female', birthDate: girl.dateOfBirth, birthTime: girl.timeOfBirth, birthPlace: girl.placeOfBirth, latitude: girl.latitude, longitude: girl.longitude, pdf_type: 'basic' }]
        })
      ]);

      const boyId = (boyRes.data?.data || boyRes.data)?.recordList?.[0]?.id || (boyRes.data?.data || boyRes.data)?.recordList?.id;
      const girlId = (girlRes.data?.data || girlRes.data)?.recordList?.[0]?.id || (girlRes.data?.data || girlRes.data)?.recordList?.id;

      if (!boyId || !girlId) {
        toast.error('Failed to create kundali records');
        setLoading(false);
        return;
      }

      // Get match report
      const matchRes = await kundaliApi.matchReport({ maleKundaliId: boyId, femaleKundaliId: girlId, match_type: 'North' });
      const d = matchRes.data?.data || matchRes.data;
      setResult(d);
      toast.success('Matching report generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate matching');
    }
    setLoading(false);
  };

  const PersonForm = ({ data, setData, label, debounceRef, suggestions, setSugg }) => (
    <div className="match-person">
      <h4>{label}'s Details</h4>
      <div className="form-group">
        <label>Name</label>
        <input type="text" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder={`${label}'s name`} />
      </div>
      <div className="form-group">
        <label>Date of Birth</label>
        <input type="date" value={data.dateOfBirth} onChange={(e) => setData({ ...data, dateOfBirth: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Time of Birth</label>
        <input type="time" value={data.timeOfBirth} onChange={(e) => setData({ ...data, timeOfBirth: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Place of Birth</label>
        <div className="place-input-wrap">
          <input type="text" value={data.placeOfBirth} onChange={(e) => geocodePlace(e.target.value, setData, data, debounceRef, setSugg)} onBlur={() => setTimeout(() => setSugg([]), 200)} autoComplete="off" placeholder="Enter city name" />
          {data.latitude && data.longitude && <span className="place-check">✓</span>}
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0d4f5', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
              {suggestions.map((s, i) => (
                <div key={i} onClick={() => selectSuggestion(s, setData, setSugg)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '0.85rem' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f9f5ff'}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                  📍 {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
        {data.latitude && <span className="place-coords">Lat: {data.latitude}, Lon: {data.longitude}</span>}
      </div>
    </div>
  );

  const renderMatchResult = () => {
    if (!result) return null;
    const matchData = result.recordList;
    const boyManglik = result.boyManaglikRpt;
    const girlManglik = result.girlMangalikRpt;

    return (
      <div className="kundali-result match-result">
        <h3>Matching Report</h3>

        {matchData && (
          <div className="match-score-section">
            {matchData.total && (
              <div className="match-score">
                <span className="score-num">{matchData.total?.received_points || matchData.total?.total_points || 0}</span>
                <span className="score-total">/ {matchData.total?.total_points || 36}</span>
                <p>Guna Match (Ashtakoot)</p>
              </div>
            )}

            {matchData && typeof matchData === 'object' && (
              <div className="match-categories">
                {Object.entries(matchData).filter(([key]) => key !== 'total' && key !== 'conclusion').map(([key, val]) => (
                  <div key={key} className="match-cat-item">
                    <span className="cat-name">{key}</span>
                    <span className="cat-score">{val?.received_points || 0} / {val?.total_points || '-'}</span>
                    <span className={`cat-desc ${val?.description?.toLowerCase().includes('good') ? 'good' : ''}`}>{val?.description || ''}</span>
                  </div>
                ))}
              </div>
            )}

            {matchData.conclusion && (
              <div className="match-conclusion">
                <strong>Conclusion:</strong> {matchData.conclusion?.report || matchData.conclusion}
              </div>
            )}
          </div>
        )}

        {(boyManglik || girlManglik) && (
          <div className="manglik-section">
            <h4>Manglik Dosha</h4>
            <div className="manglik-grid">
              {boyManglik && (
                <div className="manglik-card">
                  <strong>Boy</strong>
                  <p className={boyManglik.is_pitr_dosha ? 'dosha-yes' : 'dosha-no'}>
                    {boyManglik.is_pitr_dosha ? 'Manglik' : 'Not Manglik'}
                  </p>
                </div>
              )}
              {girlManglik && (
                <div className="manglik-card">
                  <strong>Girl</strong>
                  <p className={girlManglik.is_pitr_dosha ? 'dosha-yes' : 'dosha-no'}>
                    {girlManglik.is_pitr_dosha ? 'Manglik' : 'Not Manglik'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="kundali-page">
      <div className="list-hero">
        <h2>Kundali Matching</h2>
        <p>Check compatibility between two horoscopes (Ashtakoot Gun Milan)</p>
      </div>
      <div className="container">
        <form className="matching-form" onSubmit={handleSubmit}>
          <div className="matching-grid">
            <PersonForm data={boy} setData={setBoy} label="Boy" debounceRef={boyDebounce} suggestions={boySuggestions} setSugg={setBoySuggestions} />
            <PersonForm data={girl} setData={setGirl} label="Girl" debounceRef={girlDebounce} suggestions={girlSuggestions} setSugg={setGirlSuggestions} />
          </div>
          <button type="submit" className="kundali-btn match-btn" disabled={loading}>
            {loading ? 'Matching...' : 'Match Kundali'}
          </button>
        </form>

        {renderMatchResult()}
      </div>
    </div>
  );
};

export default KundaliMatching;
