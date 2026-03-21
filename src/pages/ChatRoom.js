import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import './ChatRoom.css';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ChatRoom = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chatRequest, setChatRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [typing, setTyping] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
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
    };
  }, [chatId]);

  // Auto scroll to bottom
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
          // Calculate timer if chat is already accepted
          if (chat.chatStatus === 'Accepted' && chat.updated_at) {
            const startTime = new Date(chat.updated_at).getTime();
            const chargePerMin = parseFloat(chat.charge || 0);
            // We'll get maxDuration from socket accept event; for now estimate
            if (chargePerMin > 0) {
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              setTimeLeft(Math.max(0, 3600 - elapsed)); // Placeholder until socket sends real data
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
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join the chat room
      socket.emit('join-chat', { chatRequestId: chatId });
    });

    // New message received
    socket.on('new-message', (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Chat accepted by astrologer
    socket.on('chat-accepted', (data) => {
      setChatRequest(prev => ({ ...prev, chatStatus: 'Accepted' }));
      setWalletBalance(data.walletBalance || 0);
      toast.success(`${data.astrologerName || 'Astrologer'} ne chat accept kar li!`);

      // Start countdown timer
      const maxDuration = data.maxDuration || 3600;
      setTimeLeft(maxDuration);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // Chat rejected
    socket.on('chat-rejected', () => {
      setChatRequest(prev => ({ ...prev, chatStatus: 'Rejected' }));
      toast.error('Astrologer ne chat reject kar di');
    });

    // Chat ended
    socket.on('chat-ended', (data) => {
      if (timerRef.current) clearInterval(timerRef.current);
      toast.info(data.message || 'Chat session ended');
      setChatRequest(prev => ({ ...prev, chatStatus: 'Completed' }));
    });

    // Balance update (per-minute deduction)
    socket.on('balance-update', (data) => {
      setWalletBalance(data.balance);
    });

    // Typing indicators
    socket.on('user-typing', () => {
      setTyping(true);
    });
    socket.on('user-stop-typing', () => {
      setTyping(false);
    });

    // User joined
    socket.on('user-joined', (data) => {
      if (data.userType === 'astrologer') {
        // Astrologer joined the room
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    socketRef.current = socket;
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

  const handleEndChat = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('end-chat', { chatRequestId: chatId });
    }
    if (timerRef.current) clearInterval(timerRef.current);
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
            <div
              key={msg.id}
              className={`chat-bubble ${msg.senderType === 'user' || msg.senderId === user?.id ? 'sent' : 'received'}`}
            >
              <p className="bubble-text">{msg.message}</p>
              <span className="bubble-time">{formatMsgTime(msg.created_at)}</span>
            </div>
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
    </div>
  );
};

export default ChatRoom;
