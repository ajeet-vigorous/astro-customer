import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useActiveChat } from '../context/ActiveChatContext';
import './FloatingChatBubble.css';

const FloatingChatBubble = () => {
  const { activeChat } = useActiveChat();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeDisplay, setTimeDisplay] = useState('');
  const [pulse, setPulse] = useState(false);

  // Don't show on chat room page itself
  const isOnChatPage = location.pathname.includes('/chat-room/');

  useEffect(() => {
    if (!activeChat || activeChat.chatStatus === 'Completed') return;

    const timer = setInterval(() => {
      if (activeChat.chatStatus === 'Accepted' && activeChat.startTime && activeChat.maxDuration) {
        const elapsed = Math.floor((Date.now() - activeChat.startTime) / 1000);
        const remaining = Math.max(0, activeChat.maxDuration - elapsed);
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        setTimeDisplay(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
        if (remaining < 120) setPulse(true);
        else setPulse(false);
      } else if (activeChat.chatStatus === 'Pending') {
        setTimeDisplay('Waiting...');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeChat]);

  if (!activeChat || activeChat.chatStatus === 'Completed' || isOnChatPage) return null;

  const initial = (activeChat.astrologerName || 'A').charAt(0).toUpperCase();

  return (
    <div className={`fcb-container ${pulse ? 'fcb-pulse' : ''}`} onClick={() => navigate(`/chat-room/${activeChat.id}`)}>
      <div className="fcb-bubble">
        <div className="fcb-avatar">
          {activeChat.profileImage ? (
            <img src={activeChat.profileImage} alt="" onError={e => { e.target.style.display = 'none'; }} />
          ) : null}
          <span className="fcb-initial">{initial}</span>
        </div>
        <div className="fcb-online-dot"></div>
      </div>
      <div className="fcb-timer">
        {timeDisplay || (activeChat.chatStatus === 'Accepted' ? 'Live' : 'Pending')}
      </div>
    </div>
  );
};

export default FloatingChatBubble;
