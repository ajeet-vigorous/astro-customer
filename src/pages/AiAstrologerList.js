import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiChatApi } from '../api/services';
import './AiChat.css';

const AiAstrologerList = () => {
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiChatApi.getAstrologers().then(res => {
      setAstrologers(res.data?.recordList || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="ai-list-page">
      <div className="list-hero">
        <h2>AI Astrologers</h2>
        <p>Get instant AI-powered astrological guidance</p>
      </div>
      <div className="container">
        {astrologers.length === 0 ? (
          <div className="no-data">No AI Astrologers available</div>
        ) : (
          <div className="ai-grid">
            {astrologers.map(a => {
              const imgSrc = a.image ? (a.image.startsWith('http') ? a.image : `${process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000'}/${a.image}`) : null;
              return (
                <Link to={`/ai-chat/${a.id}`} key={a.id} className="ai-card">
                  {imgSrc ? <img src={imgSrc} alt={a.name} className="ai-card-img" /> : <div className="ai-card-avatar">{a.name[0]}</div>}
                  <div className="ai-card-info">
                    <h4>{a.name} <span className="ai-tag">AI</span></h4>
                    <p className="ai-card-about">{a.about}</p>
                    <p className="ai-card-exp">{a.experience} yrs exp</p>
                    <p className="ai-card-price">&#8377;{a.chat_charge}/message</p>
                  </div>
                  <button className="ai-chat-btn">Chat Now</button>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAstrologerList;
