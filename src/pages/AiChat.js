import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { aiChatApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AiChat.css';

const AiChat = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [astro, setAstro] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [astroRes, historyRes] = await Promise.allSettled([
          aiChatApi.getById({ id }),
          aiChatApi.getHistory({ aiAstrologerId: id }),
        ]);
        if (astroRes.status === 'fulfilled' && astroRes.value.data?.status === 200) {
          setAstro(astroRes.value.data.recordList);
        }
        if (historyRes.status === 'fulfilled') {
          setMessages(historyRes.value.data?.recordList || []);
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    // Add user message locally
    setMessages(prev => [...prev, { role: 'user', content: msg, created_at: new Date().toISOString() }]);

    try {
      const res = await aiChatApi.sendMessage({ aiAstrologerId: parseInt(id), message: msg });
      const d = res.data;
      if (d?.status === 200) {
        setMessages(prev => [...prev, { role: 'assistant', content: d.reply, created_at: new Date().toISOString() }]);
        setBalance(d.walletBalance);
      } else {
        toast.error(d?.message || 'Failed to send');
        // Remove user message on error
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send');
      setMessages(prev => prev.slice(0, -1));
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!astro) return <div className="no-data">AI Astrologer not found</div>;

  const imgSrc = astro.image ? (astro.image.startsWith('http') ? astro.image : `${process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000'}/${astro.image}`) : null;

  return (
    <div className="ai-chat-page">
      <div className="ai-chat-header">
        <Link to="/ai-astrologer" className="ai-back">&larr;</Link>
        <div className="ai-header-info">
          {imgSrc ? <img src={imgSrc} alt={astro.name} className="ai-header-img" /> : <div className="ai-header-avatar">{astro.name[0]}</div>}
          <div>
            <h3>{astro.name}</h3>
            <span className="ai-badge">AI</span>
            <span className="ai-charge">&#8377;{astro.chat_charge}/msg</span>
          </div>
        </div>
      </div>

      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-avatar">{imgSrc ? <img src={imgSrc} alt="" /> : astro.name[0]}</div>
            <h3>Hi! I'm {astro.name}</h3>
            <p>{astro.about}</p>
            <p className="ai-hint">Ask me anything about astrology, kundali, career, relationship...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ${msg.role}`}>
            {msg.role === 'assistant' && <div className="ai-msg-avatar">{astro.name[0]}</div>}
            <div className="ai-msg-bubble">
              <p>{msg.content}</p>
              <span className="ai-msg-time">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
            </div>
          </div>
        ))}
        {sending && (
          <div className="ai-msg assistant">
            <div className="ai-msg-avatar">{astro.name[0]}</div>
            <div className="ai-msg-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-chat-input">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Type your question..." rows={1} disabled={sending} />
        <button onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export default AiChat;
