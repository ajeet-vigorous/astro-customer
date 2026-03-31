import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi, horoscopeApi, blogApi, productApi, pujaApi } from '../api/services';
import './Home.css';

const Home = () => {
  const [banners, setBanners] = useState([]);
  const [astrologers, setAstrologers] = useState([]);
  const [horoscopeSigns, setHoroscopeSigns] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [pujaCategories, setPujaCategories] = useState([]);
  const [recommendedPujas, setRecommendedPujas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannersRes, astroRes, horoRes, blogRes, prodRes, pujaRes, recPujaRes] = await Promise.allSettled([
          homeApi.getBanners(),
          homeApi.getAstrologers({ startIndex: 0, fetchRecord: 8 }),
          horoscopeApi.getSigns(),
          blogApi.getAll(),
          productApi.getProducts({}),
          pujaApi.getCategories(),
          pujaApi.getRecommended(),
        ]);

        if (bannersRes.status === 'fulfilled') {
          const d = bannersRes.value.data?.data || bannersRes.value.data;
          setBanners(Array.isArray(d) ? d : d?.recordList || []);
        }
        if (astroRes.status === 'fulfilled') {
          const d = astroRes.value.data;
          const list = d?.recordList || d?.data || [];
          setAstrologers((Array.isArray(list) ? list : []).slice(0, 8));
        }
        if (horoRes.status === 'fulfilled') {
          const d = horoRes.value.data?.data || horoRes.value.data;
          setHoroscopeSigns(Array.isArray(d) ? d : d?.recordList || []);
        }
        if (blogRes.status === 'fulfilled') {
          const d = blogRes.value.data?.data || blogRes.value.data;
          setBlogs((Array.isArray(d) ? d : d?.recordList || []).slice(0, 6));
        }
        if (prodRes.status === 'fulfilled') {
          const d = prodRes.value.data?.data || prodRes.value.data;
          setProducts((Array.isArray(d) ? d : d?.recordList || []).slice(0, 6));
        }
        if (pujaRes.status === 'fulfilled') {
          const d = pujaRes.value.data?.data || pujaRes.value.data;
          setPujaCategories(Array.isArray(d) ? d : d?.recordList || []);
        }
        if (recPujaRes?.status === 'fulfilled') {
          setRecommendedPujas(recPujaRes.value.data?.recordList || []);
        }
      } catch (err) {
        console.error('Error loading home data:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  }

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero-section">
        <div className="hero-overlay">
          <h2>Connect with Expert Astrologers</h2>
          <p>Get personalized guidance on Love, Career, Health & Life</p>
          <div className="hero-actions">
            <Link to="/talk-to-astrologer" className="hero-btn talk">Talk to Astrologer</Link>
            <Link to="/chat-with-astrologer" className="hero-btn chat">Chat with Astrologer</Link>
          </div>
          <div className="hero-features">
            <div className="feature"><span>&#9733;</span> 1000+ Astrologers</div>
            <div className="feature"><span>&#128274;</span> 100% Private</div>
            <div className="feature"><span>&#9201;</span> 24/7 Available</div>
          </div>
        </div>
      </section>

      {/* Quick Services */}
      <section className="quick-services">
        <div className="container">
          <div className="service-grid">
            <Link to="/kundali" className="service-card">
              <span className="service-icon">&#128302;</span>
              <h4>Free Kundali</h4>
              <p>Generate your birth chart</p>
            </Link>
            <Link to="/kundali-matching" className="service-card">
              <span className="service-icon">&#128149;</span>
              <h4>Kundali Matching</h4>
              <p>Check compatibility</p>
            </Link>
            <Link to="/horoscope" className="service-card">
              <span className="service-icon">&#9734;</span>
              <h4>Daily Horoscope</h4>
              <p>Know your day ahead</p>
            </Link>
            <Link to="/puja" className="service-card">
              <span className="service-icon">&#128591;</span>
              <h4>Book Puja</h4>
              <p>Online puja services</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Horoscope Signs */}
      {horoscopeSigns.length > 0 && (
        <section className="section horoscope-section">
          <div className="container">
            <h3 className="section-title">Horoscope Predictions</h3>
            <p className="section-subtitle">Select your zodiac sign to read today's horoscope</p>
            <div className="horoscope-grid">
              {horoscopeSigns.map((sign) => (
                <Link key={sign.id} to={`/daily-horoscope/${sign.name?.toLowerCase()}`} className="horoscope-card">
                  {sign.image && <img src={sign.image.startsWith('http') ? sign.image : `http://localhost:5000${sign.image}`} alt={sign.name} />}
                  <span>{sign.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Our Astrologers */}
      {astrologers.length > 0 && (
        <section className="section astrologer-section">
          <div className="container">
            <div className="section-header">
              <h3 className="section-title">Our Astrologers</h3>
              <Link to="/talk-to-astrologer" className="view-all">View All &rarr;</Link>
            </div>
            <div className="astrologer-grid">
              {astrologers.map((astro) => (
                <Link key={astro.id} to={`/astrologer/${astro.id}`} className="astro-card">
                  <div className="astro-img-wrap">
                    <img src={astro.profileImage ? (astro.profileImage.startsWith('http') ? astro.profileImage : `http://localhost:5000${astro.profileImage}`) : '/default-avatar.png'} alt={astro.name} />
                    <span className={`status-dot ${astro.chatStatus === 'Online' || astro.callStatus === 'Online' ? 'online' : 'offline'}`}></span>
                  </div>
                  <h5>{astro.name}</h5>
                  <p className="astro-skill">{astro.primarySkill || astro.skill || '-'}</p>
                  <p className="astro-exp">{(astro.experienceInYears || astro.experience) ? `${astro.experienceInYears || astro.experience} yrs exp` : ''}</p>
                  <div className="astro-rating">
                    <span className="star">&#9733;</span>
                    <span>{astro.rating || '4.5'}</span>
                  </div>
                  <p className="astro-price">&#8377;{astro.charge || 0}/min</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Puja Categories */}
      {pujaCategories.length > 0 && (
        <section className="section puja-section">
          <div className="container">
            <div className="section-header">
              <h3 className="section-title">Book a Puja</h3>
              <Link to="/puja" className="view-all">View All &rarr;</Link>
            </div>
            <div className="puja-grid">
              {pujaCategories.slice(0, 6).map((cat) => (
                <Link key={cat.id} to={`/puja/${cat.id}`} className="puja-card">
                  {cat.image && <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:5000${cat.image}`} alt={cat.title || cat.name} />}
                  <h5>{cat.title || cat.name}</h5>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommended Pujas by Astrologer */}
      {recommendedPujas.length > 0 && (
        <section className="section" style={{ background: '#fffbeb' }}>
          <div className="container">
            <div className="section-header">
              <h3 className="section-title">Recommended for You</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {recommendedPujas.map(p => (
                <div key={p.puja_suggested_id || p.id} style={{ background: '#fff', borderRadius: 12, padding: 16, border: '2px solid #f59e0b', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>{p.puja_title}</h4>
                    <span style={{ background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600 }}>Recommended</span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '4px 0' }}>by {p.astrologername || 'Astrologer'}</p>
                  <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: '1.1rem' }}>&#8377;{p.puja_price || 0}</p>
                  <Link to={`/puja/${p.id}`} style={{ display: 'block', textAlign: 'center', background: '#7c3aed', color: '#fff', padding: '10px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>Book Now</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products */}
      {products.length > 0 && (
        <section className="section products-section">
          <div className="container">
            <div className="section-header">
              <h3 className="section-title">Shop Genuine & Energised Products</h3>
              <Link to="/products" className="view-all">View All &rarr;</Link>
            </div>
            <div className="product-grid">
              {products.slice(0, 4).map((prod) => (
                <Link key={prod.id} to={`/product/${prod.id}`} className="product-card">
                  {prod.image && <img src={prod.image.startsWith('http') ? prod.image : `http://localhost:5000${prod.image}`} alt={prod.name} />}
                  <h5>{prod.name}</h5>
                  <p className="product-price">&#8377;{prod.price || prod.amount || 0}</p>
                  <button className="buy-btn">Buy Now</button>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blogs */}
      {blogs.length > 0 && (
        <section className="section blog-section">
          <div className="container">
            <div className="section-header">
              <h3 className="section-title">Latest Blogs</h3>
              <Link to="/blog" className="view-all">View All &rarr;</Link>
            </div>
            <div className="blog-grid">
              {blogs.slice(0, 3).map((blog) => (
                <Link key={blog.id} to={`/blog/${blog.id}`} className="blog-card">
                  {blog.image && <img src={blog.image.startsWith('http') ? blog.image : `http://localhost:5000${blog.image}`} alt={blog.title} />}
                  <div className="blog-info">
                    <h5>{blog.title}</h5>
                    <p>{(blog.description || '').replace(/<[^>]+>/g, '').slice(0, 100)}...</p>
                    <span className="read-more">Read More &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
