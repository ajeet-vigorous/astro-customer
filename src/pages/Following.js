import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { astrologerApi } from '../api/services';
import './Account.css';

const Following = () => {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await astrologerApi.getFollowing({});
        const d = res.data?.data || res.data;
        setFollowing(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">Following</h2>
        {following.length === 0 ? (
          <div className="no-data">You are not following any astrologer</div>
        ) : (
          <div className="following-grid">
            {following.map((astro) => (
              <Link key={astro.id} to={`/astrologer/${astro.astrologerId || astro.id}`} className="following-card">
                <img src={astro.profileImage ? (astro.profileImage.startsWith('http') ? astro.profileImage : `http://localhost:5000${astro.profileImage}`) : '/default-avatar.png'} alt={astro.name} />
                <div className="following-info">
                  <h4>{astro.name || astro.astrologerName}</h4>
                  <p>{astro.primarySkill || astro.skill || ''}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Following;
