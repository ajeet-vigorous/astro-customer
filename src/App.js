import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import AstrologerList from './pages/AstrologerList';
import AstrologerDetail from './pages/AstrologerDetail';
import BlogList from './pages/BlogList';
import BlogDetail from './pages/BlogDetail';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Horoscope from './pages/Horoscope';
import DailyHoroscope from './pages/DailyHoroscope';
import Panchang from './pages/Panchang';
import Kundali from './pages/Kundali';
import KundaliMatching from './pages/KundaliMatching';
import PujaList from './pages/PujaList';
import PujaDetail from './pages/PujaDetail';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Orders from './pages/Orders';
import ChatHistory from './pages/ChatHistory';
import CallHistory from './pages/CallHistory';
import Following from './pages/Following';
import StaticPage from './pages/StaticPage';
import Contact from './pages/Contact';
import ChatRoom from './pages/ChatRoom';
import CallRoom from './pages/CallRoom';
import './App.css';

// ProfileGuard — logged in user must complete profile before accessing protected pages
const ProfileGuard = ({ children }) => {
  const { user } = useAuth();
  if (user && user.isProfileComplete != 1 && user.isProfileComplete !== '1') {
    return <Navigate to="/profile" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public pages — no profile guard */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/horoscope" element={<Horoscope />} />
            <Route path="/daily-horoscope/:signId/:sign" element={<DailyHoroscope />} />
            <Route path="/panchang" element={<Panchang />} />
            <Route path="/privacy-policy" element={<StaticPage />} />
            <Route path="/terms-condition" element={<StaticPage />} />
            <Route path="/refund-policy" element={<StaticPage />} />
            <Route path="/about-us" element={<StaticPage />} />
            <Route path="/contact" element={<Contact />} />

            {/* Profile page — always accessible (this is where user completes profile) */}
            <Route path="/profile" element={<Profile />} />

            {/* Protected pages — profile must be complete */}
            <Route path="/talk-to-astrologer" element={<ProfileGuard><AstrologerList /></ProfileGuard>} />
            <Route path="/chat-with-astrologer" element={<ProfileGuard><AstrologerList /></ProfileGuard>} />
            <Route path="/astrologer/:id" element={<ProfileGuard><AstrologerDetail /></ProfileGuard>} />
            <Route path="/products" element={<ProfileGuard><ProductList /></ProfileGuard>} />
            <Route path="/product/:id" element={<ProfileGuard><ProductDetail /></ProfileGuard>} />
            <Route path="/kundali" element={<ProfileGuard><Kundali /></ProfileGuard>} />
            <Route path="/kundali-matching" element={<ProfileGuard><KundaliMatching /></ProfileGuard>} />
            <Route path="/puja" element={<ProfileGuard><PujaList /></ProfileGuard>} />
            <Route path="/puja/:id" element={<ProfileGuard><PujaDetail /></ProfileGuard>} />
            <Route path="/wallet" element={<ProfileGuard><Wallet /></ProfileGuard>} />
            <Route path="/orders" element={<ProfileGuard><Orders /></ProfileGuard>} />
            <Route path="/chat-history" element={<ProfileGuard><ChatHistory /></ProfileGuard>} />
            <Route path="/call-history" element={<ProfileGuard><CallHistory /></ProfileGuard>} />
            <Route path="/chat-room/:chatId" element={<ProfileGuard><ChatRoom /></ProfileGuard>} />
            <Route path="/call-room/:callId" element={<ProfileGuard><CallRoom /></ProfileGuard>} />
            <Route path="/following" element={<ProfileGuard><Following /></ProfileGuard>} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
