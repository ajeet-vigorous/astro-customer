import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="cust-footer">
      <div className="footer-container">
        <div className="footer-col">
          <h4>Menu</h4>
          <Link to="/kundali">Kundali</Link>
          <Link to="/kundali-matching">Kundali Matching</Link>
          <Link to="/products">Products</Link>
          <Link to="/horoscope">Horoscope</Link>
          <Link to="/puja">Puja</Link>
        </div>
        <div className="footer-col">
          <h4>Links</h4>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact Us</Link>
          <Link to="/about-us">About Us</Link>
          <Link to="/login">Login</Link>
        </div>
        <div className="footer-col">
          <h4>Legal</h4>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-condition">Terms & Conditions</Link>
          <Link to="/refund-policy">Refund Policy</Link>
        </div>
        <div className="footer-col">
          <h4>AstroGuru</h4>
          <p className="footer-desc">Connect with experienced astrologers for guidance on love, career, health, and more.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} AstroGuru. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
