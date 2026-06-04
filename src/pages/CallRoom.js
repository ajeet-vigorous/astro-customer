import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { createCallSession } from '../providers';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import './CallRoom.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

const CallRoom = () => {
  const { callId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const sessionRef = useRef(null);

  const [status, setStatus] = useState('Pending'); // Pending, Accepted, Completed, Rejected
  const [callData, setCallData] = useState(null);
  const [timer, setTimer] = useState(0);
  const [balance, setBalance] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [ratingText, setRatingText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [connStatus, setConnStatus] = useState('connected'); // connected | reconnecting | peer_lost
  const [connMessage, setConnMessage] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const timerRef = useRef(null);
  const heartbeatRef = useRef(null);
  const callIdRef = useRef(null);
  const tokenRefreshRef = useRef(null);
  const metricsBufferRef = useRef([]);
  const metricsFlushRef = useRef(null);
  const audioRetryRef = useRef(null);

  useEffect(() => {
    if (!callId || !user) return;

    // Pre-unlock browser AudioContext on the first user tap during the pending screen.
    // Mobile browsers (Chrome Android, Safari iOS) block remote audio playback if the
    // play() call happens too long after the original user gesture. Customer's "Call"
    // tap on the previous page is already stale by the time astrologer accepts and
    // audio publishes. We capture any tap on the call page and prime the audio system
    // with a silent buffer — invisible to the user, but unlocks autoplay for the
    // remote astrologer audio when it arrives via Agora's user-published event.
    const unlockAudio = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          if (ctx.state === 'suspended') ctx.resume();
        }
        // Also unlock the <audio id="remote-stream"> element by triggering a tiny play
        const remoteAudioEl = document.getElementById('remote-stream');
        if (remoteAudioEl && typeof remoteAudioEl.play === 'function') {
          remoteAudioEl.play().catch(() => {});
        }
        console.log('[audio] AudioContext pre-unlocked via user tap');
      } catch (e) {
        console.warn('[audio] unlock attempt failed:', e?.message);
      }
    };
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true });

    // Connect socket
    const token = localStorage.getItem('customerToken');
    const socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
      // On reconnect during active call, refresh heartbeat so server marks us alive immediately
      if (callIdRef.current) {
        socket.emit('call-heartbeat', { callId: callIdRef.current });
        setConnStatus('connected');
        setConnMessage('');
      }
    });

    // Local socket lost — show "Reconnecting..." overlay (Socket.io auto-retries in background)
    socket.on('disconnect', () => {
      if (callIdRef.current) {
        setConnStatus('reconnecting');
        setConnMessage('Connection lost — reconnecting...');
      }
    });
    socket.io.on('reconnect_attempt', () => {
      if (callIdRef.current) {
        setConnStatus('reconnecting');
        setConnMessage('Reconnecting to call...');
      }
    });
    socket.io.on('reconnect', () => {
      if (callIdRef.current) {
        setConnStatus('connected');
        setConnMessage('');
        toast.success('Reconnected');
      }
    });

    // Peer (astrologer) disconnected — show overlay, but don't end call (heartbeat handles 30s timeout)
    socket.on('peer-connection-lost', (data) => {
      const sideLabel = data.disconnectedSide === 'astrologer' ? 'Astrologer' : 'Other side';
      setConnStatus('peer_lost');
      setConnMessage(`${sideLabel} disconnected. Waiting up to ${data.reconnectTimeout || 30}s for reconnect...`);
    });
    socket.on('peer-reconnected', (data) => {
      setConnStatus('connected');
      setConnMessage('');
      const sideLabel = data.reconnectedSide === 'astrologer' ? 'Astrologer' : 'Other side';
      toast.success(`${sideLabel} reconnected`);
    });

    // Fetch call details
    callApi.getCallById({ callId }).then(res => {
      if (res.data?.status === 200) {
        const c = res.data.recordList || res.data;
        setCallData(c);
        if (c.callStatus === 'Accepted') setStatus('Accepted');
        else if (c.callStatus === 'Completed') setStatus('Completed');
        else if (c.callStatus === 'Rejected') setStatus('Rejected');
      }
    }).catch(() => {});

    // Socket listeners
    socket.on('call-accepted', async (data) => {
      setStatus('Accepted');
      setCallData(prev => ({ ...prev, ...data }));
      setBalance(data.walletAmount || 0);
      toast.success('Call accepted! Connecting...');
      startCall(data);
    });

    socket.on('call-rejected', () => {
      setStatus('Rejected');
      try { new Audio('/notification.wav').play().catch(() => {}); } catch(e) {}
      toast.error('Call rejected by astrologer');
    });

    socket.on('call-ended', async (data) => {
      setStatus('Completed');
      await stopCall();
      if (timerRef.current) clearInterval(timerRef.current);
      // Check if already reviewed this astrologer
      try {
        const { astrologerApi } = await import('../api/services');
        const revRes = await astrologerApi.getReviews({ astrologerId: callData?.astrologerId || data?.astrologerId });
        const reviews = revRes.data?.recordList || revRes.data?.data || [];
        const alreadyReviewed = Array.isArray(reviews) && reviews.some(r => r.userId == user?.id);
        if (!alreadyReviewed) setShowRating(true);
      } catch(e) { setShowRating(true); }
    });

    socket.on('call-balance-update', (data) => {
      setBalance(data.walletAmount || 0);
    });

    socket.on('call-error', (data) => {
      toast.error(data.message || 'Call error');
    });

    // Fallback for missed socket events (flaky networks / ngrok): poll call status while
    // Pending so the customer still connects once the astrologer accepts, even if the
    // `call-accepted` socket event was never delivered to this tab.
    const acceptPoll = setInterval(async () => {
      if (sessionRef.current) { clearInterval(acceptPoll); return; }
      try {
        const r = await callApi.getCallById({ callId });
        const c = r.data?.recordList || r.data;
        if (c?.callStatus === 'Accepted') {
          clearInterval(acceptPoll);
          setStatus('Accepted');
          setCallData(prev => ({ ...prev, ...c }));
          startCall(c);
        } else if (c?.callStatus === 'Rejected') {
          clearInterval(acceptPoll);
          setStatus('Rejected');
        } else if (['Completed', 'Cancelled'].includes(c?.callStatus)) {
          clearInterval(acceptPoll);
        }
      } catch (_) {}
    }, 3000);

    return () => {
      clearInterval(acceptPoll);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (tokenRefreshRef.current) { clearInterval(tokenRefreshRef.current); tokenRefreshRef.current = null; }
      if (metricsFlushRef.current) { clearInterval(metricsFlushRef.current); metricsFlushRef.current = null; }
      socket.disconnect();
      stopCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId, user]);

  // Start call — provider-agnostic via adapter (picks agora / zego / hms based on backend response)
  const startCall = async (data) => {
    if (sessionRef.current) return; // already joined — avoid duplicate (socket + poll race)
    try {
      const tokenRes = await callApi.getZegoToken({ callId: parseInt(callId), userId: user.id });
      if (tokenRes.data?.status !== 200) { toast.error('Failed to get call token'); return; }

      const isVideo = data.call_type == 11 || data.call_type === 'Video';
      const localEl = document.getElementById('local-stream');
      const remoteEl = document.getElementById('remote-stream');

      console.log('Call provider:', tokenRes.data.provider, 'roomID:', tokenRes.data.roomID);

      sessionRef.current = await createCallSession({
        tokenResponse: tokenRes.data,
        localEl,
        remoteEl,
        isVideo,
        onStats: (ev) => { metricsBufferRef.current.push({ ...ev, ts: Date.now() }); },
        // Mobile autoplay block fallback — provider calls this with a retry function
        // when remote audio play() rejects. We surface "Tap to enable audio" overlay.
        onAudioBlocked: (retryFn) => {
          audioRetryRef.current = retryFn;
          setAudioBlocked(true);
        },
      });

      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);

      // Drop-detection: emit heartbeat every 10s. Server auto-ends call if no heartbeat
      // from this side for 30s+ (handles browser crash, network drop, app force-close).
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      const cid = parseInt(callId);
      callIdRef.current = cid; // remember active callId for reconnect handlers
      const sock = socketRef.current;
      if (sock) sock.emit('call-heartbeat', { callId: cid }); // immediate first ping
      heartbeatRef.current = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('call-heartbeat', { callId: cid });
        }
      }, 10000);

      // Quality metrics — flush buffered provider stats every 30s in a batch
      if (metricsFlushRef.current) clearInterval(metricsFlushRef.current);
      metricsFlushRef.current = setInterval(() => {
        const buf = metricsBufferRef.current;
        if (!buf.length) return;
        const events = buf.splice(0, buf.length);
        callApi.postMetrics({ callId: cid, events }).catch(() => {});
      }, 30000);

      // Token refresh for long calls (>1hr). Backend issues 4-hour tokens; we refresh
      // every 50 minutes so a fresh token is in place well before any expiry boundary.
      // HMS provider's renewToken is a no-op (HMS auth tokens valid 24hr+).
      if (tokenRefreshRef.current) clearInterval(tokenRefreshRef.current);
      tokenRefreshRef.current = setInterval(async () => {
        try {
          const refreshRes = await callApi.getZegoToken({ callId: cid, userId: user.id });
          if (refreshRes.data?.status !== 200) return;
          const newToken =
            refreshRes.data?.sdkConfig?.token ||
            refreshRes.data?.sdkConfig?.authToken ||
            refreshRes.data?.token;
          if (newToken && sessionRef.current?.renewToken) {
            await sessionRef.current.renewToken(newToken);
            console.log('[token] Refreshed for long call');
          }
        } catch (e) {
          console.error('[token] Refresh failed:', e);
        }
      }, 50 * 60 * 1000);

      console.log('Call connected via', sessionRef.current.provider);
    } catch (err) {
      console.error('Call error:', err);
      toast.error('Failed to connect call: ' + (err?.message || 'unknown'));
    }
  };

  const stopCall = async () => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (tokenRefreshRef.current) { clearInterval(tokenRefreshRef.current); tokenRefreshRef.current = null; }
    if (metricsFlushRef.current) {
      clearInterval(metricsFlushRef.current); metricsFlushRef.current = null;
      // Final flush of any leftover events
      const buf = metricsBufferRef.current;
      if (buf.length && callIdRef.current) {
        const events = buf.splice(0, buf.length);
        callApi.postMetrics({ callId: callIdRef.current, events }).catch(() => {});
      }
    }
    callIdRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try { await session.leave(); } catch (e) { console.error('Leave failed:', e); }
    }
  };

  const handleEndCall = async () => {
    if (socketRef.current) {
      socketRef.current.emit('end-call', { callId: parseInt(callId) });
    }
    await stopCall();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleEnableAudio = async () => {
    const retry = audioRetryRef.current;
    if (!retry) { setAudioBlocked(false); return; }
    try {
      const r = retry();
      if (r && typeof r.then === 'function') await r;
      setAudioBlocked(false);
      audioRetryRef.current = null;
    } catch (e) {
      console.error('[audio] retry play still blocked:', e?.message);
      // Keep overlay visible so user can tap again
      toast.error('Audio still blocked. Try tapping again or unmute device.');
    }
  };

  const handleSubmitRating = async () => {
    if (!callData) { navigate('/call-history'); return; }
    setRatingSubmitting(true);
    try {
      const { astrologerApi } = await import('../api/services');
      await astrologerApi.addReview({ astrologerId: callData.astrologerId, rating, review: ratingText });
      toast.success('Thanks for your rating!');
    } catch (e) {}
    setRatingSubmitting(false);
    navigate('/call-history');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';

  return (
    <div className="callroom-page">
      <div className="callroom-container">

        {/* Pending */}
        {status === 'Pending' && (
          <div className="call-status-screen">
            <div className="call-pulse-ring">
              <div className="call-avatar">{(callData?.astrologerName || 'A')[0]}</div>
            </div>
            <h3>{callData?.astrologerName || 'Astrologer'}</h3>
            <p className="call-type-label">{isVideo ? 'Video' : 'Audio'} Call</p>
            <p className="call-waiting">Waiting for astrologer to accept...</p>
            <div className="call-spinner"></div>
            <button className="cancel-call-btn" onClick={async () => {
              try {
                await callApi.cancelCall({ callId: parseInt(callId) });
                toast.info('Call cancelled');
                navigate('/talk-to-astrologer');
              } catch(e) { toast.error('Failed to cancel'); }
            }}>Cancel Call</button>
          </div>
        )}

        {/* Reconnection overlay (during active call only) */}
        {status === 'Accepted' && connStatus !== 'connected' && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
            background: connStatus === 'reconnecting' ? '#f59e0b' : '#dc2626',
            color: '#fff', padding: '10px 16px', textAlign: 'center',
            fontWeight: 600, fontSize: '0.9rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            <span style={{ marginRight: 8 }}>
              {connStatus === 'reconnecting' ? '🔄' : '⚠️'}
            </span>
            {connMessage || (connStatus === 'reconnecting' ? 'Reconnecting...' : 'Connection issue')}
          </div>
        )}

        {/* Audio autoplay-block fallback overlay — fires only if pre-unlock didn't work
            and the browser silently blocked Agora's remote audio. User taps once
            (fresh gesture) to unblock and audio resumes. */}
        {audioBlocked && status === 'Accepted' && (
          <div
            onClick={handleEnableAudio}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 20, textAlign: 'center',
            }}
          >
            <div style={{
              fontSize: 60, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite',
            }}>🔊</div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>
              Tap to enable audio
            </h2>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem', maxWidth: 320, marginBottom: 24 }}>
              Aapke browser ne audio block kiya hai. Astrologer ki awaaz sunne ke liye screen par tap karo.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); handleEnableAudio(); }}
              style={{
                background: '#7c3aed', color: '#fff', border: 'none',
                padding: '14px 36px', borderRadius: 50,
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
              }}
            >
              🎧 Enable Audio
            </button>
          </div>
        )}

        {/* Accepted — Active Call */}
        {status === 'Accepted' && (
          <div className="call-active-screen">
            {isVideo ? (
              <div className="video-container">
                <video id="remote-stream" autoPlay playsInline className="remote-video"></video>
                <video id="local-stream" autoPlay playsInline muted className="local-video"></video>
              </div>
            ) : (
              <div className="audio-container">
                <div className="audio-avatar">{(callData?.astrologerName || 'A')[0]}</div>
                <h3>{callData?.astrologerName || 'Astrologer'}</h3>
                <p className="call-type-label">Audio Call</p>
                <audio id="remote-stream" autoPlay></audio>
                <audio id="local-stream" autoPlay muted></audio>
              </div>
            )}
            <div className="call-info-bar">
              <span className="call-timer">{formatTime(timer)}</span>
              <span className="call-balance">Balance: &#8377;{balance.toFixed(2)}</span>
            </div>
            <button className="end-call-btn" onClick={handleEndCall}>End Call</button>
          </div>
        )}

        {/* Rejected */}
        {status === 'Rejected' && (
          <div className="call-status-screen">
            <div className="call-avatar rejected">{(callData?.astrologerName || 'A')[0]}</div>
            <h3>Call Rejected</h3>
            <p>Astrologer is not available right now</p>
            <button className="back-btn" onClick={() => navigate('/talk-to-astrologer')}>Back to Astrologers</button>
          </div>
        )}

        {/* Completed */}
        {status === 'Completed' && !showRating && (
          <div className="call-status-screen">
            <div className="call-avatar completed">&#10003;</div>
            <h3>Call Ended</h3>
            <p>Duration: {formatTime(timer)}</p>
            <button className="back-btn" onClick={() => navigate('/call-history')}>View Call History</button>
          </div>
        )}
      </div>

      {/* Rating Popup */}
      {showRating && (
        <div className="rating-overlay">
          <div className="rating-modal">
            <h3>Rate your experience</h3>
            <p>{callData?.astrologerName || 'Astrologer'}</p>
            <div className="rating-stars">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`rate-star ${n <= rating ? 'active' : ''}`} onClick={() => setRating(n)}>&#9733;</span>
              ))}
            </div>
            <textarea value={ratingText} onChange={(e) => setRatingText(e.target.value)} placeholder="Write your feedback..." rows={3} />
            <div className="rating-actions">
              <button className="rating-skip" onClick={() => navigate('/call-history')}>Skip</button>
              <button className="rating-submit" onClick={handleSubmitRating} disabled={ratingSubmitting}>
                {ratingSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallRoom;
