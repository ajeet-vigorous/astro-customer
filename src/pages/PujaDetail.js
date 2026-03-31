import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { pujaApi, walletApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './PujaList.css';

const PujaDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [puja, setPuja] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [booking, setBooking] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pujaRes, faqRes] = await Promise.allSettled([
          pujaApi.getDetails({ pujaId: id }),
          pujaApi.getFaq({ pujaId: id }),
        ]);
        if (pujaRes.status === 'fulfilled') {
          const d = pujaRes.value.data?.recordList || pujaRes.value.data?.data || pujaRes.value.data;
          setPuja(Array.isArray(d) ? d[0] : d);
        }
        if (faqRes.status === 'fulfilled') {
          const d = faqRes.value.data?.recordList || faqRes.value.data?.data || faqRes.value.data;
          setFaqs(Array.isArray(d) ? d : []);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleBook = async () => {
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    const price = parseFloat(selectedPackage?.package_price || puja?.puja_price || puja?.price || 0);
    if (price <= 0) { toast.error('Invalid puja price'); return; }

    setBooking(true);
    try {
      // Check wallet balance
      const balRes = await walletApi.getBalance();
      const balance = parseFloat(balRes.data?.recordList?.amount || 0);
      if (balance < price) {
        toast.error(`Insufficient balance. Need ₹${price}, have ₹${balance.toFixed(2)}. Please recharge.`);
        setBooking(false); return;
      }

      const res = await pujaApi.placeOrder({
        pujaId: parseInt(id),
        packageId: selectedPackage?.id || null,
        amount: price,
      });
      const d = res.data;
      if (d?.status === 200) {
        toast.success(d.message || 'Puja booked successfully!');
        navigate('/orders');
      } else {
        toast.error(d?.message || 'Booking failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    }
    setBooking(false);
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
            {(puja.puja_images?.[0] || puja.image) && <img src={(() => { const img = puja.puja_images?.[0] || puja.image || ''; return img.startsWith('http') ? img : `http://localhost:5000/${img}`; })()} alt={puja.puja_title || puja.name} className="puja-detail-img" />}
          </div>
          <div className="puja-detail-right">
            <h1>{puja.puja_title || puja.title || puja.name}</h1>
            {puja.puja_subtitle && <p className="puja-subtitle" style={{ color: '#6b7280', marginTop: -8 }}>{puja.puja_subtitle}</p>}
            <p className="puja-detail-price">&#8377;{selectedPackage?.price || puja.puja_price || puja.price || puja.amount || 0}</p>
            {puja.puja_duration && <p className="puja-meta">Duration: {puja.puja_duration}</p>}
            {puja.puja_place && <p className="puja-meta">Place: {puja.puja_place}</p>}
            {puja.puja_start_datetime && <p className="puja-meta">Date: {new Date(puja.puja_start_datetime).toLocaleDateString('en-IN')}</p>}

            {puja.packages && puja.packages.length > 0 && (
              <div className="puja-packages">
                <h4>Select Package:</h4>
                {puja.packages.map(pkg => (
                  <label key={pkg.id} className={`puja-pkg-option ${selectedPackage?.id === pkg.id ? 'selected' : ''}`} onClick={() => setSelectedPackage(pkg)}>
                    <input type="radio" name="package" checked={selectedPackage?.id === pkg.id} onChange={() => setSelectedPackage(pkg)} />
                    <span className="pkg-name">{pkg.title || pkg.name || pkg.packageName} ({pkg.person || 1} person)</span>
                    <span className="pkg-price">&#8377;{pkg.package_price || pkg.price || pkg.amount}</span>
                  </label>
                ))}
              </div>
            )}

            <button className="puja-detail-book" onClick={handleBook} disabled={booking}>
              {booking ? 'Booking...' : `Book This Puja - ₹${selectedPackage?.package_price || puja.puja_price || puja.price || 0}`}
            </button>
          </div>
        </div>

        {(puja.long_description || puja.description) && (
          <div className="puja-detail-desc">
            <h3>About This Puja</h3>
            <div dangerouslySetInnerHTML={{ __html: puja.long_description || puja.description }} />
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
