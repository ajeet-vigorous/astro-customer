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
  const timerRef = useRef(null);

  useEffect(() => {
    if (!callId || !user) return;

    // Connect socket
    const token = localStorage.getItem('customerToken');
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
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

    return () => {
      socket.disconnect();
      stopCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId, user]);

  // Start call — provider-agnostic via adapter (picks agora / zego / hms based on backend response)
  const startCall = async (data) => {
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
      });

      timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
      console.log('Call connected via', sessionRef.current.provider);
    } catch (err) {
      console.error('Call error:', err);
      toast.error('Failed to connect call: ' + (err?.message || 'unknown'));
    }
  };

  const stopCall = async () => {
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
