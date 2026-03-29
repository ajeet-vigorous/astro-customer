import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import './CallRoom.css';

const API_URL = (process.env.REACT_APP_API_URL || 'https://astrology-i7c9.onrender.com/api').replace('/api', '');

const CallRoom = () => {
  const { callId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const zegoRef = useRef(null);

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
      // Start Zegocloud
      startZegoCall(data);
    });

    socket.on('call-rejected', () => {
      setStatus('Rejected');
      try { new Audio('/notification.wav').play().catch(() => {}); } catch(e) {}
      toast.error('Call rejected by astrologer');
    });

    socket.on('call-ended', async (data) => {
      setStatus('Completed');
      stopZegoCall();
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
      stopZegoCall();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId, user]);

  // Start Zegocloud call
  const startZegoCall = async (data) => {
    try {
      // Step 1: Get Zego token
      console.log('Step 1: Getting Zego token...');
      const tokenRes = await callApi.getZegoToken({ callId: parseInt(callId), userId: user.id });
      if (tokenRes.data?.status !== 200) {
        toast.error('Failed to get call token');
        return;
      }
      const { appID, roomID, userID, token } = tokenRes.data;
      console.log('Step 2: Token received, appID:', appID, 'roomID:', roomID, 'userID:', userID);

      // Step 2: Load Zegocloud SDK
      console.log('Step 3: Loading Zegocloud SDK...');
      const zegoModule = await import('zego-express-engine-webrtc');
      const ZegoExpressEngine = zegoModule.ZegoExpressEngine || zegoModule.default;
      console.log('Step 4: SDK loaded, type:', typeof ZegoExpressEngine);

      if (!ZegoExpressEngine) {
        toast.error('Zegocloud SDK not loaded properly');
        return;
      }

      const zg = new ZegoExpressEngine(appID, 'wss://webliveroom2041676101-api.coolzcloud.com/ws');
      zegoRef.current = zg;
      console.log('Step 5: Engine created');

      // Step 3: Login to room
      console.log('Step 6: Logging into room...');
      await zg.loginRoom(roomID, token, { userID: String(userID), userName: user.name || 'Customer' });
      console.log('Step 7: Logged into room');

      // Step 4: Create stream
      const isVideo = data.call_type == 11 || data.call_type === 'Video';
      console.log('Step 8: Creating stream, isVideo:', isVideo);
      const localStream = await zg.createStream({
        camera: { audio: true, video: isVideo }
      });
      console.log('Step 9: Stream created');

      const localEl = document.getElementById('local-stream');
      if (localEl) localEl.srcObject = localStream;

      await zg.startPublishingStream(`stream_${userID}`, localStream);
      console.log('Step 10: Publishing stream');

      // Listen for remote stream
      zg.on('roomStreamUpdate', async (rid, updateType, streamList) => {
        console.log('Stream update:', updateType, streamList.map(s => s.streamID));
        if (updateType === 'ADD') {
          for (const stream of streamList) {
            const remoteStream = await zg.startPlayingStream(stream.streamID);
            const remoteEl = document.getElementById('remote-stream');
            if (remoteEl) remoteEl.srcObject = remoteStream;
          }
        }
      });

      // Start UI timer
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
      console.log('Step 11: Call connected!');

    } catch (err) {
      console.error('Zego error at step:', err);
      toast.error('Failed to connect call: ' + (err.message || JSON.stringify(err)));
    }
  };

  const stopZegoCall = () => {
    if (zegoRef.current) {
      try {
        zegoRef.current.stopPublishingStream();
        zegoRef.current.logoutRoom();
        zegoRef.current.destroyEngine();
      } catch (e) {}
      zegoRef.current = null;
    }
  };

  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('end-call', { callId: parseInt(callId) });
    }
    stopZegoCall();
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
