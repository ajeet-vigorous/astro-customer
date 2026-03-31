import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../api/services';
import './Header.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    if (!user) { setActiveSession(null); return; }
    const checkActive = async () => {
      try {
        const res = await chatApi.getActiveSession();
        const d = res.data;
        if (d?.activeChat) setActiveSession({ type: 'chat', id: d.activeChat.id, name: d.activeChat.astrologerName, status: d.activeChat.chatStatus });
        else if (d?.activeCall) setActiveSession({ type: 'call', id: d.activeCall.id, name: d.activeCall.astrologerName, status: d.activeCall.callStatus });
        else setActiveSession(null);
      } catch(e) { setActiveSession(null); }
    };
    checkActive();
    const interval = setInterval(checkActive, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <header className="cust-header">
      {activeSession && (
        <div className="active-session-banner" onClick={() => navigate(activeSession.type === 'chat' ? `/chat-room/${activeSession.id}` : `/call-room/${activeSession.id}`)}>
          <span>&#128172; Active {activeSession.type === 'chat' ? 'Chat' : 'Call'} with <strong>{activeSession.name}</strong> ({activeSession.status})</span>
          <span className="resume-btn">Resume &rarr;</span>
        </div>
      )}
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="logo-icon">&#9733;</span>
          <div>
            <h1>AstroGuru</h1>
            <small>Consult Online Astrologers</small>
          </div>
        </Link>

        <nav className="header-nav desktop-only">
          <Link to="/talk-to-astrologer" className="nav-btn call-btn">Talk to Astrologer</Link>
          <Link to="/chat-with-astrologer" className="nav-btn chat-btn">Chat with Astrologer</Link>
          <Link to="/panchang" className="nav-btn panchang-btn">Panchang</Link>
          <Link to="/ai-astrologer" className="nav-btn ai-btn">AI Astrologer</Link>
        </nav>

        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <button className="user-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <span className="user-avatar">{(user.name || 'U')[0].toUpperCase()}</span>
                <span className="desktop-only">{user.name || 'User'}</span>
              </button>
              {menuOpen && (
                <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
                  <Link to="/profile">My Account</Link>
                  <Link to="/wallet">My Wallet</Link>
                  <Link to="/orders">My Orders</Link>
                  <Link to="/chat-history">My Chats</Link>
                  <Link to="/call-history">My Calls</Link>
                  <Link to="/following">My Following</Link>
                  <Link to="/recommended-pujas">Recommended Pujas</Link>
                  <Link to="/refer-earn">Refer & Earn</Link>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-btn">Login</Link>
          )}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <Link to="/talk-to-astrologer">Talk to Astrologer</Link>
          <Link to="/chat-with-astrologer">Chat with Astrologer</Link>
          <Link to="/panchang">Panchang</Link>
          <Link to="/ai-astrologer">AI Astrologer</Link>
          <Link to="/horoscope">Horoscope</Link>
          <Link to="/kundali">Kundali</Link>
          <Link to="/puja">Puja</Link>
          <Link to="/products">AstroShop</Link>
          <Link to="/blog">Blog</Link>
          {!user && <Link to="/login">Login</Link>}
        </div>
      )}
    </header>
  );
};

export default Header;
