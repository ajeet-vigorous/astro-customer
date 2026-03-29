import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { horoscopeApi } from '../api/services';
import './Horoscope.css';

const zodiacDates = {
  Aries: 'Mar 21 - Apr 19', Taurus: 'Apr 20 - May 20', Gemini: 'May 21 - Jun 20',
  Cancer: 'Jun 21 - Jul 22', Leo: 'Jul 23 - Aug 22', Virgo: 'Aug 23 - Sep 22',
  Libra: 'Sep 23 - Oct 22', Scorpio: 'Oct 23 - Nov 21', Sagittarius: 'Nov 22 - Dec 21',
  Capricorn: 'Dec 22 - Jan 19', Aquarius: 'Jan 20 - Feb 18', Pisces: 'Feb 19 - Mar 20'
};

const Horoscope = () => {
  const [signs, setSigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSigns = async () => {
      try {
        const res = await horoscopeApi.getSigns();
        const d = res.data?.data || res.data;
        const list = Array.isArray(d) ? d : d?.recordList || [];
        setSigns(list.filter(s => String(s.isActive) === '1' || s.isActive === undefined));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchSigns();
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="horoscope-page">
      <div className="list-hero">
        <h2>Horoscope Predictions</h2>
        <p>Select your zodiac sign to read today's horoscope</p>
      </div>
      <div className="container">
        <div className="horo-signs-grid">
          {signs.map((sign) => (
            <Link key={sign.id} to={`/daily-horoscope/${sign.id}/${sign.name?.toLowerCase()}`} className="horo-sign-card">
              {sign.image && <img src={sign.image.startsWith('http') ? sign.image : `${process.env.REACT_APP_API_URL?.replace('/api', '')}${sign.image}`} alt={sign.name} />}
              <h4>{sign.name}</h4>
              <p className="sign-date">{zodiacDates[sign.name] || ''}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Horoscope;
