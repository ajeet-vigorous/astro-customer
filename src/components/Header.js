import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="cust-header">
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
