// Firebase Phone Authentication helper.
//
// Server is the source of truth for which provider is active (MSG91 vs Firebase)
// and for the Firebase Web SDK config. This module fetches that config from
// /api/customer/authConfig and lazily initializes the Firebase app on first use.
// If provider is not 'firebase' OR config is incomplete, all methods throw —
// caller (Login.js) checks the active provider first and falls back to MSG91.

import API from './axios';

let _firebaseApp = null;
let _authInstance = null;
let _config = null;        // { provider, firebase: {...} | null }
let _configPromise = null; // dedupe in-flight fetches

// Fetch active auth provider + Firebase config from server (cached after first call)
export async function getAuthConfig() {
  if (_config) return _config;
  if (_configPromise) return _configPromise;
  _configPromise = (async () => {
    try {
      const res = await API.get('/customer/authConfig');
      _config = res.data || { provider: 'msg91', firebase: null };
      return _config;
    } catch (e) {
      _config = { provider: 'msg91', firebase: null };
      return _config;
    } finally {
      _configPromise = null;
    }
  })();
  return _configPromise;
}

// Lazy-initialize Firebase app + auth (only when needed). Reuses singleton.
async function ensureFirebase() {
  if (_authInstance) return _authInstance;
  const cfg = await getAuthConfig();
  if (cfg.provider !== 'firebase' || !cfg.firebase) {
    throw new Error('Firebase provider not active on server');
  }
  const { initializeApp, getApps, getApp } = await import('firebase/app');
  const { getAuth } = await import('firebase/auth');
  _firebaseApp = getApps().length ? getApp() : initializeApp(cfg.firebase);
  _authInstance = getAuth(_firebaseApp);
  return _authInstance;
}

// Send OTP via Firebase. Returns confirmationResult that holds verificationId.
// recaptchaContainerId: DOM element id where invisible reCAPTCHA mounts.
// phoneE164: phone in international format e.g. "+919876543210"
export async function sendFirebaseOtp(phoneE164, recaptchaContainerId = 'recaptcha-container') {
  const auth = await ensureFirebase();
  const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');

  // (Re)create reCAPTCHA verifier — invisible mode so user doesn't see anything
  if (window._recaptchaVerifier) {
    try { window._recaptchaVerifier.clear(); } catch (_) {}
    window._recaptchaVerifier = null;
  }
  window._recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: 'invisible',
    callback: () => { /* solved silently */ },
    'expired-callback': () => { /* will re-run on next send */ },
  });

  const confirmationResult = await signInWithPhoneNumber(auth, phoneE164, window._recaptchaVerifier);
  // Store on window so verify step can access it
  window._fbConfirmationResult = confirmationResult;
  return confirmationResult;
}

// Verify OTP via Firebase and return ID token for server-side validation.
export async function verifyFirebaseOtp(otp) {
  const cr = window._fbConfirmationResult;
  if (!cr) throw new Error('No pending OTP request. Send OTP first.');
  const result = await cr.confirm(otp);
  // Get fresh ID token to send to backend
  const idToken = await result.user.getIdToken(true);
  window._fbConfirmationResult = null; // one-shot use
  return idToken;
}
