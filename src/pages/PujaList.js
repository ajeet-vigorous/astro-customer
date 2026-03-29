import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { pujaApi } from '../api/services';
import './PujaList.css';

const PujaList = () => {
  const [categories, setCategories] = useState([]);
  const [pujas, setPujas] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await pujaApi.getCategories();
        const d = res.data?.data || res.data;
        setCategories(Array.isArray(d) ? d : d?.recordList || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (selectedCat) {
      fetchPujas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat]);

  const fetchPujas = async () => {
    try {
      const res = await pujaApi.getList({ categoryId: selectedCat });
      const d = res.data?.data || res.data;
      setPujas(Array.isArray(d) ? d : d?.recordList || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="puja-list-page">
      <div className="list-hero">
        <h2>Book a Puja</h2>
        <p>Choose from various puja services performed by expert pandits</p>
      </div>
      <div className="container">
        <h3 className="puja-sec-title">Puja Categories</h3>
        <div className="puja-cat-grid">
          {categories.map(cat => (
            <div key={cat.id} className={`puja-cat-card ${String(selectedCat) === String(cat.id) ? 'active' : ''}`} onClick={() => setSelectedCat(cat.id)}>
              {cat.image && <img src={cat.image.startsWith('http') ? cat.image : `https://astrology-i7c9.onrender.com${cat.image}`} alt={cat.title || cat.name} />}
              <h5>{cat.title || cat.name}</h5>
            </div>
          ))}
        </div>

        {selectedCat && (
          <>
            <h3 className="puja-sec-title" style={{ marginTop: 32 }}>Available Pujas</h3>
            {pujas.length === 0 ? (
              <div className="no-data">No pujas found in this category</div>
            ) : (
              <div className="puja-items-grid">
                {pujas.map(puja => (
                  <Link key={puja.id} to={`/puja/${puja.id}`} className="puja-item-card">
                    {puja.image && <img src={puja.image.startsWith('http') ? puja.image : `https://astrology-i7c9.onrender.com${puja.image}`} alt={puja.title || puja.name} />}
                    <div className="puja-item-info">
                      <h4>{puja.title || puja.name}</h4>
                      <p>{(puja.description || '').replace(/<[^>]+>/g, '').slice(0, 100)}</p>
                      <div className="puja-item-bottom">
                        <span className="puja-price">&#8377;{puja.price || puja.amount || 0}</span>
                        <button className="puja-book-btn">Book Now</button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PujaList;
