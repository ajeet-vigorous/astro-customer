import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageApi } from '../api/services';
import './StaticPage.css';

const slugMap = {
  'privacy-policy': 'Privacy Policy',
  'terms-condition': 'Terms & Conditions',
  'refund-policy': 'Refund Policy',
  'about-us': 'About Us',
};

const StaticPage = () => {
  const location = useLocation();
  const slug = location.pathname.replace('/', '');
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await pageApi.getPage(slug);
        const d = res.data?.data || res.data;
        setPage(Array.isArray(d) ? d[0] : d);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="static-page">
      <div className="list-hero">
        <h2>{page?.title || slugMap[slug] || slug}</h2>
      </div>
      <div className="container">
        <div className="static-content" dangerouslySetInnerHTML={{ __html: page?.description || page?.content || '<p>Content not available</p>' }} />
      </div>
    </div>
  );
};

export default StaticPage;
