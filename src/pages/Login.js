import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { getAuthConfig, sendFirebaseOtp, verifyFirebaseOtp } from '../api/firebaseAuth';
import './Login.css';

// Login page — supports both providers via runtime server-side switch:
//   provider='msg91'    → server sends SMS, server verifies OTP
//   provider='firebase' → frontend uses Firebase SDK to send/verify OTP,
//                         server only verifies the resulting Firebase ID token
//
// Admin can switch providers without redeploy by toggling systemflag 'OtpProvider'.
const Login = () => {
  const [step, setStep] = useState(1); // 1=phone, 2=otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('msg91'); // resolved from server
  const { login } = useAuth();
  const navigate = useNavigate();

  // Resolve which OTP provider is active on the server, on mount.
  useEffect(() => {
    getAuthConfig().then(cfg => {
      setProvider(cfg.provider || 'msg91');
    }).catch(() => setProvider('msg91'));
  }, []);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      if (provider === 'firebase') {
        // Firebase path: send SMS via Firebase Web SDK + invisible reCAPTCHA
        await sendFirebaseOtp(`+91${phone}`);
        toast.success('OTP sent to your phone via Firebase');
        setStep(2);
      } else {
        // MSG91 / dev path: server sends OTP
        const res = await authApi.sendOtp({ contactNo: phone, fromApp: 'user', type: 'login' });
        if (res.data?.status === 200) {
          if (res.data?.otp) setServerOtp(res.data.otp); // dev-only OTP echo
          toast.success(res.data?.message || 'OTP sent successfully');
          setStep(2);
        } else {
          toast.error(res.data?.message || 'Failed to send OTP');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send OTP';
      toast.error(msg);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      toast.error('Please enter a valid OTP');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (provider === 'firebase') {
        // Firebase verifies OTP client-side and returns an ID token.
        // We send that token to server which validates with firebase-admin.
        const idToken = await verifyFirebaseOtp(otp);
        res = await authApi.verifyFirebaseAndLogin({ idToken });
      } else {
        // MSG91 / dev: server verifies OTP
        res = await authApi.verifyOtpAndLogin({ contactNo: phone, otp });
      }
      const d = res.data;
      if (d?.token) {
        login(d.token, d.recordList || d.user || d);
        toast.success(d?.message || 'Welcome!');
        navigate('/');
      } else {
        toast.error(d?.message || 'Login failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid OTP';
      toast.error(msg);
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
        {/* Invisible reCAPTCHA mount point for Firebase (no UI shown when invisible) */}
        <div id="recaptcha-container" />
      </div>
    </div>
  );
};

export default Login;
