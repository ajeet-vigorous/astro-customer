import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [step, setStep] = useState(1); // 1=phone, 2=otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({ contactNo: phone, fromApp: 'user', type: 'login' });
      if (res.data?.status === 200) {
        // Dev mode: server returns OTP in response
        if (res.data?.otp) setServerOtp(res.data.otp);
        toast.success(res.data?.message || 'OTP sent successfully');
        setStep(2);
      } else {
        toast.error(res.data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }
    // Verify OTP locally (dev mode - server returns OTP in sendOtp response)
    if (serverOtp && otp !== String(serverOtp)) {
      toast.error('Invalid OTP');
      return;
    }
    setLoading(true);
    try {
      // loginAppUser: auto-registers if user doesn't exist
      const res = await authApi.login({ contactNo: phone });
      const d = res.data;
      if (d?.token) {
        login(d.token, d.recordList || d.user || d);
        toast.success(d?.message || 'Welcome!');
        navigate('/');
      } else {
        toast.error(d?.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>Welcome to AstroGuru</h2>
          <p>{step === 1 ? 'Login or Register with your phone number' : `Enter the OTP sent to +91 ${phone}`}</p>
        </div>
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="input-group">
              <label>Phone Number</label>
              <div className="phone-input">
                <span className="country-code">+91</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Enter phone number" maxLength={10} />
              </div>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Continue'}
            </button>
            <p className="login-note">New users will be registered automatically</p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="input-group">
              <label>Enter OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter 6-digit OTP" maxLength={6} className="otp-input" />
              {serverOtp && <p style={{ color: '#7c3aed', fontWeight: 600, marginTop: 6, fontSize: '0.85rem' }}>DEV OTP: {serverOtp}</p>}
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <div className="otp-actions">
              <button type="button" className="resend-btn" onClick={handleSendOtp}>Resend OTP</button>
              <button type="button" className="resend-btn" onClick={() => { setStep(1); setOtp(''); setServerOtp(''); }}>Change Number</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
