import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { astrologerApi, chatApi, callApi, walletApi, giftApi, reportApi, blockAstrologerApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AstrologerDetail.css';

const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '25 min', value: 25 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

const AstrologerDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [astro, setAstro] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [callLoading, setCallLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [sendingGift, setSendingGift] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({ firstName: '', lastName: '', gender: '', birthDate: '', birthTime: '', birthPlace: '', maritalStatus: '', occupation: '', comments: '', reportType: 'Kundali' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Intake form state
  const [showIntake, setShowIntake] = useState(false);
  const [intakeType, setIntakeType] = useState('chat'); // 'chat' or 'call'
  const [intakeForm, setIntakeForm] = useState({
    name: '', phoneNumber: '', gender: '', birthDate: '', birthTime: '',
    birthPlace: '', maritalStatus: '', occupation: '', topicOfConcern: '',
  });
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (user && showIntake) {
      setIntakeForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        phoneNumber: prev.phoneNumber || user.contactNo || '',
      }));
    }
  }, [user, showIntake]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [astroRes, revRes, followRes, blockRes, galleryRes] = await Promise.allSettled([
        astrologerApi.getById({ astrologerId: id }),
        astrologerApi.getReviews({ astrologerId: id }),
        user ? astrologerApi.getFollowing({ userId: user.id }) : Promise.resolve(null),
        user ? blockAstrologerApi.check({ astrologerId: id }) : Promise.resolve(null),
        astrologerApi.getGallery({ astrologerId: id }),
      ]);
      if (astroRes.status === 'fulfilled') {
        const d = astroRes.value.data?.data || astroRes.value.data;
        const record = d?.recordList || d;
        setAstro(Array.isArray(record) ? record[0] : record);
      }
      if (revRes.status === 'fulfilled') {
        const d = revRes.value.data?.data || revRes.value.data;
        setReviews(Array.isArray(d) ? d : d?.recordList || []);
      }
      if (followRes.status === 'fulfilled' && followRes.value) {
        const d = followRes.value.data?.data || followRes.value.data;
        const list = Array.isArray(d) ? d : d?.recordList || [];
        setIsFollowing(list.some(f => String(f.astrologerId || f.id) === String(id)));
      }
      if (blockRes.status === 'fulfilled' && blockRes.value) {
        setIsBlocked(!!blockRes.value.data?.isBlocked);
      }
      if (galleryRes.status === 'fulfilled') {
        const d = galleryRes.value.data?.recordList || [];
        setGallery(Array.isArray(d) ? d : []);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleBlock = async () => {
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} ${astro.name}?`)) return;
    setBlockLoading(true);
    try {
      const res = isBlocked
        ? await blockAstrologerApi.remove({ astrologerId: id })
        : await blockAstrologerApi.add({ astrologerId: id });
      const d = res.data;
      if (d?.status === 200) {
        setIsBlocked(!isBlocked);
        toast.success(isBlocked ? 'Astrologer unblocked' : 'Astrologer blocked');
      } else {
        toast.error(d?.message || 'Failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block astrologer');
    }
    setBlockLoading(false);
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    setFollowLoading(true);
    try {
      await astrologerApi.follow({ astrologerId: id });
      setIsFollowing(!isFollowing);
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
    setFollowLoading(false);
  };

  // When customer is auto-redirected from WaitingQueue (?fromQueue=1&action=call|chat|video),
  // open the intake modal automatically so they can start the session immediately.
  useEffect(() => {
    if (!astro) return;
    if (searchParams.get('fromQueue') !== '1') return;
    const action = searchParams.get('action');
    if (!action) return;
    // Small delay to let astrologer status refresh (just became Online from Busy)
    const t = setTimeout(() => {
      openIntakeModal(action);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [astro, searchParams]);

  const openIntakeModal = (type) => {
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    const statusField = type === 'chat' ? astro.chatStatus : astro.callStatus;
    if (statusField === 'Offline') { toast.error('Astrologer is currently offline'); return; }
    // Busy → offer Join Queue instead of rejecting
    if (statusField === 'Busy') {
      if (window.confirm(`${astro.name} is currently in another call. Would you like to join the waiting queue?`)) {
        joinWaitingQueue(type);
      }
      return;
    }
    setIntakeType(type);
    setShowIntake(true);
  };

  // Queue join — single-queue-per-customer model. Backend validates wallet.
  const joinWaitingQueue = async (type) => {
    try {
      const { waitlistApi } = await import('../api/services');
      const requestType = type === 'chat' ? 'Chat' : type === 'video' ? 'Video' : 'Audio';
      const res = await waitlistApi.join({
        astrologerId: parseInt(id),
        requestType,
        userName: user?.name,
        profile: user?.profile,
      });
      const d = res.data;
      if (d?.status === 200) {
        toast.success(`Joined queue at position #${d.position} (~${d.eta} min wait)`);
        navigate(`/waiting/${id}`);
      } else {
        toast.error(d?.message || 'Could not join queue');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not join queue';
      if (err.response?.data?.walletShortfall) {
        if (window.confirm(`${msg}\n\nRecharge wallet now?`)) navigate('/wallet');
      } else {
        toast.error(msg);
      }
    }
  };

  const handleIntakeChange = (e) => {
    setIntakeForm({ ...intakeForm, [e.target.name]: e.target.value });
  };

  const handleIntakeSubmit = async (e) => {
    e.preventDefault();
    if (!intakeForm.name || !intakeForm.birthDate || !intakeForm.gender || !intakeForm.topicOfConcern) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Check wallet balance
      const charge = parseFloat(astro.charge || 0);
      const totalCost = charge * selectedDuration;

      const balRes = await walletApi.getBalance();
      const wallet = balRes.data?.recordList || balRes.data?.data;
      const balance = parseFloat(wallet?.amount || 0);

      if (balance < totalCost) {
        toast.error(`Insufficient balance. You need ₹${totalCost} but have ₹${balance.toFixed(2)}. Please recharge your wallet.`);
        setSubmitting(false);
        return;
      }

      // Save intake form
      await chatApi.addIntakeForm({
        astrologerId: id,
        ...intakeForm,
        chat_duration: selectedDuration * 60,
      });

      // Send chat/call request
      let res;
      if (intakeType === 'chat') {
        res = await chatApi.addRequest({
          astrologerId: id,
          chatRate: charge,
          chat_duration: selectedDuration * 60,
        });
      } else {
        res = await callApi.addRequest({
          astrologerId: id,
          callRate: intakeType === 'video' ? (astro.videoCallRate || charge) : charge,
          call_duration: selectedDuration * 60,
          call_type: intakeType === 'video' ? 11 : 10,
        });
      }

      const d = res.data;
      if (d?.status === 200) {
        toast.success(d.message || `${intakeType === 'chat' ? 'Chat' : intakeType === 'video' ? 'Video Call' : 'Call'} request sent!`);
        setShowIntake(false);
        if (intakeType === 'chat' && d?.recordList?.id) {
          navigate(`/chat-room/${d.recordList.id}`);
        } else if ((intakeType === 'call' || intakeType === 'video') && (d?.recordList?.id || d?.callId)) {
          navigate(`/call-room/${d.recordList?.id || d.callId}`);
        }
      } else {
        toast.error(d?.message || 'Request failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    }
    setSubmitting(false);
  };

  const handleCall = async () => {
    openIntakeModal('call');
  };

  const handleVideoCall = async () => {
    openIntakeModal('video');
  };

  const handleChat = async () => {
    openIntakeModal('chat');
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    try {
      await astrologerApi.addReview({ astrologerId: id, rating, review: reviewText });
      toast.success('Review submitted');
      setReviewText('');
      setRating(5);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!astro) return <div className="no-data">Astrologer not found</div>;

  const imgSrc = astro.profileImage ? (astro.profileImage.startsWith('http') ? astro.profileImage : `http://localhost:5000/${astro.profileImage.replace(/^\//, '')}`) : '/default-avatar.png';
  const charge = parseFloat(astro.charge || 0);

  return (
    <div className="astro-detail-page">
      <div className="astro-detail-hero">
        <div className="container">
          <div className="astro-detail-top">
            <div className="astro-detail-avatar">
              <img src={imgSrc} alt={astro.name} />
              <span className={`detail-status ${astro.chatStatus === 'Online' || astro.callStatus === 'Online' ? 'online' : 'offline'}`}>
                {astro.chatStatus === 'Online' || astro.callStatus === 'Online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="astro-detail-info">
              <h2>{astro.name}</h2>
              <p className="detail-skill">{Array.isArray(astro.primarySkill) ? astro.primarySkill.map(s => s.name).join(', ') : (astro.primarySkill || astro.skill || '-')}</p>
              <p className="detail-lang">{Array.isArray(astro.languageKnown) ? astro.languageKnown.map(l => l.languageName || l.name).join(', ') : (astro.languageKnown || astro.language || '')}</p>
              <p className="detail-exp">{(astro.experienceInYears || astro.experience) ? `${astro.experienceInYears || astro.experience} years experience` : ''}</p>
              <div className="detail-rating">
                <span className="star">&#9733;</span>
                <span>{astro.rating || '4.5'}</span>
                <span className="review-count">({reviews.length} reviews)</span>
              </div>
              <p className="detail-price">&#8377;{charge}/min</p>
              <div className="detail-actions">
                <button className="detail-call-btn" onClick={handleCall} disabled={astro.callStatus === 'Offline'}>
                  &#128222; Audio Call
                </button>
                <button className="detail-video-btn" onClick={handleVideoCall} disabled={astro.callStatus === 'Offline'}>
                  &#128249; Video Call
                </button>
                <button className="detail-chat-btn" onClick={handleChat} disabled={astro.chatStatus === 'Offline'}>
                  &#128172; Chat Now
                </button>
                <button className={`detail-follow-btn ${isFollowing ? 'following' : ''}`} onClick={handleFollow} disabled={followLoading}>
                  {followLoading ? '...' : isFollowing ? '&#10003; Following' : '+ Follow'}
                </button>
                <button className="detail-gift-btn" onClick={async () => {
                  if (!user) { toast.error('Please login first'); navigate('/login'); return; }
                  try { const res = await giftApi.getAll(); setGifts(res.data?.recordList || []); } catch(e) {}
                  setShowGifts(true);
                }}>&#127873; Send Gift</button>
                <button className="detail-report-btn" onClick={() => {
                  if (!user) { toast.error('Please login first'); navigate('/login'); return; }
                  setReportForm(prev => ({ ...prev, firstName: user.name || '' }));
                  setShowReport(true);
                }}>&#128196; Get Report</button>
                <button
                  className={`detail-block-btn ${isBlocked ? 'blocked' : ''}`}
                  onClick={handleBlock}
                  disabled={blockLoading}
                  style={{
                    background: isBlocked ? '#6b7280' : '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: blockLoading ? 'not-allowed' : 'pointer',
                    opacity: blockLoading ? 0.6 : 1,
                  }}
                >
                  {blockLoading ? '...' : isBlocked ? '\u{1F513} Unblock' : '\u{1F6AB} Block'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {astro.aboutMe && (
          <section className="detail-section">
            <h3>About</h3>
            <p>{astro.aboutMe}</p>
          </section>
        )}

        {(astro.primarySkill || astro.allSkill || astro.skill) && (
          <section className="detail-section">
            <h3>Expertise</h3>
            <div className="expertise-tags">
              {(() => {
                const skills = astro.allSkill || astro.primarySkill || astro.skill || '';
                const arr = Array.isArray(skills) ? skills : String(skills).split(',');
                return arr.map((s, i) => (
                  <span key={i} className="expertise-tag">{typeof s === 'object' ? s.name : String(s).trim()}</span>
                ));
              })()}
            </div>
          </section>
        )}

        {/* Quick info cards */}
        <section className="detail-section">
          <h3>Profile</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { label: 'Experience', value: (astro.experienceInYears || astro.experience) ? `${astro.experienceInYears || astro.experience} yrs` : '-' },
              { label: 'Gender', value: astro.gender || '-' },
              { label: 'City', value: astro.currentCity || '-' },
              { label: 'Country', value: astro.country || '-' },
              { label: 'Total Orders', value: astro.totalOrder ?? '-' },
              { label: 'Available Hrs/day', value: astro.dailyContribution ? `${astro.dailyContribution} hrs` : '-' },
              { label: 'Verified', value: astro.isVerified ? '✅ Yes' : 'No' },
              { label: 'Languages', value: Array.isArray(astro.languageKnown) ? astro.languageKnown.map(l => l.languageName || l.name).join(', ') : (astro.languageKnown || '-') },
              {
                label: 'Chat Status',
                value: (() => { const st = astro.chatStatus || '-'; const c = st === 'Online' ? '#16a34a' : st === 'Busy' ? '#d97706' : '#9ca3af'; return <span style={{ color: c }}>{st !== '-' && '● '}{st}</span>; })(),
              },
              {
                label: 'Call Status',
                value: (() => { const st = astro.callStatus || '-'; const c = st === 'Online' ? '#16a34a' : st === 'Busy' ? '#d97706' : '#9ca3af'; return <span style={{ color: c }}>{st !== '-' && '● '}{st}</span>; })(),
              },
            ].map((it, i) => (
              <div key={i} style={{ background: '#faf7ff', border: '1px solid #e0d4f5', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{it.label}</div>
                <div style={{ fontSize: '0.95rem', color: '#1a0533', marginTop: 4, fontWeight: 600 }}>{it.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Consultation charges */}
        <section className="detail-section">
          <h3>Consultation Charges</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { label: 'Chat / Audio Call', value: `₹${parseFloat(astro.charge || 0)}/min` },
              { label: 'Video Call', value: astro.videoCallRate ? `₹${parseFloat(astro.videoCallRate)}/min` : '-' },
              { label: 'Report', value: astro.reportRate ? `₹${parseFloat(astro.reportRate)}` : '-' },
            ].map((it, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e0d4f5', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>{it.label}</div>
                <div style={{ fontSize: '1.1rem', color: '#16a34a', marginTop: 4, fontWeight: 700 }}>{it.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        {Array.isArray(astro.astrologerCategoryId) && astro.astrologerCategoryId.length > 0 && (
          <section className="detail-section">
            <h3>Categories</h3>
            <div className="expertise-tags">
              {astro.astrologerCategoryId.map((c, i) => (
                <span key={i} className="expertise-tag">{typeof c === 'object' ? c.name : c}</span>
              ))}
            </div>
          </section>
        )}

        {/* About the astrologer */}
        {(astro.loginBio || astro.whyOnBoard || astro.goodQuality || astro.biggestChallenge || astro.whatwillDo) && (
          <section className="detail-section">
            <h3>About {astro.name}</h3>
            {astro.loginBio && <p style={{ marginBottom: 12 }}>{astro.loginBio}</p>}
            {[
              { q: 'Why I joined', a: astro.whyOnBoard },
              { q: 'My strengths', a: astro.goodQuality },
              { q: 'Biggest challenge I solve', a: astro.biggestChallenge },
              { q: 'How I help', a: astro.whatwillDo },
            ].filter(x => x.a).map((x, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.9rem' }}>{x.q}</div>
                <div style={{ color: '#374151', fontSize: '0.92rem' }}>{x.a}</div>
              </div>
            ))}
          </section>
        )}

        {/* Education */}
        {(astro.degree || astro.college || astro.learnAstrology) && (
          <section className="detail-section">
            <h3>Education</h3>
            {astro.degree && <p style={{ margin: '4px 0' }}><strong>Degree:</strong> {astro.degree}</p>}
            {astro.college && <p style={{ margin: '4px 0' }}><strong>College:</strong> {astro.college}</p>}
            {astro.learnAstrology && <p style={{ margin: '4px 0' }}><strong>Formally learnt astrology:</strong> {astro.learnAstrology}</p>}
          </section>
        )}

        {/* Social links */}
        {(astro.instaProfileLink || astro.facebookProfileLink || astro.linkedInProfileLink || astro.youtubeChannelLink || astro.websiteProfileLink) && (
          <section className="detail-section">
            <h3>Connect</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { label: 'Instagram', url: astro.instaProfileLink },
                { label: 'Facebook', url: astro.facebookProfileLink },
                { label: 'LinkedIn', url: astro.linkedInProfileLink },
                { label: 'YouTube', url: astro.youtubeChannelLink },
                { label: 'Website', url: astro.websiteProfileLink },
              ].filter(s => s.url).map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: '#faf7ff', border: '1px solid #e0d4f5', color: '#7c3aed', padding: '8px 16px', borderRadius: 20, fontWeight: 600, fontSize: '0.85rem' }}>
                  {s.label} ↗
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Availability */}
        {Array.isArray(astro.astrologerAvailability) && astro.astrologerAvailability.length > 0 && (
          <section className="detail-section">
            <h3>Availability</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {astro.astrologerAvailability.map((d, i) => {
                const slots = (d.time || []).filter(t => t.fromTime && t.toTime);
                const available = slots.length > 0;
                return (
                  <div key={i} style={{ background: available ? '#faf7ff' : '#f9fafb', border: `1px solid ${available ? '#e0d4f5' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#1a0533', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{d.day}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: available ? '#16a34a' : '#9ca3af' }}>{available ? '● Open' : 'Closed'}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 2 }}>
                      {available ? slots.map((t) => `${t.fromTime} - ${t.toTime}`).join(', ') : 'Not available'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="detail-section">
            <h3>Gallery</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {gallery.map(g => {
                const src = g.image?.startsWith('http') ? g.image : `http://localhost:5000/${(g.image || '').replace(/^\//, '')}`;
                return (
                  <a key={g.id} href={src} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: '1px solid #e0d4f5', aspectRatio: '1', background: '#faf7ff' }}>
                    <img src={src} alt="gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <section className="detail-section">
          <h3>Reviews ({reviews.length})</h3>
          {user && (
            <form className="review-form" onSubmit={handleReview}>
              <div className="rating-select">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`rate-star ${n <= rating ? 'active' : ''}`} onClick={() => setRating(n)}>&#9733;</span>
                ))}
              </div>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write your review..." rows={3} />
              <button type="submit">Submit Review</button>
            </form>
          )}
          {reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((rev) => (
                <div key={rev.id} className="review-item">
                  <div className="review-header">
                    <strong>{rev.userName || rev.name || 'User'}</strong>
                    <div className="review-stars">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`rev-star ${n <= (rev.rating || 0) ? 'filled' : ''}`}>&#9733;</span>
                      ))}
                    </div>
                  </div>
                  <p>{rev.review}</p>
                  {rev.reply && <div className="review-reply"><strong>Reply:</strong> {rev.reply}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Intake Form Modal */}
      {showIntake && (
        <div className="intake-overlay" onClick={() => setShowIntake(false)}>
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button className="intake-close" onClick={() => setShowIntake(false)}>&times;</button>
            <h3>{intakeType === 'chat' ? 'Chat' : intakeType === 'video' ? 'Video Call' : 'Audio Call'} with {astro.name}</h3>
            <p className="intake-subtitle">Please fill your details to proceed</p>

            <form onSubmit={handleIntakeSubmit}>
              <div className="intake-row">
                <div className="intake-field">
                  <label>Name *</label>
                  <input name="name" value={intakeForm.name} onChange={handleIntakeChange} required />
                </div>
                <div className="intake-field">
                  <label>Phone</label>
                  <input name="phoneNumber" value={intakeForm.phoneNumber} onChange={handleIntakeChange} />
                </div>
              </div>
              <div className="intake-row">
                <div className="intake-field">
                  <label>Gender *</label>
                  <select name="gender" value={intakeForm.gender} onChange={handleIntakeChange} required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="intake-field">
                  <label>Marital Status</label>
                  <select name="maritalStatus" value={intakeForm.maritalStatus} onChange={handleIntakeChange}>
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="intake-row">
                <div className="intake-field">
                  <label>Birth Date *</label>
                  <input type="date" name="birthDate" value={intakeForm.birthDate} onChange={handleIntakeChange} required />
                </div>
                <div className="intake-field">
                  <label>Birth Time</label>
                  <input type="time" name="birthTime" value={intakeForm.birthTime} onChange={handleIntakeChange} />
                </div>
              </div>
              <div className="intake-row">
                <div className="intake-field">
                  <label>Birth Place</label>
                  <input name="birthPlace" value={intakeForm.birthPlace} onChange={handleIntakeChange} placeholder="City, State" />
                </div>
                <div className="intake-field">
                  <label>Occupation</label>
                  <input name="occupation" value={intakeForm.occupation} onChange={handleIntakeChange} />
                </div>
              </div>
              <div className="intake-field full">
                <label>Topic of Concern *</label>
                <textarea name="topicOfConcern" value={intakeForm.topicOfConcern} onChange={handleIntakeChange} rows={2} placeholder="Describe your concern..." required />
              </div>

              <div className="intake-duration">
                <label>Select Duration</label>
                <div className="duration-options">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`duration-btn ${selectedDuration === opt.value ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(opt.value)}
                    >
                      {opt.label}
                      <span className="duration-price">&#8377;{(charge * opt.value).toFixed(0)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="intake-total">
                <span>Total: <strong>&#8377;{(charge * selectedDuration).toFixed(0)}</strong> ({selectedDuration} min x &#8377;{charge}/min)</span>
              </div>

              <button type="submit" className="intake-submit" disabled={submitting}>
                {submitting ? 'Sending Request...' : `Start ${intakeType === 'chat' ? 'Chat' : intakeType === 'video' ? 'Video Call' : 'Audio Call'}`}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Report Modal */}
      {showReport && (
        <div className="intake-overlay" onClick={() => setShowReport(false)}>
          <div className="intake-modal" onClick={(e) => e.stopPropagation()}>
            <button className="intake-close" onClick={() => setShowReport(false)}>&times;</button>
            <h3>Request Report from {astro.name}</h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 16 }}>&#8377;{astro.reportRate || 0}/report</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setReportSubmitting(true);
              try {
                const res = await reportApi.addReport({ ...reportForm, astrologerId: id, reportRate: astro.reportRate || 0 });
                if (res.data?.status === 200) { toast.success('Report requested!'); setShowReport(false); }
                else toast.error(res.data?.message || 'Failed');
              } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
              setReportSubmitting(false);
            }}>
              <div className="intake-row">
                <div className="intake-field"><label>First Name *</label><input value={reportForm.firstName} onChange={e => setReportForm({...reportForm, firstName: e.target.value})} required /></div>
                <div className="intake-field"><label>Last Name</label><input value={reportForm.lastName} onChange={e => setReportForm({...reportForm, lastName: e.target.value})} /></div>
              </div>
              <div className="intake-row">
                <div className="intake-field"><label>Gender *</label><select value={reportForm.gender} onChange={e => setReportForm({...reportForm, gender: e.target.value})} required><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                <div className="intake-field"><label>Report Type *</label><select value={reportForm.reportType} onChange={e => setReportForm({...reportForm, reportType: e.target.value})}><option value="Kundali">Kundali</option><option value="Career">Career</option><option value="Marriage">Marriage</option><option value="Health">Health</option><option value="Finance">Finance</option></select></div>
              </div>
              <div className="intake-row">
                <div className="intake-field"><label>Birth Date *</label><input type="date" value={reportForm.birthDate} onChange={e => setReportForm({...reportForm, birthDate: e.target.value})} required /></div>
                <div className="intake-field"><label>Birth Time</label><input type="time" value={reportForm.birthTime} onChange={e => setReportForm({...reportForm, birthTime: e.target.value})} /></div>
              </div>
              <div className="intake-row">
                <div className="intake-field"><label>Birth Place</label><input value={reportForm.birthPlace} onChange={e => setReportForm({...reportForm, birthPlace: e.target.value})} placeholder="City, State" /></div>
                <div className="intake-field"><label>Marital Status</label><select value={reportForm.maritalStatus} onChange={e => setReportForm({...reportForm, maritalStatus: e.target.value})}><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option></select></div>
              </div>
              <div className="intake-field full"><label>Comments</label><textarea value={reportForm.comments} onChange={e => setReportForm({...reportForm, comments: e.target.value})} rows={2} placeholder="Any specific questions..." /></div>
              <button type="submit" className="intake-submit" disabled={reportSubmitting}>{reportSubmitting ? 'Submitting...' : `Request Report - ₹${astro.reportRate || 0}`}</button>
            </form>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showGifts && (
        <div className="intake-overlay" onClick={() => setShowGifts(false)}>
          <div className="intake-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <button className="intake-close" onClick={() => setShowGifts(false)}>&times;</button>
            <h3>Send Gift to {astro.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
              {gifts.map(g => (
                <div key={g.id} onClick={async () => {
                  if (sendingGift) return;
                  setSendingGift(true);
                  try {
                    const res = await giftApi.send({ astrologerId: id, giftId: g.id, amount: g.amount });
                    if (res.data?.status === 200) { toast.success('Gift sent!'); setShowGifts(false); }
                    else toast.error(res.data?.message || 'Failed');
                  } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                  setSendingGift(false);
                }} style={{ cursor: 'pointer', textAlign: 'center', padding: 12, border: '2px solid #e0d4f5', borderRadius: 12, transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#7c3aed'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e0d4f5'}>
                  {g.image && <img src={g.image.startsWith('http') ? g.image : `http://localhost:5000/${g.image}`} alt={g.name} style={{ width: 50, height: 50, objectFit: 'contain' }} />}
                  <p style={{ margin: '6px 0 2px', fontWeight: 600, fontSize: '0.85rem' }}>{g.name}</p>
                  <p style={{ margin: 0, color: '#7c3aed', fontWeight: 700 }}>&#8377;{g.amount}</p>
                </div>
              ))}
            </div>
            {gifts.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No gifts available</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default AstrologerDetail;
