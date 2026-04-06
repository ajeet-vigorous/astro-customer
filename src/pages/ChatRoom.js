import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi, astrologerApi, pujaApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import { useActiveChat } from '../context/ActiveChatContext';
import './ChatRoom.css';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ChatRoom = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startChat, updateChat, endChat: clearActiveChat } = useActiveChat();
  const [chatRequest, setChatRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const pollRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typing, setTyping] = useState(false);
  const [recommendedPuja, setRecommendedPuja] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    initChat();

    return () => {
      // Cleanup socket and timer
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [chatId]);

  // Auto scroll to bottom + mark messages as read
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initChat = async () => {
    setLoading(true);
    try {
      // Fetch chat details and messages via REST
      const [detailRes, msgRes] = await Promise.allSettled([
        chatApi.getChatDetail({ chatRequestId: chatId }),
        chatApi.getMessages({ chatRequestId: chatId }),
      ]);

      if (detailRes.status === 'fulfilled') {
        const d = detailRes.value.data;
        const chat = d?.recordList || d?.data;
        if (chat) {
          setChatRequest(chat);
          // Set active chat context for floating bubble
          startChat({ id: chatId, astrologerId: chat.astrologerId, astrologerName: chat.astrologerName, profileImage: chat.profileImage, chatStatus: chat.chatStatus, chatRate: chat.chatRate });
          // Calculate timer if chat is already accepted
          if (chat.chatStatus === 'Accepted' && chat.updated_at) {
            const startTime = new Date(chat.updated_at).getTime();
            const chargePerMin = parseFloat(chat.charge || 0);
            // We'll get maxDuration from socket accept event; for now estimate
            if (chargePerMin > 0) {
              // Don't set timer here - let socket chat-accepted event handle it with real maxDuration
            }
          }
        }
      }

      if (msgRes.status === 'fulfilled') {
        const d = msgRes.value.data;
        const msgs = d?.recordList || d?.data || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      }

      // Connect Socket.IO
      connectSocket();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const connectSocket = () => {
    const token = localStorage.getItem('customerToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket; // Set ref BEFORE listeners

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join-chat', { chatRequestId: parseInt(chatId) });
      // Sync messages on reconnect
      chatApi.getMessages({ chatRequestId: chatId }).then(res => {
        const msgs = res.data?.recordList || res.data?.data || [];
        if (Array.isArray(msgs) && msgs.length > 0) setMessages(msgs);
      }).catch(() => {});
    });

    // New message received
    socket.on('new-message', (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // If message is from astrologer (other person), mark as delivered then read
      if (msg.senderType === 'astrologer' && msg.senderId !== user?.id) {
        socket.emit('message-delivered', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
        // Mark as read after 2 sec (chat screen is open)
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('message-read', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
          }
        }, 2000);
      }
    });

    // Message status updates (sent → delivered → read)
    socket.on('messages-status-update', ({ messageIds, status }) => {
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status } : m));
    });


    // Chat accepted handler - runs ONLY ONCE
    let chatAccepted = false;
    const onChatAccepted = (data) => {
      if (chatAccepted) return; // Already accepted, don't override timer
      if (data.chatRequestId && String(data.chatRequestId) !== String(chatId)) return;
      chatAccepted = true;
      setChatRequest(prev => ({ ...prev, chatStatus: 'Accepted' }));
      setWalletBalance(data.walletBalance || 0);
      const maxDuration = data.maxDuration || 3600;
      updateChat({ chatStatus: 'Accepted', startTime: Date.now(), maxDuration, astrologerName: data.astrologerName });
      toast.success(`${data.astrologerName || 'Astrologer'} ne chat accept kar li!`);
      setTimeLeft(maxDuration);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    };
    socket.on('chat-accepted', onChatAccepted);
    socket.on('chat-accepted-global', onChatAccepted);

    // Chat rejected handler
    const onChatRejected = (data) => {
      if (data?.chatRequestId && String(data.chatRequestId) !== String(chatId)) return;
      setChatRequest(prev => ({ ...prev, chatStatus: 'Rejected' }));
      toast.error('Astrologer ne chat reject kar di');
    };
    socket.on('chat-rejected', onChatRejected);
    socket.on('chat-rejected-global', onChatRejected);

    // Fallback: Poll chat status every 3 seconds (only if still Pending)
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (chatAccepted) { clearInterval(pollRef.current); return; }
      try {
        const res = await chatApi.getChatDetail({ chatRequestId: chatId });
        const detail = res.data?.recordList || res.data;
        if (detail?.chatStatus === 'Accepted') {
          // Don't pass hardcoded maxDuration - let socket event handle timer
          onChatAccepted({ chatRequestId: chatId, astrologerName: detail.astrologerName, walletBalance: 0 });
          clearInterval(pollRef.current);
        } else if (detail?.chatStatus === 'Rejected') {
          onChatRejected({ chatRequestId: chatId });
          clearInterval(pollRef.current);
        } else if (detail?.chatStatus === 'Completed') {
          clearInterval(pollRef.current);
        }
      } catch(e) {}
    }, 3000);

    // Puja recommended by astrologer — show card in chat
    socket.on('puja-recommended', (data) => {
      if (String(data.userId) !== String(user?.id)) return;
      setRecommendedPuja(data);
      // Add as system message in chat
      setMessages(prev => [...prev, {
        id: 'puja_' + Date.now(),
        senderType: 'system',
        message: `__PUJA_CARD__`,
        pujaData: data,
        created_at: new Date().toISOString()
      }]);
    });

    // Chat ended
    socket.on('chat-ended', async (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info(data.message || 'Chat session ended');
      setChatRequest(prev => ({ ...prev, chatStatus: 'Completed' }));
      clearActiveChat();
      // Check if already reviewed this astrologer
      try {
        const revRes = await astrologerApi.getReviews({ astrologerId: data.astrologerId || chatRequest?.astrologerId });
        const reviews = revRes.data?.recordList || revRes.data?.data || [];
        const alreadyReviewed = Array.isArray(reviews) && reviews.some(r => r.userId == user?.id);
        if (!alreadyReviewed) setShowRating(true);
      } catch(e) { setShowRating(true); }
    });

    // Balance update (per-minute deduction)
    socket.on('balance-update', (data) => {
      setWalletBalance(data.balance);
    });

    // Typing indicators - only show when OTHER person (astrologer) is typing
    socket.on('user-typing', (data) => {
      if (data?.userType === 'astrologer') setTyping(true);
    });
    socket.on('user-stop-typing', (data) => {
      if (data?.userType === 'astrologer') setTyping(false);
    });

    // User joined
    socket.on('user-joined', (data) => {
      if (data.userType === 'astrologer') {
        // Astrologer joined the room
      }
    });

    // Chat cancelled (Pending state)
    socket.on('chat-cancelled', (data) => {
      setChatRequest(prev => ({ ...prev, chatStatus: 'Cancelled' }));
      clearActiveChat();
      if (pollRef.current) clearInterval(pollRef.current);
      toast.info(data.message || 'Chat request cancelled');
      setTimeout(() => navigate('/'), 1500);
    });

    // Other user disconnected - show reconnect countdown
    socket.on('user-disconnected', (data) => {
      if (data.userType === 'astrologer') {
        toast.warning('Astrologer disconnected. Waiting 30s for reconnect...', { autoClose: 10000 });
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Send via socket (real-time)
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', {
        chatRequestId: chatId,
        message: msgText,
      });
      // Stop typing
      socketRef.current.emit('stop-typing', { chatRequestId: chatId });
    } else {
      // Fallback to REST API
      try {
        const res = await chatApi.sendMessage({
          chatRequestId: chatId,
          message: msgText,
        });
        const d = res.data;
        if (d?.status === 200 && d?.recordList) {
          setMessages(prev => [...prev, d.recordList]);
        }
      } catch (err) {
        toast.error('Failed to send message');
        setNewMessage(msgText); // Restore message
      }
    }
    setSending(false);
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    // Typing indicator
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { chatRequestId: chatId });
      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('stop-typing', { chatRequestId: chatId });
        }
      }, 2000);
    }
  };

  const handleEndChat = async () => {
    const status = chatRequest?.chatStatus || 'Pending';

    // Pending state → Cancel (no billing)
    if (status === 'Pending') {
      if (!window.confirm('Cancel this chat request?')) return;
      if (socketRef.current?.connected) {
        socketRef.current.emit('cancel-chat', { chatRequestId: chatId });
      }
      setChatRequest(prev => ({ ...prev, chatStatus: 'Cancelled' }));
      clearActiveChat();
      if (pollRef.current) clearInterval(pollRef.current);
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      toast.info('Chat request cancelled');
      navigate('/');
      return;
    }

    // Accepted state → End Chat with confirm
    if (!window.confirm('Are you sure you want to end this chat?')) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('end-chat', { chatRequestId: chatId });
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setChatRequest(prev => ({ ...prev, chatStatus: 'Completed' }));
    clearActiveChat();
    try {
      const revRes = await astrologerApi.getReviews({ astrologerId: chatRequest?.astrologerId });
      const reviews = revRes.data?.recordList || revRes.data?.data || [];
      const alreadyReviewed = Array.isArray(reviews) && reviews.some(r => r.userId == user?.id);
      if (!alreadyReviewed) setShowRating(true);
    } catch(e) { setShowRating(true); }
  };

  const handleSubmitRating = async () => {
    setRatingSubmitting(true);
    try {
      await astrologerApi.addReview({ astrologerId: chatRequest?.astrologerId, rating: ratingValue, review: reviewText });
      toast.success('Thank you for your review!');
    } catch (err) { /* ignore */ }
    setRatingSubmitting(false);
    setShowRating(false);
    navigate('/chat-history');
  };

  const skipRating = () => {
    setShowRating(false);
    navigate('/chat-history');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Connecting to chat...</p></div>;

  const status = chatRequest?.chatStatus || 'Pending';

  return (
    <div className="chatroom-page">
      <div className="chatroom-header">
        <div className="chatroom-astro-info">
          <img
            src={chatRequest?.profileImage ? (chatRequest.profileImage.startsWith('http') ? chatRequest.profileImage : `http://localhost:5000${chatRequest.profileImage}`) : '/default-avatar.png'}
            alt={chatRequest?.astrologerName || 'Astrologer'}
          />
          <div>
            <h4>{chatRequest?.astrologerName || chatRequest?.name || 'Astrologer'}</h4>
            <span className={`chat-status-badge ${status.toLowerCase()}`}>{status}</span>
          </div>
        </div>
        <div className="chatroom-timer">
          {status === 'Accepted' && (
            <span className={`timer-display ${timeLeft < 120 ? 'warning' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          )}
          <button className="end-chat-btn" onClick={handleEndChat}>
            {status === 'Pending' ? 'Cancel' : 'End Chat'}
          </button>
        </div>
      </div>

      <div className="chatroom-messages">
        {messages.length > 0 && (
          messages.map((msg) => (
            msg.message === '__PUJA_CARD__' && msg.pujaData ? (
              <div key={msg.id} style={{ margin: '12px auto', maxWidth: '85%', background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 10px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 600 }}>Puja Recommendation</span>
                </div>
                <h4 style={{ margin: '0 0 4px', color: '#1a0533' }}>{msg.pujaData.pujaTitle}</h4>
                <p style={{ margin: '0 0 4px', color: '#6b7280', fontSize: '0.8rem' }}>by {msg.pujaData.astrologerName}</p>
                <p style={{ margin: '0 0 10px', color: '#7c3aed', fontWeight: 700, fontSize: '1.1rem' }}>&#8377;{msg.pujaData.pujaPrice || 0}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/puja/${msg.pujaData.pujaId}`)} style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Accept & Book</button>
                  <button onClick={async () => {
                    try { await pujaApi.deleteRecommended({ id: msg.pujaData.pujaId }); toast.success('Cancelled'); setMessages(prev => prev.filter(m => m.id !== msg.id)); } catch(e) {}
                  }} style={{ flex: 1, background: '#fff', color: '#dc2626', border: '2px solid #dc2626', padding: '10px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.senderType === 'user' || msg.senderId === user?.id ? 'sent' : 'received'}`}
              >
                <p className="bubble-text">{msg.message}</p>
                <span className="bubble-time">
                  {formatMsgTime(msg.created_at)}
                  {(msg.senderType === 'user' || msg.senderId === user?.id) && (
                    <span className={`msg-tick ${msg.status || 'sent'}`}>
                      {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            )
          ))
        )}

        {/* WhatsApp-style system messages */}
        {status === 'Pending' && (
          <div className="system-message pending">
            <div className="system-spinner"></div>
            <span>Chat request sent. Waiting for astrologer to accept...</span>
          </div>
        )}
        {status === 'Accepted' && (
          <div className="system-message accepted">
            <span>{chatRequest?.astrologerName || 'Astrologer'} ne chat accept kar li. Ab aap baat kar sakte hain!</span>
          </div>
        )}
        {status === 'Completed' && (
          <div className="system-message ended">
            <span>Chat session ended</span>
          </div>
        )}
        {status === 'Rejected' && (
          <div className="system-message ended">
            <span>Astrologer ne chat reject kar di. Kisi aur astrologer se try karein.</span>
          </div>
        )}

        {typing && (
          <div className="chat-bubble received typing-bubble">
            <p className="bubble-text">typing...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chatroom-input" onSubmit={handleSend}>
        <input
          type="text"
          value={newMessage}
          onChange={handleInputChange}
          placeholder={status === 'Pending' ? 'Waiting for astrologer...' : status === 'Completed' ? 'Chat ended' : 'Type your message...'}
          disabled={sending || status !== 'Accepted'}
        />
        <button type="submit" disabled={sending || !newMessage.trim() || status !== 'Accepted'}>
          {sending ? '...' : 'Send'}
        </button>
      </form>

      {/* Rating Popup */}
      {showRating && (
        <div className="rating-overlay">
          <div className="rating-modal">
            <h3>Rate Your Experience</h3>
            <p className="rating-subtitle">How was your chat with {chatRequest?.astrologerName || 'Astrologer'}?</p>
            <div className="rating-stars">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`rating-star ${n <= ratingValue ? 'active' : ''}`} onClick={() => setRatingValue(n)}>&#9733;</span>
              ))}
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review (optional)..."
              rows={3}
              className="rating-textarea"
            />
            <div className="rating-actions">
              <button className="rating-submit" onClick={handleSubmitRating} disabled={ratingSubmitting}>
                {ratingSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button className="rating-skip" onClick={skipRating}>Skip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
