import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi, walletApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './ProductList.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: '', phoneNumber: '', flatNo: '', locality: '', city: '', state: '', pincode: '' });
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await productApi.getProductById({ id });
        const d = res.data?.recordList || res.data?.data || res.data;
        setProduct(Array.isArray(d) ? d[0] : d);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleBuy = async () => {
    if (!user) { toast.error('Please login first'); navigate('/login'); return; }
    try {
      const res = await productApi.getAddresses();
      setAddresses(res.data?.recordList || []);
    } catch(e) {}
    setShowCheckout(true);
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await productApi.addAddress(addressForm);
      toast.success('Address added');
      const res = await productApi.getAddresses();
      setAddresses(res.data?.recordList || []);
      setShowAddressForm(false);
    } catch(e) { toast.error('Failed to add address'); }
  };

  const handlePlaceOrder = async () => {
    const price = parseFloat(product?.amount || product?.price || 0);
    setOrdering(true);
    try {
      const balRes = await walletApi.getBalance();
      const balance = parseFloat(balRes.data?.recordList?.amount || 0);
      if (balance < price) { toast.error(`Insufficient balance. Need ₹${price}, have ₹${balance.toFixed(2)}`); setOrdering(false); return; }
      const res = await productApi.placeOrder({ productId: parseInt(id), addressId: selectedAddress });
      if (res.data?.status === 200) { toast.success('Order placed!'); navigate('/orders'); }
      else toast.error(res.data?.message || 'Failed');
    } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
    setOrdering(false);
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;
  if (!product) return <div className="no-data">Product not found</div>;

  const imgSrc = (product.productImage || product.image) ? ((product.productImage || product.image).startsWith('http') ? (product.productImage || product.image) : `http://localhost:5000/${product.productImage || product.image}`) : null;
  const price = parseFloat(product.amount || product.price || 0);

  return (
    <div className="product-detail-page">
      <div className="container">
        <div className="prod-detail-nav">
          <Link to="/products">&larr; Back to Shop</Link>
        </div>
        <div className="prod-detail-layout">
          <div className="prod-detail-img">
            {imgSrc && <img src={imgSrc} alt={product.name} />}
          </div>
          <div className="prod-detail-info">
            <h1>{product.name}</h1>
            <p className="prod-detail-price">&#8377;{price.toFixed(2)}</p>
            {product.features && <div className="prod-detail-desc" dangerouslySetInnerHTML={{ __html: product.features }} />}
            {product.description && <div className="prod-detail-desc" dangerouslySetInnerHTML={{ __html: product.description }} />}
            <button className="prod-detail-buy" onClick={handleBuy}>Buy Now - &#8377;{price.toFixed(2)}</button>
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="intake-overlay" onClick={() => setShowCheckout(false)}>
          <div className="intake-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="intake-close" onClick={() => setShowCheckout(false)}>&times;</button>
            <h3>Checkout</h3>
            <div style={{ background: '#f9f5ff', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span>{product.name}</span>
              <strong style={{ color: '#7c3aed' }}>&#8377;{price.toFixed(2)}</strong>
            </div>

            <h4 style={{ margin: '0 0 10px' }}>Delivery Address</h4>
            {addresses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {addresses.map(a => (
                  <label key={a.id} style={{ display: 'flex', gap: 10, padding: 12, border: selectedAddress === a.id ? '2px solid #7c3aed' : '1px solid #e0d4f5', borderRadius: 10, cursor: 'pointer' }} onClick={() => setSelectedAddress(a.id)}>
                    <input type="radio" name="address" checked={selectedAddress === a.id} onChange={() => setSelectedAddress(a.id)} style={{ accentColor: '#7c3aed' }} />
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>{a.name}</strong> ({a.phoneNumber})<br />
                      {a.flatNo && a.flatNo + ', '}{a.locality && a.locality + ', '}{a.city}{a.state && ', ' + a.state}{a.pincode && ' - ' + a.pincode}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button onClick={() => setShowAddressForm(!showAddressForm)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
              {showAddressForm ? 'Cancel' : '+ Add New Address'}
            </button>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                <input placeholder="Full Name *" value={addressForm.name} onChange={e => setAddressForm({...addressForm, name: e.target.value})} required style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="Phone *" value={addressForm.phoneNumber} onChange={e => setAddressForm({...addressForm, phoneNumber: e.target.value})} required style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="Flat/House No" value={addressForm.flatNo} onChange={e => setAddressForm({...addressForm, flatNo: e.target.value})} style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="Locality" value={addressForm.locality} onChange={e => setAddressForm({...addressForm, locality: e.target.value})} style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="City *" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="State" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <input placeholder="Pincode *" value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} required style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85rem' }} />
                <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: 10, borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Save Address</button>
              </form>
            )}

            <button onClick={handlePlaceOrder} disabled={ordering} style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: 14, borderRadius: 10, fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: 8, opacity: ordering ? 0.5 : 1 }}>
              {ordering ? 'Placing Order...' : `Place Order - ₹${price.toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
