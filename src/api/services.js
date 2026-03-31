import API from './axios';

// Home page data
export const homeApi = {
  getBanners: () => API.post('/customer/getBanner'),
  getAstrologers: (params) => API.post('/astro/getAstrologer', params),
  getHoroscopeSigns: () => API.post('/customer/getHororscopeSign'),
  getBlogs: () => API.post('/astro/getAppBlog'),
  getProducts: () => API.post('/customer/getAstromallProduct'),
  getSystemFlags: () => API.post('/customer/getSystemFlag'),
  getStories: () => API.post('/astro/getStory'),
  getLiveAstrologers: () => API.post('/astro/liveAstrologer/get'),
  getPujaCategories: () => API.post('/customer/getPujaCategory'),
};

// Auth
export const authApi = {
  login: (data) => API.post('/customer/loginAppUser', data),
  sendOtp: (data) => API.post('/customer/checkContactNoExistForUser', data),
  getProfile: (data) => API.post('/customer/getProfile', data),
  updateProfile: (data) => API.post('/customer/user/updateProfile', data),
  logout: () => API.post('/customer/logout'),
};

// Astrologer
export const astrologerApi = {
  getList: (params) => API.post('/astro/getAstrologer', params),
  getById: (params) => API.post('/astro/getAstrologerById', params),
  search: (params) => API.post('/astro/searchAstro', params),
  getReviews: (params) => API.post('/customer/getAstrologerUserReview', params),
  addReview: (data) => API.post('/customer/userReview/add', data),
  follow: (data) => API.post('/customer/follower/add', data),
  getFollowing: (data) => API.post('/customer/getFollower', data),
};

// Chat
export const chatApi = {
  addRequest: (data) => API.post('/customer/chatRequest/add', data),
  getIntakeForm: (data) => API.post('/customer/chatRequest/getIntakeForm', data),
  addIntakeForm: (data) => API.post('/customer/chatRequest/addIntakeForm', data),
  checkSession: (data) => API.post('/customer/checkChatSessionAvailable', data),
  checkFreeSession: () => API.post('/customer/checkFreeSessionAvailable'),
  sendMessage: (data) => API.post('/customer/chatRequest/sendMessage', data),
  getMessages: (data) => API.post('/customer/chatRequest/getMessages', data),
  getChatDetail: (data) => API.post('/customer/chatRequest/getChatDetail', data),
  endChat: (data) => API.post('/customer/chatRequest/endChat', data),
  getActiveSession: () => API.post('/customer/getActiveSession'),
};

// Call
export const callApi = {
  addRequest: (data) => API.post('/customer/callRequest/add', data),
  checkSession: (data) => API.post('/customer/checkCallSessionAvailable', data),
  getZegoToken: (data) => API.post('/customer/zegocloud/token', data),
  endCall: (data) => API.post('/customer/callRequest/end', data),
  cancelCall: (data) => API.post('/customer/callRequest/cancel', data),
  getCallById: (data) => API.post('/customer/getCallById', data),
  getCallHistory: (data) => API.post('/customer/getCallHistory', data),
};

// Wallet & Payment
export const walletApi = {
  addPayment: (data) => API.post('/customer/addpayment', data),
  paymentSuccess: (data) => API.post('/customer/paymentSuccess', data),
  getBalance: () => API.post('/customer/getWalletBalance'),
  getTransactions: (params) => API.post('/customer/getWalletTransactions', params),
  getRechargeAmount: () => API.post('/customer/getRechargeAmount'),
  getPaymentConfig: () => API.post('/customer/getPaymentConfig'),
  razorpayCreateOrder: (data) => API.post('/customer/razorpay/createOrder', data),
  razorpayVerify: (data) => API.post('/customer/razorpay/verify', data),
  stripeCreateSession: (data) => API.post('/customer/stripe/createSession', data),
  stripeVerify: (data) => API.post('/customer/stripe/verify', data),
  cancelPayment: (data) => API.post('/customer/cancelPayment', data),
};

// Referral
export const referralApi = {
  getInfo: () => API.post('/customer/getReferralInfo'),
  applyCode: (data) => API.post('/customer/applyReferralCode', data),
};

// Report
export const reportApi = {
  addReport: (data) => API.post('/customer/userReport/add', data),
};

