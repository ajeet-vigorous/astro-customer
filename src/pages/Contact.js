import React, { useState } from 'react';
import { pageApi } from '../api/services';
import { toast } from 'react-toastify';
import './StaticPage.css';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await pageApi.submitContact(form);
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
    setLoading(false);
  };

  return (
    <div className="static-page">
      <div className="list-hero">
        <h2>Contact Us</h2>
        <p>We'd love to hear from you</p>
      </div>
      <div className="container">
        <div className="contact-layout">
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Your email" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Your phone number" />
            </div>
            <div className="form-group">
              <label>Message *</label>
              <textarea name="message" value={form.message} onChange={handleChange} placeholder="Your message" rows={5} />
            </div>
            <button type="submit" className="contact-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
          <div className="contact-info">
            <h3>Get in Touch</h3>
            <div className="contact-item">
              <span>&#128231;</span>
              <p>support@astroguru.com</p>
            </div>
            <div className="contact-item">
              <span>&#128222;</span>
              <p>+91-XXXXXXXXXX</p>
            </div>
            <div className="contact-item">
              <span>&#128205;</span>
              <p>India</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
