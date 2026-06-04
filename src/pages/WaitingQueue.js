import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { waitlistApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import './WaitingQueue.css';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');

// Real-time waiting-queue screen. Customer lands here after joining an astrologer's
// queue. Shows live position + ETA. When astrologer becomes free, the backend
// emits `waitlist:your-turn` and we auto-redirect to the call flow.
const WaitingQueue = () => {
  const { astrologerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState(null);   // { position, eta, status, astrologerName, ... }
  const [waitingSec, setWaitingSec] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const socketRef = useRef(null);
  const tickRef = useRef(null);

  // 1) Connect socket + listen for position updates + your-turn
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('customerToken');
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      // server auto-joins user_<id> room on connect — no extra emit needed
    });

    socket.on('waitlist:position-update', (data) => {
      if (Number(data.astrologerId) !== Number(astrologerId)) return;
      setStatus(prev => prev ? { ...prev, position: data.position, eta: data.eta, status: data.status } : prev);
    });

    socket.on('waitlist:your-turn', (data) => {
      if (Number(data.astrologerId) !== Number(astrologerId)) return;
      const reqType = (data.requestType || 'Audio').toLowerCase();
      const action = reqType === 'chat' ? 'chat' : reqType === 'video' ? 'video' : 'call';
      toast.success(`Astrologer is ready! Starting your ${action}...`);
      // Land on astrologer detail with auto-open intake (handled via ?fromQueue=1)
      navigate(`/astrologer/${astrologerId}?action=${action}&fromQueue=1`);
    });

    return () => { socket.disconnect(); };
  }, [user, astrologerId, navigate]);

  // 2) Initial status fetch + poll-fallback every 15s in case socket misses
  useEffect(() => {
    let alive = true;
    const fetchStatus = async () => {
      try {
        const res = await waitlistApi.myStatus();
        if (!alive) return;
        if (res.data?.inQueue && res.data?.data) {
          setStatus(res.data.data);
        } else {
          // Not in queue any more — maybe expired or cancelled
          toast.info('You are no longer in the queue');
          navigate('/talk-to-astrologer');
        }
      } catch (e) { /* silent */ }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [navigate]);

  // 3) Local "time spent waiting" timer (independent of server)
  useEffect(() => {
    if (!status?.joinedAt) return;
    const joinedMs = new Date(status.joinedAt).getTime();
    const tick = () => setWaitingSec(Math.floor((Date.now() - joinedMs) / 1000));
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status?.joinedAt]);

  const handleLeave = async () => {
    if (!window.confirm('Leave the queue? You will lose your position.')) return;
    setLeaving(true);
    try {
      await waitlistApi.leave({ astrologerId: parseInt(astrologerId) });
      toast.info('Left the queue');
      navigate('/talk-to-astrologer');
    } catch (e) {
      toast.error('Could not leave queue');
      setLeaving(false);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!status) {
    return (
      <div className="wq-page">
        <div className="wq-card">
          <div className="wq-spinner" />
          <p>Loading queue status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wq-page">
      <div className="wq-card">
        <div className="wq-avatar-wrap">
          <div className="wq-pulse-ring" />
          <div className="wq-avatar">
            {status.astrologerImage ? (
              <img src={status.astrologerImage} alt={status.astrologerName} />
            ) : (
              <span>{(status.astrologerName || 'A')[0]}</span>
            )}
          </div>
        </div>
        <h2 className="wq-title">{status.astrologerName || 'Astrologer'}</h2>
        <p className="wq-subtitle">Waiting in queue for {status.requestType?.toLowerCase() || 'audio'} call</p>

        <div className="wq-position-card">
          <div className="wq-position-num">#{status.position}</div>
          <div className="wq-position-label">Your position</div>
        </div>

        <div className="wq-stats">
          <div className="wq-stat">
            <div className="wq-stat-value">~{status.eta || '--'} min</div>
            <div className="wq-stat-label">Estimated wait</div>
          </div>
          <div className="wq-stat">
            <div className="wq-stat-value">{formatTime(waitingSec)}</div>
            <div className="wq-stat-label">You've waited</div>
          </div>
        </div>

        <p className="wq-tip">
          {status.position === 1
            ? "You're next! We'll connect you as soon as the astrologer is free."
            : `${status.position - 1} customer${status.position - 1 > 1 ? 's' : ''} ahead of you. Hang tight.`}
        </p>

        <p className="wq-expiry">
          Auto-removed after 30 min of waiting.
        </p>

        <button
          className="wq-leave-btn"
          onClick={handleLeave}
          disabled={leaving}
        >
          {leaving ? 'Leaving...' : 'Leave Queue'}
        </button>
      </div>
    </div>
  );
};

export default WaitingQueue;