// Gift
export const giftApi = {
  getAll: () => API.post('/customer/activeGift'),
  send: (data) => API.post('/customer/sendGift', data),
};

// AI Chat
export const aiChatApi = {
  getAstrologers: () => API.post('/customer/getAiAstrologers'),
  getById: (data) => API.post('/customer/getAiAstrologerById', data),
  sendMessage: (data) => API.post('/customer/sendAiMessage', data),
  getHistory: (data) => API.post('/customer/getAiChatHistory', data),
};

// Horoscope
export const horoscopeApi = {
  getSigns: () => API.post('/customer/getHororscopeSign'),
  getDaily: (params) => API.post('/customer/getDailyHoroscope', params),
  getHoroscope: (params) => API.post('/customer/getHoroscope', params),
  getEnabledLanguages: () => API.post('/customer/getEnabledLanguages'),
};

// Kundali
export const kundaliApi = {
  add: (data) => API.post('/customer/kundali/add', data),
  addNew: (data) => API.post('/customer/kundali/addnew', data),
  getAll: () => API.post('/customer/getkundali'),
  getById: (params) => API.post('/customer/kundali/get/' + params.id),
  getPrice: () => API.post('/customer/pdf/price'),
  matching: (data) => API.post('/customer/KundaliMatching/add', data),
  matchReport: (data) => API.post('/customer/KundaliMatching/report', data),
  getBasicReport: (data) => API.post('/customer/kundali/basic', data),
  getChartReport: (data) => API.post('/customer/kundali/chart', data),
  getAstakvarga: (data) => API.post('/customer/kundali/astakvarga', data),
  getAscendant: (data) => API.post('/customer/kundali/ascendant-report', data),
  getPlanetReport: (data) => API.post('/customer/kundali/planet-report', data),
  getDasha: (data) => API.post('/customer/kundali/dasha', data),
  getDosha: (data) => API.post('/customer/kundali/dosha', data),
  getFullReport: (data) => API.post('/customer/kundali/getKundaliReport', data),
  getPanchang: (data) => API.post('/customer/get/panchang', data),
  geocode: (data) => API.post('/customer/geocode', data),
};

// Blog
export const blogApi = {
  getAll: () => API.post('/astro/getAppBlog'),
  getById: (params) => API.post('/astro/getBlogById', params),
};

// Products (AstroShop)
export const productApi = {
  getCategories: () => API.post('/customer/getproductCategory'),
  getProducts: (params) => API.post('/customer/getAstromallProduct', params),
  getProductById: (params) => API.post('/customer/getAstromallProductById', params),
  placeOrder: (data) => API.post('/customer/placeProductOrder', data),
  getAddresses: () => API.post('/customer/getOrderAddress'),
  addAddress: (data) => API.post('/customer/addOrderAddress', data),
};

// Puja
export const pujaApi = {
  getCategories: () => API.post('/customer/getPujaCategory'),
  getSubCategories: (params) => API.post('/customer/getPujaSubCategory', params),
  getList: (params) => API.post('/customer/getPujaList', params),
  getDetails: (params) => API.post('/customer/getPujaDetails', params),
  getFaq: (params) => API.post('/customer/getPujafaq', params),
  placeOrder: (data) => API.post('/customer/placedPujaOrder', data),
  getRecommended: () => API.post('/astro/suggestedAstrologerPuja'),
  deleteRecommended: (data) => API.post('/astro/deleteSuggestedPuja', data),
};

// Coupon
export const couponApi = {
  getAll: (params) => API.post('/customer/getCouponcode', params),
  apply: (data) => API.post('/customer/applyCoupon', data),
};

// User Account
export const accountApi = {
  getOrders: () => API.post('/customer/getMyOrders'),
  getChatHistory: (params) => API.post('/customer/getChatHistory', params),
  getCallHistory: (params) => API.post('/customer/getCallHistory', params),
  getWallet: () => API.post('/customer/getRechargeAmount'),
  getTickets: () => API.post('/customer/getTicket'),
  addTicket: (data) => API.post('/customer/ticket/add', data),
};

// Pages
export const pageApi = {
  getPage: (slug) => API.post('/pages/by-slug', { slug }),
  getFaq: () => API.post('/web-home-faq'),
  submitContact: (data) => API.post('/pages/contact', data),
};
