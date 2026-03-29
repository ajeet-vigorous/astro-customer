import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productApi } from '../api/services';
import { toast } from 'react-toastify';
import './ProductList.css';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await productApi.getProductById({ productId: id });
        const d = res.data?.data || res.data;
        setProduct(Array.isArray(d) ? d[0] : d);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!product) return <div className="no-data">Product not found</div>;

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="prod-detail-nav">
          <Link to="/products">&larr; Back to Shop</Link>
        </div>
        <div className="prod-detail-layout">
          <div className="prod-detail-img">
            {product.image && <img src={product.image.startsWith('http') ? product.image : `https://astrology-i7c9.onrender.com${product.image}`} alt={product.name} />}
          </div>
          <div className="prod-detail-info">
            <h1>{product.name}</h1>
            <p className="prod-detail-price">&#8377;{product.price || product.amount || 0}</p>
            {product.originalPrice && <p className="prod-original-price">&#8377;{product.originalPrice}</p>}
            <div className="prod-detail-desc" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
            <button className="prod-detail-buy" onClick={() => toast.info('Add to cart coming soon')}>Buy Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
