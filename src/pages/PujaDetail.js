import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { pujaApi } from '../api/services';
import { toast } from 'react-toastify';
import './PujaList.css';

const PujaDetail = () => {
  const { id } = useParams();
  const [puja, setPuja] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pujaRes, faqRes] = await Promise.allSettled([
          pujaApi.getDetails({ pujaId: id }),
          pujaApi.getFaq({ pujaId: id }),
        ]);
        if (pujaRes.status === 'fulfilled') {
          const d = pujaRes.value.data?.data || pujaRes.value.data;
          setPuja(Array.isArray(d) ? d[0] : d);
        }
        if (faqRes.status === 'fulfilled') {
          const d = faqRes.value.data?.data || faqRes.value.data;
          setFaqs(Array.isArray(d) ? d : d?.recordList || []);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleBook = () => {
    toast.info('Puja booking coming soon!');
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!puja) return <div className="no-data">Puja not found</div>;

  return (
    <div className="puja-detail-page">
      <div className="container">
        <div className="puja-detail-nav">
          <Link to="/puja">&larr; Back to Pujas</Link>
        </div>
        <div className="puja-detail-layout">
          <div className="puja-detail-left">
            {puja.image && <img src={puja.image.startsWith('http') ? puja.image : `http://localhost:5000${puja.image}`} alt={puja.title || puja.name} className="puja-detail-img" />}
          </div>
          <div className="puja-detail-right">
            <h1>{puja.title || puja.name}</h1>
            <p className="puja-detail-price">&#8377;{puja.price || puja.amount || 0}</p>
            {puja.duration && <p className="puja-meta">Duration: {puja.duration}</p>}
            {puja.panditName && <p className="puja-meta">Pandit: {puja.panditName}</p>}
            <button className="puja-detail-book" onClick={handleBook}>Book This Puja</button>
          </div>
        </div>

        {(puja.description || puja.content) && (
          <div className="puja-detail-desc">
            <h3>About This Puja</h3>
            <div dangerouslySetInnerHTML={{ __html: puja.description || puja.content }} />
          </div>
        )}

        {(puja.benefits) && (
          <div className="puja-detail-desc">
            <h3>Benefits</h3>
            <div dangerouslySetInnerHTML={{ __html: puja.benefits }} />
          </div>
        )}

        {faqs.length > 0 && (
          <div className="puja-faq">
            <h3>FAQs</h3>
            {faqs.map((faq, i) => (
              <div key={faq.id || i} className="faq-item">
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.question}</span>
                  <span className="faq-toggle">{openFaq === i ? '−' : '+'}</span>
                </div>
                {openFaq === i && <div className="faq-a">{faq.answer}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PujaDetail;
