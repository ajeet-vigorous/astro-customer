import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { astrologerApi, chatApi, callApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AstrologerList.css';

const AstrologerList = () => {
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestingId, setRequestingId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isChat = location.pathname.includes('chat');

  useEffect(() => {
    fetchAstrologers();
  }, [page]);

  const fetchAstrologers = async () => {
    setLoading(true);
    try {
      const res = await astrologerApi.getList({ s: search, startIndex: (page - 1) * 12, fetchRecord: 12 });
      const d = res.data;
      const list = d?.recordList || d?.data || [];
      setAstrologers(Array.isArray(list) ? list : []);
      const total = d?.totalCount || d?.totalRecords || list.length;
      setTotalPages(Math.ceil(total / 12) || 1);
    } catch (err) {
      console.error('Error fetching astrologers:', err);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAstrologers();
  };

  const handleRequest = async (e, astro, callType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) { toast.error('Please login first'); navigate('/login'); return; }

    const statusField = isChat ? astro.chatStatus : astro.callStatus;
    if (statusField === 'Offline') { toast.error('Astrologer is currently offline'); return; }
    if (statusField === 'Busy') { toast.error('Astrologer is currently busy'); return; }

    setRequestingId(astro.id);
    try {
      let res;
      if (isChat) {
        res = await chatApi.addRequest({ astrologerId: astro.id, chatRate: astro.charge });
      } else {
        res = await callApi.addRequest({ astrologerId: astro.id, callRate: callType === 11 ? (astro.videoCallRate || astro.charge) : astro.charge, call_type: callType || 10 });
      }
      const d = res.data;
      if (d?.status === 200) {
        toast.success(d.message || `${isChat ? 'Chat' : 'Call'} request sent! Waiting for astrologer to accept.`);
        // Navigate to chat/call room after sending request
        if (isChat && d?.recordList?.id) {
          navigate(`/chat-room/${d.recordList.id}`);
        } else if (!isChat && (d?.recordList?.id || d?.callId)) {
          navigate(`/call-room/${d.recordList?.id || d.callId}`);
        }
      } else {
        toast.error(d?.message || `Failed to send ${isChat ? 'chat' : 'call'} request`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to send ${isChat ? 'chat' : 'call'} request`);
    }
    setRequestingId(null);
  };

  return (
    <div className="astrologer-list-page">
      <div className="list-hero">
        <h2>{isChat ? 'Chat with Astrologer' : 'Talk to Astrologer'}</h2>
        <p>{isChat ? 'Get instant answers via chat from our expert astrologers' : 'Call and talk to expert astrologers for guidance'}</p>
      </div>

      <div className="container">
        <form className="search-bar" onSubmit={handleSearch}>
          <input type="text" placeholder="Search astrologers by name, skill..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit">Search</button>
        </form>

        {loading ? (
          <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>
        ) : astrologers.length === 0 ? (
          <div className="no-data">No astrologers found</div>
        ) : (
          <>
            <div className="astro-list-grid">
              {astrologers.map((astro) => (
                <Link key={astro.id} to={`/astrologer/${astro.id}`} className="astro-list-card">
                  <div className="astro-list-img">
                    <img src={astro.profileImage ? (astro.profileImage.startsWith('http') ? astro.profileImage : `http://localhost:5000${astro.profileImage}`) : '/default-avatar.png'} alt={astro.name} />
                    <span className={`status-badge ${astro.chatStatus === 'Online' || astro.callStatus === 'Online' ? 'online' : astro.chatStatus === 'Busy' || astro.callStatus === 'Busy' ? 'busy' : 'offline'}`}>
                      {astro.chatStatus === 'Online' || astro.callStatus === 'Online' ? 'Online' : astro.chatStatus === 'Busy' || astro.callStatus === 'Busy' ? 'Busy' : 'Offline'}
                    </span>
                  </div>
                  <div className="astro-list-info">
                    <h4>{astro.name}</h4>
                    <p className="astro-list-skill">{astro.primarySkill || astro.skill || '-'}</p>
                    <p className="astro-list-lang">{astro.languageKnown || astro.language || ''}</p>
                    <p className="astro-list-exp">{(astro.experienceInYears || astro.experience) ? `${astro.experienceInYears || astro.experience} yrs exp` : ''}</p>
                    <div className="astro-list-bottom">
                      <div className="astro-list-rating">
                        <span className="star">&#9733;</span>
                        <span>{astro.rating || '4.5'}</span>
                      </div>
                      <span className="astro-list-price">&#8377;{astro.charge || 0}/min</span>
                    </div>
                    {isChat ? (
                      <button className="astro-action-btn chat-btn" onClick={(e) => handleRequest(e, astro)} disabled={requestingId === astro.id}>
                        {requestingId === astro.id ? 'Requesting...' : 'Chat Now'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="astro-action-btn call-btn" onClick={(e) => handleRequest(e, astro, 10)} disabled={requestingId === astro.id}>
                          {requestingId === astro.id ? '...' : '📞 Audio'}
                        </button>
                        <button className="astro-action-btn video-btn" onClick={(e) => handleRequest(e, astro, 11)} disabled={requestingId === astro.id}>
                          {requestingId === astro.id ? '...' : '📹 Video'}
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                <span>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AstrologerList;
