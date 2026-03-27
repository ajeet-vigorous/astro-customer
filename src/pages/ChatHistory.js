import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import './Account.css';

const ChatHistory = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      try {
        const res = await accountApi.getChatHistory({ userId: user.id, startIndex: 0, fetchRecord: 50 });
        const d = res.data?.data || res.data;
        setChats(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">Chat History</h2>
        {chats.length === 0 ? (
          <div className="no-data">No chat history found</div>
        ) : (
          <div className="history-list">
            {chats.map((chat) => (
              <div key={chat.id} className="history-card">
                <div className="history-avatar">
                  <img src={chat.profileImage ? (chat.profileImage.startsWith('http') ? chat.profileImage : `http://localhost:5000${chat.profileImage}`) : '/default-avatar.png'} alt={chat.astrologerName || 'Astrologer'} />
                </div>
                <div className="history-info">
                  <h4>{chat.astrologerName || chat.name || 'Astrologer'}</h4>
                  <p className="history-meta">Duration: {chat.totalMin || chat.chat_duration || 0} min</p>
                  <p className="history-meta">Amount: &#8377;{parseFloat(chat.deduction || chat.amount || 0).toFixed(2)}</p>
                  {chat.created_at && <p className="history-date">{new Date(chat.created_at).toLocaleDateString('en-IN')}</p>}
                </div>
                <span className={`history-status ${(chat.status || '').toLowerCase()}`}>{chat.status || 'Completed'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
