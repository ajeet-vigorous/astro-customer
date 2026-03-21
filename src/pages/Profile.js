import React, { useState, useEffect } from 'react';
import { authApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Account.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', contactNo: '', gender: '', birthDate: '', birthPlace: '', birthTime: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await authApi.getProfile({ userId: user?.id || user?.userId });
        const d = res.data?.data || res.data;
        const profile = d?.recordList || (Array.isArray(d) ? d[0] : d);
        if (profile) {
          setForm({
            name: profile.name || '',
            email: profile.email || '',
            contactNo: profile.contactNo || '',
            gender: profile.gender || '',
            birthDate: profile.birthDate || '',
            birthPlace: profile.birthPlace || '',
            birthTime: profile.birthTime || '',
          });
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authApi.updateProfile(form);
      toast.success('Profile updated successfully!');
      const updatedProfile = res.data?.recordList || res.data?.data || {};
      if (updateUser) updateUser({ ...user, ...form, ...updatedProfile, isProfileComplete: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">My Profile</h2>
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter your email" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input type="tel" name="contactNo" value={form.contactNo} onChange={handleChange} disabled />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Time of Birth</label>
              <input type="time" name="birthTime" value={form.birthTime} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Place of Birth</label>
            <input type="text" name="birthPlace" value={form.birthPlace} onChange={handleChange} placeholder="Enter birth place" />
          </div>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
