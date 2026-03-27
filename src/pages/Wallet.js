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
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [balanceRes, rechargeRes, txnRes, configRes] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getRechargeAmount(),
        walletApi.getTransactions({ startIndex: 0, fetchRecord: 50 }),
        walletApi.getPaymentConfig(),
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
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleApplyCoupon = async (amount) => {
    const rechargeAmount = amount || customAmount;
    if (!couponCode.trim()) { toast.error('Enter a coupon code'); return; }
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) { toast.error('Select a recharge amount first'); return; }
    setCouponLoading(true);
    try {
      const res = await couponApi.apply({ couponCode: couponCode.trim(), amount: parseFloat(rechargeAmount) });
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

  const handleRecharge = async (amount, cashback) => {
    const rechargeAmount = amount || customAmount;
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast.error('Please enter a valid amount'); return;
    }
    const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
    const totalCashback = (cashback || 0) + couponDiscount;
    setRecharging(true);
    try {
      // Step 1: Create payment record
      const res = await walletApi.addPayment({
        amount: parseFloat(rechargeAmount), cashback_amount: totalCashback,
        payment_for: 'wallet', paymentMode: selectedGateway
      });
      const d = res.data;
      if (d?.status !== 200 || !d?.paymentId) {
        toast.error(d?.message || 'Payment initiation failed');
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
              fetchWalletData();
            } else {
              toast.error('Payment verification failed');
            }
          } catch (err) { toast.error('Verification failed'); }
          setRecharging(false);
        },
        theme: { color: '#7c3aed' },
        modal: { ondismiss: () => setRecharging(false) }
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
        fetchWalletData();
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
          {rechargeAmounts.map((item, i) => (
            <div key={item.id || i} className="recharge-card" onClick={() => !recharging && handleRecharge(item.amount, item.cashback)}>
              <span className="recharge-amount">&#8377;{item.amount}</span>
              {parseFloat(item.cashback || 0) > 0 && <span className="recharge-extra">+&#8377;{item.cashback} cashback</span>}
            </div>
          ))}
        </div>

        <div className="custom-recharge">
          <h4>Or enter custom amount</h4>
          <div className="custom-input-row">
            <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="Enter amount" min="10" />
            <button onClick={() => handleRecharge()} disabled={!customAmount || recharging}>{recharging ? 'Processing...' : 'Recharge'}</button>
          </div>
        </div>

        {/* Coupon Section */}
        <div className="coupon-section">
          <h4>Have a coupon?</h4>
          {appliedCoupon ? (
            <div className="coupon-applied">
              <span className="coupon-tag">&#10003; {appliedCoupon.couponCode} — ₹{appliedCoupon.discount} extra</span>
              <button className="coupon-remove" onClick={removeCoupon}>Remove</button>
            </div>
          ) : (
            <div className="coupon-input-row">
              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" />
              <button onClick={() => handleApplyCoupon()} disabled={couponLoading}>{couponLoading ? '...' : 'Apply'}</button>
            </div>
          )}
        </div>

        {transactions.length > 0 && (
          <>
            <h3 className="wallet-subtitle">Transaction History</h3>
            <div className="transaction-list">
              {transactions.map((txn, i) => (
                <div key={txn.id || i} className="transaction-item">
                  <div className="txn-left">
                    <span className={`txn-type ${txn.isCredit == 1 ? 'credit' : 'debit'}`}>
                      {txn.isCredit == 1 ? '+' : '-'}&#8377;{parseFloat(txn.amount).toFixed(2)}
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
