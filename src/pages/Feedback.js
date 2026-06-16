import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

const Feedback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    if (!review.trim()) { toast.error('Please write your feedback'); return; }
    setSubmitting(true);
    try {
      // appId = 1 (customer app)
      const res = await feedbackApi.add({ review: review.trim(), appId: 1 });
      if (res.data?.status === 200) {
        toast.success('Thank you for your feedback!');
        setReview('');
      } else {
        toast.error(res.data?.message || res.data?.error || 'Failed to submit');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to submit feedback');
    }
    setSubmitting(false);
  };

  return (
    <div className="account-page">
      <div className="container" style={{ maxWidth: 560 }}>
        <h2 className="account-title">Feedback</h2>
        <p style={{ color: '#6b7280', marginTop: -8, marginBottom: 18 }}>
          Tell us what you think about the app — suggestions, issues, or anything we can improve.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Your Feedback</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder="Write your feedback here..."
            style={{ width: '100%', padding: 12, marginTop: 8, border: '1px solid #e0d4f5', borderRadius: 10, resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem' }}
          />
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>{review.length}/1000</div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', marginTop: 12, padding: '12px', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Feedback;
