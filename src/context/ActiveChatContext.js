import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ActiveChatContext = createContext();

const STORAGE_KEY = 'activeChat';

export const ActiveChatProvider = ({ children }) => {
  const [activeChat, setActiveChat] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  });

  // Save to localStorage whenever activeChat changes
  useEffect(() => {
    if (activeChat) localStorage.setItem(STORAGE_KEY, JSON.stringify(activeChat));
    else localStorage.removeItem(STORAGE_KEY);
  }, [activeChat]);

  const startChat = useCallback((data) => {
    setActiveChat({
      id: data.id,
      astrologerId: data.astrologerId,
      astrologerName: data.astrologerName || data.name || 'Astrologer',
      profileImage: data.profileImage || null,
      chatStatus: data.chatStatus || 'Pending',
      chatRate: data.chatRate || 0,
      startTime: data.startTime || Date.now(),
      maxDuration: data.maxDuration || 0,
    });
  }, []);

  const updateChat = useCallback((updates) => {
    setActiveChat(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const endChat = useCallback(() => {
    setActiveChat(null);
  }, []);

  return (
    <ActiveChatContext.Provider value={{ activeChat, startChat, updateChat, endChat }}>
      {children}
    </ActiveChatContext.Provider>
  );
};

// Hook to auto-redirect to chat on app open
export const useActiveChatRedirect = () => {
  const { activeChat } = useContext(ActiveChatContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeChat?.id && activeChat.chatStatus !== 'Completed') {
      const chatPath = `/chat-room/${activeChat.id}`;
      if (!location.pathname.includes('/chat-room/')) {
        // Only redirect on initial app load (not every navigation)
        const hasRedirected = sessionStorage.getItem('chatRedirected');
        if (!hasRedirected) {
          sessionStorage.setItem('chatRedirected', '1');
          navigate(chatPath);
        }
      }
    } else {
      sessionStorage.removeItem('chatRedirected');
    }
  }, []);
};

export const useActiveChat = () => useContext(ActiveChatContext);
