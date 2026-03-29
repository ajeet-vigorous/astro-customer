import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/services';
import './ProductList.css';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [prodRes, catRes] = await Promise.allSettled([
          productApi.getProducts({}),
          productApi.getCategories(),
        ]);
        if (prodRes.status === 'fulfilled') {
          const d = prodRes.value.data?.data || prodRes.value.data;
          setProducts(Array.isArray(d) ? d : d?.recordList || []);
        }
        if (catRes.status === 'fulfilled') {
          const d = catRes.value.data?.data || catRes.value.data;
          setCategories(Array.isArray(d) ? d : d?.recordList || []);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredProducts = selectedCat
    ? products.filter(p => String(p.categoryId) === String(selectedCat))
    : products;

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="product-list-page">
      <div className="list-hero">
        <h2>AstroShop</h2>
        <p>Shop genuine &amp; energised astrological products</p>
      </div>
      <div className="container">
        {categories.length > 0 && (
          <div className="cat-filter">
            <button className={!selectedCat ? 'active' : ''} onClick={() => setSelectedCat('')}>All</button>
            {categories.map(cat => (
              <button key={cat.id} className={String(selectedCat) === String(cat.id) ? 'active' : ''} onClick={() => setSelectedCat(cat.id)}>
                {cat.name || cat.title}
              </button>
            ))}
          </div>
        )}
        {filteredProducts.length === 0 ? (
          <div className="no-data">No products found</div>
        ) : (
          <div className="prod-list-grid">
            {filteredProducts.map((prod) => (
              <Link key={prod.id} to={`/product/${prod.id}`} className="prod-list-card">
                {prod.image && <img src={prod.image.startsWith('http') ? prod.image : `http://localhost:5000${prod.image}`} alt={prod.name} />}
                <div className="prod-list-info">
                  <h4>{prod.name}</h4>
                  <p className="prod-desc">{(prod.description || '').replace(/<[^>]+>/g, '').slice(0, 80)}</p>
                  <div className="prod-list-bottom">
                    <span className="prod-list-price">&#8377;{prod.price || prod.amount || 0}</span>
                    <button className="prod-buy-btn">Buy Now</button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
