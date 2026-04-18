import React, { useState, useEffect } from 'react';
import { walletApi, couponApi } from '../api/services';
import { toast } from 'react-toastify';
import './Account.css';

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [rechargeAmounts, setRechargeAmounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [selectedCashback, setSelectedCashback] = useState(0);

  useEffect(() => {
    fetchWalletData();
    // Check Stripe redirect
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const paymentId = params.get('paymentId');
    if (sessionId && paymentId) {
      verifyStripeReturn(sessionId, paymentId);
      window.history.replaceState({}, '', '/wallet');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWalletData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [balanceRes, rechargeRes, txnRes, configRes, couponRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getRechargeAmount(),
        walletApi.getTransactions({ startIndex: 0, fetchRecord: 50 }),
        walletApi.getPaymentConfig(),
        couponApi.getAll({ startIndex: 0, fetchRecord: 100 }),
      ]);

      if (balanceRes.status === 'fulfilled') {
        const wallet = balanceRes.value.data?.recordList || balanceRes.value.data?.data;
        if (wallet) setBalance(parseFloat(wallet.amount) || 0);
      }
      if (rechargeRes.status === 'fulfilled') {
        const list = rechargeRes.value.data?.recordList || rechargeRes.value.data?.data || [];
        setRechargeAmounts(Array.isArray(list) ? list : []);
      }
      if (txnRes.status === 'fulfilled') {
        const txns = txnRes.value.data?.recordList || txnRes.value.data?.data || [];
        setTransactions(Array.isArray(txns) ? txns : []);
      }
      if (configRes.status === 'fulfilled') {
        const cfg = configRes.value.data;
        setPaymentConfig(cfg);
        if (cfg?.activeMode === 'Stripe') setSelectedGateway('stripe');
      }
      if (couponRes.status === 'fulfilled') {
        const list = couponRes.value.data?.recordList || [];
        setAvailableCoupons(Array.isArray(list) ? list : []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const isCouponUsable = (coupon, amount) => {
    if (!coupon || coupon.isActive === 0 || coupon.isActive === false) return false;
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) return false;
    if (coupon.validTo && new Date(coupon.validTo) < now) return false;
    if (amount && coupon.minAmount && parseFloat(amount) < parseFloat(coupon.minAmount)) return false;
    return true;
  };

  const applicableCoupons = availableCoupons.filter(c => isCouponUsable(c, selectedAmount));

  const handleSelectCoupon = async (coupon) => {
    setCouponCode(coupon.couponCode);
    setShowCouponList(false);
    if (!selectedAmount || selectedAmount <= 0) { toast.error('Select a recharge amount first'); return; }
    setCouponLoading(true);
    try {
      const res = await couponApi.apply({ couponCode: coupon.couponCode, amount: selectedAmount });
      if (res.data?.status === 200) {
        setAppliedCoupon(res.data.coupon);
        toast.success(`Coupon applied! ₹${res.data.coupon.discount} extra`);
      } else {
        setAppliedCoupon(null);
        toast.error(res.data?.message || 'Invalid coupon');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Coupon error'); setAppliedCoupon(null); }
    setCouponLoading(false);
  };

  const handleSelectAmount = (amount, cashback) => {
    setSelectedAmount(parseFloat(amount));
    setSelectedCashback(parseFloat(cashback || 0));
    setCustomAmount('');
    setAppliedCoupon(null);
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    setCustomAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setSelectedAmount(num);
      setSelectedCashback(0);
    } else {
      setSelectedAmount(null);
      setSelectedCashback(0);
    }
    setAppliedCoupon(null);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Enter a coupon code'); return; }
    if (!selectedAmount || selectedAmount <= 0) { toast.error('Select a recharge amount first'); return; }
    setCouponLoading(true);
    try {
      const res = await couponApi.apply({ couponCode: couponCode.trim(), amount: selectedAmount });
      if (res.data?.status === 200) {
        setAppliedCoupon(res.data.coupon);
        toast.success(`Coupon applied! ₹${res.data.coupon.discount} extra`);
      } else {
        setAppliedCoupon(null);
        toast.error(res.data?.message || 'Invalid coupon');
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Coupon error'); setAppliedCoupon(null); }
    setCouponLoading(false);
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(''); };

  const handleRecharge = async () => {
    const rechargeAmount = selectedAmount;
    if (!rechargeAmount || rechargeAmount <= 0) {
      toast.error('Please select or enter a valid amount'); return;
    }
    setRecharging(true);
    try {
      // Step 1: Create payment record. Backend computes cashback (slab + coupon) server-side.
      const res = await walletApi.addPayment({
        amount: parseFloat(rechargeAmount),
        couponCode: appliedCoupon ? appliedCoupon.couponCode : undefined,
        payment_for: 'wallet',
        paymentMode: selectedGateway
      });
      const d = res.data;
      if (d?.status !== 200 || !d?.paymentId) {
        toast.error(d?.error || d?.message || 'Payment initiation failed');
        setRecharging(false); return;
      }

      // Step 2: Open gateway
      if (selectedGateway === 'razorpay') {
        await openRazorpay(d.paymentId, d.amount);
      } else if (selectedGateway === 'stripe') {
        await openStripe(d.paymentId, d.amount);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
      setRecharging(false);
    }
  };

  // === RAZORPAY ===
  const openRazorpay = async (paymentId, amount) => {
    try {
      // Create Razorpay order from backend
      const orderRes = await walletApi.razorpayCreateOrder({ amount, paymentId });
      const od = orderRes.data;
      if (!od?.orderId || !od?.keyId) {
        toast.error('Razorpay not configured'); setRecharging(false); return;
      }

      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve; script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const options = {
        key: od.keyId,
        amount: od.amount,
        currency: od.currency || 'INR',
        name: 'AstroGuru',
        description: 'Wallet Recharge',
        order_id: od.orderId,
        handler: async (response) => {
          try {
            const verifyRes = await walletApi.razorpayVerify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId
            });
            if (verifyRes.data?.status === 200) {
              toast.success(verifyRes.data.message || 'Wallet recharged!');
              if (verifyRes.data.walletBalance !== undefined) setBalance(parseFloat(verifyRes.data.walletBalance));
              fetchWalletData(true);
            } else {
              toast.error('Payment verification failed');
            }
          } catch (err) { toast.error('Verification failed'); }
          setRecharging(false);
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: async () => {
            try { await walletApi.cancelPayment({ paymentId }); } catch(e) {}
            setRecharging(false);
          }
        }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error('Razorpay error: ' + (err.response?.data?.message || err.message));
      setRecharging(false);
    }
  };

  // === STRIPE ===
  const openStripe = async (paymentId, amount) => {
    try {
      const sessionRes = await walletApi.stripeCreateSession({
        amount, paymentId,
        successUrl: window.location.origin + '/wallet',
        cancelUrl: window.location.origin + '/wallet'
      });
      const sd = sessionRes.data;
      if (sd?.sessionUrl) {
        window.location.href = sd.sessionUrl; // Redirect to Stripe checkout
      } else {
        toast.error('Stripe not configured');
        setRecharging(false);
      }
    } catch (err) {
      toast.error('Stripe error: ' + (err.response?.data?.message || err.message));
      setRecharging(false);
    }
  };

  const verifyStripeReturn = async (sessionId, paymentId) => {
    try {
      const res = await walletApi.stripeVerify({ sessionId, paymentId });
      if (res.data?.status === 200) {
        toast.success(res.data.message || 'Wallet recharged!');
        fetchWalletData(true);
      } else {
        toast.error('Stripe payment verification failed');
      }
    } catch (err) { toast.error('Stripe verification failed'); }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="home-loading"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <div className="account-page">
      <div className="container">
        <h2 className="account-title">My Wallet</h2>

        <div className="wallet-balance-card">
          <p>Current Balance</p>
          <h2>&#8377;{balance.toFixed(2)}</h2>
        </div>

        {/* Gateway selector */}
        {paymentConfig && paymentConfig.razorpay?.enabled && paymentConfig.stripe?.enabled && (
          <div className="gateway-selector">
            <span>Pay via:</span>
            <button className={selectedGateway === 'razorpay' ? 'active' : ''} onClick={() => setSelectedGateway('razorpay')}>Razorpay</button>
            <button className={selectedGateway === 'stripe' ? 'active' : ''} onClick={() => setSelectedGateway('stripe')}>Stripe</button>
          </div>
        )}

        <h3 className="wallet-subtitle">Recharge Wallet</h3>
        <div className="recharge-grid">
          {rechargeAmounts.map((item, i) => {
            const isSelected = selectedAmount === parseFloat(item.amount) && !customAmount;
            return (
              <div
                key={item.id || i}
                className={`recharge-card ${isSelected ? 'selected' : ''}`}
                onClick={() => !recharging && handleSelectAmount(item.amount, item.cashback)}
                style={isSelected ? { borderColor: '#7c3aed', boxShadow: '0 0 0 2px #7c3aed', background: '#f5f0ff' } : {}}
              >
                <span className="recharge-amount">&#8377;{item.amount}</span>
                {parseFloat(item.cashback || 0) > 0 && <span className="recharge-extra">+&#8377;{item.cashback} cashback</span>}
              </div>
            );
          })}
        </div>

        <div className="custom-recharge">
          <h4>Or enter custom amount</h4>
          <div className="custom-input-row">
            <input type="number" value={customAmount} onChange={handleCustomAmountChange} placeholder="Enter amount" min="10" />
          </div>
        </div>

        {/* Coupon Section */}
        <div className="coupon-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>Have a coupon?</h4>
            {availableCoupons.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCouponList(!showCouponList)}
                style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
              >
                {showCouponList ? 'Hide offers' : `View offers (${applicableCoupons.length})`}
              </button>
            )}
          </div>

          {appliedCoupon ? (
            <div className="coupon-applied" style={{ marginTop: 10 }}>
              <span className="coupon-tag">&#10003; {appliedCoupon.couponCode} — &#8377;{appliedCoupon.discount} extra</span>
              <button className="coupon-remove" onClick={removeCoupon}>Remove</button>
            </div>
          ) : (
            <div className="coupon-input-row" style={{ marginTop: 10 }}>
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" />
              <button onClick={handleApplyCoupon} disabled={couponLoading || !selectedAmount}>{couponLoading ? '...' : 'Apply'}</button>
            </div>
          )}
          {!selectedAmount && <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 6 }}>Select a recharge amount to apply a coupon</p>}

          {showCouponList && (
            <div style={{ marginTop: 12, border: '1px solid #e0d4f5', borderRadius: 10, padding: 8, maxHeight: 280, overflowY: 'auto', background: '#fff' }}>
              {applicableCoupons.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: 14, margin: 0, fontSize: '0.85rem' }}>
                  {selectedAmount ? 'No coupons available for this amount' : 'Select a recharge amount to see offers'}
                </p>
              ) : (
                applicableCoupons.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => !couponLoading && handleSelectCoupon(c)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 12, marginBottom: 6, border: '1px dashed #c4b5fd', borderRadius: 8,
                      cursor: couponLoading ? 'wait' : 'pointer', background: '#faf7ff'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1a0533', fontSize: '0.95rem' }}>{c.couponCode}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 2 }}>
                        {c.name || c.description || 'Extra wallet credit'}
                      </div>
                      {c.minAmount && (
                        <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                          Min recharge &#8377;{parseFloat(c.minAmount).toFixed(0)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>+ &#8377;{parseFloat(c.maxAmount || 0).toFixed(0)}</div>
                      <button
                        type="button"
                        style={{ marginTop: 4, background: '#7c3aed', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Recharge Summary & Action */}
        {selectedAmount > 0 && (
          <div className="recharge-summary" style={{ marginTop: 20, padding: 16, border: '1px solid #e0d4f5', borderRadius: 12, background: '#faf7ff' }}>
            <h4 style={{ margin: '0 0 12px', color: '#1a0533' }}>Recharge Summary</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Pay Amount</span>
              <strong>&#8377;{selectedAmount.toFixed(2)}</strong>
            </div>
            {selectedCashback > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                <span>Cashback</span>
                <span>+ &#8377;{selectedCashback.toFixed(2)}</span>
              </div>
            )}
            {appliedCoupon && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                <span>Coupon ({appliedCoupon.couponCode})</span>
                <span>+ &#8377;{parseFloat(appliedCoupon.discount).toFixed(2)}</span>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px dashed #c4b5fd', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: '#1a0533' }}>
              <span>Wallet Credit</span>
              <span>&#8377;{(selectedAmount + selectedCashback + (appliedCoupon ? parseFloat(appliedCoupon.discount) : 0)).toFixed(2)}</span>
            </div>
            <button
              onClick={handleRecharge}
              disabled={recharging}
              style={{
                width: '100%', marginTop: 14, padding: '12px 20px', border: 'none', borderRadius: 8,
                background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '1rem',
                cursor: recharging ? 'not-allowed' : 'pointer', opacity: recharging ? 0.6 : 1
              }}
            >
              {recharging ? 'Processing...' : `Recharge \u20B9${selectedAmount.toFixed(0)}`}
            </button>
          </div>
        )}

        {transactions.length > 0 && (
          <>
            <h3 className="wallet-subtitle">Transaction History</h3>
            <div className="transaction-list">
              {transactions.map((txn, i) => (
                <div key={txn.id || i} className="transaction-item">
                  <div className="txn-left">
                    <span className={`txn-type ${String(txn.isCredit) === '1' ? 'credit' : 'debit'}`}>
                      {String(txn.isCredit) === '1' ? '+' : '-'}&#8377;{parseFloat(txn.amount).toFixed(2)}
                    </span>
                    <span className="txn-remark">{txn.remark || txn.transactionType || '-'}</span>
                  </div>
                  <div className="txn-right">
                    <span className="txn-date">{formatDate(txn.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wallet;
