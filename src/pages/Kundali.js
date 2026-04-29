import React, { useState, useRef } from 'react';
import { kundaliApi, astroApi } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Kundali.css';

// 13 main tabs — one per phase. Phase 1 (Basic) is fully implemented;
// Lagna & Planets reuse existing functionality; rest show "Coming soon".
const TABS = [
  { key: 'basic',       label: '🏠 Basic',         phase: 1, ready: true  },
  { key: 'lagna',       label: '📊 Lagna',         phase: 2, ready: true  },
  { key: 'transit',     label: '🌌 Transit',       phase: 3, ready: true  },
  { key: 'dasha',       label: '⏰ Dasha',         phase: 4, ready: true  },
  { key: 'yogini',      label: '🌙 Yogini Dasha',  phase: 5, ready: true  },
  { key: 'ashtakvarga', label: '🎯 Ashtakvarga',   phase: 6, ready: true  },
  { key: 'planets',     label: '🪐 Planets',       phase: 7, ready: true  },
  { key: 'divisional',  label: '📐 Divisional',    phase: 8, ready: true  },
  { key: 'kp',          label: '🔮 KP System',     phase: 9, ready: true  },
  { key: 'sadesati',    label: '🪨 Sade Sati',     phase: 10, ready: true  },
  { key: 'shadbala',    label: '⚖️ Shada Bala',    phase: 11, ready: true  },
  { key: 'bhavbala',    label: '🏛️ Bhav Bala',     phase: 12, ready: true  },
  { key: 'manglik',     label: '🔥 Manglik',       phase: 13, ready: true  },
];

// Vimshottari Dasha system: cyclic order + planet years (sum = 120 years)
const VIM_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const VIM_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

// Yogini Dasha system: 8 yoginis, 36-year cycle. Each yogini is associated with a planet.
const YOG_ORDER = ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata'];
const YOG_YEARS = { Mangala: 1, Pingala: 2, Dhanya: 3, Bhramari: 4, Bhadrika: 5, Ulka: 6, Siddha: 7, Sankata: 8 };

// Planet (and yogini) → glyph for visual scan. Yoginis use their associated planet's glyph.
const PLANET_GLYPH = {
  // Vimshottari (planets)
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
  // Yogini lords mapped to associated planet glyphs
  Mangala: '☉', Pingala: '☽', Dhanya: '♃', Bhramari: '♂',
  Bhadrika: '☿', Ulka: '♄', Siddha: '♀', Sankata: '☊',
};

// Zodiac → ruling planet (sign lord)
const SIGN_LORDS = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

// Nakshatra → ruling planet (nakshatra lord) — Vimshottari sequence
const NAKSHATRA_LORDS = {
  Ashwini: 'Ketu', Bharani: 'Venus', Krittika: 'Sun', Rohini: 'Moon',
  Mrigashirsha: 'Mars', Mrigashira: 'Mars', Ardra: 'Rahu', Punarvasu: 'Jupiter',
  Pushya: 'Saturn', Ashlesha: 'Mercury', Aslesha: 'Mercury',
  Magha: 'Ketu', 'Purva Phalguni': 'Venus', PurvaPhalguni: 'Venus',
  'Uttara Phalguni': 'Sun', UttaraPhalguni: 'Sun', Hasta: 'Moon',
  Chitra: 'Mars', Swati: 'Rahu', Vishakha: 'Jupiter',
  Anuradha: 'Saturn', Jyeshtha: 'Mercury', Jyestha: 'Mercury',
  Mula: 'Ketu', Moola: 'Ketu',
  'Purva Ashadha': 'Venus', PurvaAshadha: 'Venus',
  'Uttara Ashadha': 'Sun', UttaraAshadha: 'Sun',
  Shravana: 'Moon', Sravana: 'Moon',
  Dhanishta: 'Mars', Dhanistha: 'Mars',
  Shatabhisha: 'Rahu', Shatabhisa: 'Rahu',
  'Purva Bhadrapada': 'Jupiter', PurvaBhadrapada: 'Jupiter', PurvaBhadra: 'Jupiter', UttaraBhadra: 'Saturn',
  'Uttara Bhadrapada': 'Saturn', UttaraBhadrapada: 'Saturn',
  Revati: 'Mercury',
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ka', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'be', label: 'বাংলা (Bengali)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'sp', label: 'Español (Spanish)' },
];

const Kundali = () => {
  // ---------------- Form / location ----------------
  const [form, setForm] = useState({ name: '', gender: 'Male', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [placeLoading, setPlaceLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  // ---------------- Created kundali record ----------------
  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [loading, setLoading] = useState(false);

  // ---------------- Phase 1: Basic tab ----------------
  const [birthPanchang, setBirthPanchang] = useState(null);
  const [avakhada, setAvakhada] = useState(null);
  const [basicTabLoading, setBasicTabLoading] = useState(false);

  // ---------------- Lagna tab (Phase 2 — D1 + D9) ----------------
  const [lagnaD1Svg, setLagnaD1Svg] = useState(null);
  const [lagnaD9Svg, setLagnaD9Svg] = useState(null);
  const [lagnaLoading, setLagnaLoading] = useState(false);
  const [chartStyle, setChartStyle] = useState('north');
  const [showDegrees, setShowDegrees] = useState(true);

  // ---------------- Transit tab (Phase 3) ----------------
  const todayIso = new Date().toISOString().split('T')[0];
  const [transitSvg, setTransitSvg] = useState(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitDate, setTransitDate] = useState(todayIso);
  const [transitStyle, setTransitStyle] = useState('north');
  const [transitFetchedDate, setTransitFetchedDate] = useState(null);
  const [transitPlanets, setTransitPlanets] = useState(null);
  const [showTransitDegrees, setShowTransitDegrees] = useState(true);

  // ---------------- Dasha tab (Phase 4) ----------------
  const [mahadashaList, setMahadashaList] = useState(null);
  const [mahadashaLoading, setMahadashaLoading] = useState(false);
  // expanded keys: 'M2' (mahadasha #2), 'M2.A4' (antardasha #4 in mahadasha #2),
  //                'M2.A4.P3' (pratyantar #3 inside that antardasha). Sookshma is leaf.
  const [dashaExpanded, setDashaExpanded] = useState({});

  // ---------------- Yogini Dasha tab (Phase 5) ----------------
  const [yoginiList, setYoginiList] = useState(null);
  const [yoginiLoading, setYoginiLoading] = useState(false);
  const [yoginiExpanded, setYoginiExpanded] = useState({});

  // ---------------- Ashtakvarga tab (Phase 6) ----------------
  const [ashtakvarga, setAshtakvarga] = useState(null); // { sav: {...}, binnas: { Sun: {...}, ... } }
  const [ashtakvargaLoading, setAshtakvargaLoading] = useState(false);
  const [ashtakvargaStyle, setAshtakvargaStyle] = useState('north');
  const [ashtakvargaView, setAshtakvargaView] = useState('Sav'); // 'Sav' | 'Sun' | 'Moon' | ...

  // ---------------- KP System tab (Phase 9) ----------------
  const [kpData, setKpData] = useState(null); // { kpPlanets, kpCusps, rulingPlanets, chalitChart }
  const [kpLoading, setKpLoading] = useState(false);
  const [kpStyle, setKpStyle] = useState('north');

  // ---------------- Sade Sati tab (Phase 10) ----------------
  const [sadeSati, setSadeSati] = useState(null);
  const [sadeSatiTable, setSadeSatiTable] = useState(null);
  const [sadeSatiLoading, setSadeSatiLoading] = useState(false);

  // ---------------- Shadbala tab (Phase 11) ----------------
  const [shadbala, setShadbala] = useState(null);
  const [shadbalaLoading, setShadbalaLoading] = useState(false);

  // ---------------- Bhav Bala tab (Phase 12) ----------------
  const [bhavBala, setBhavBala] = useState(null);
  const [bhavBalaLoading, setBhavBalaLoading] = useState(false);

  // ---------------- Manglik tab (Phase 13 — final) ----------------
  const [manglik, setManglik] = useState(null);
  const [manglikLoading, setManglikLoading] = useState(false);

  // ---------------- Divisional tab (Phase 8 — single chart with dropdown) ----------------
  const [chartSvg, setChartSvg] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartDiv, setChartDiv] = useState('D1');

  // ---------------- Planets tab (basic report) ----------------
  const [basicReport, setBasicReport] = useState(null);
  const [basicLoading, setBasicLoading] = useState(false);

  // ---------------- Common ----------------
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('basic');

  // Phase 7 — Planets sub-view (sign or nakshatra)
  const [planetsSubView, setPlanetsSubView] = useState('sign');

  // =============================================================
  // Helpers — chart extraction & rendering
  // =============================================================
  const extractChart = (cd) => {
    if (cd === null || cd === undefined) return null;
    if (typeof cd === 'string') return cd;
    if (typeof cd === 'object') {
      const fields = ['svg', 'svgString', 'svg_string', 'base64Image', 'base64', 'b64',
                      'image_url', 'imageUrl', 'imageURL', 'chart_url', 'chartUrl',
                      'chart_image', 'chartImage', 'chart', 'image', 'url', 'src',
                      'data', 'response'];
      for (const f of fields) if (cd[f]) return cd[f];
      const keys = Object.keys(cd);
      if (keys.length === 1 && typeof cd[keys[0]] === 'string') return cd[keys[0]];
    }
    return null;
  };

  // =============================================================
  // Fetch helpers
  // =============================================================
  const fetchChart = async (recordId, div, style, langCode) => {
    if (!recordId) return;
    setChartLoading(true);
    try {
      const res = await kundaliApi.getChartReport({ kundaliId: recordId, div, style, lang: langCode || lang });
      const cd = res.data?.data || res.data;
      const raw = cd?.chartDetails;
      const extracted = extractChart(raw);
      setChartSvg(extracted || raw);
    } catch (err) { setChartSvg(null); }
    setChartLoading(false);
  };

  // Phase 2 — fetch one chart raw SVG (used by fetchLagnaCharts)
  const fetchOneChart = async (recordId, div, style, langCode) => {
    try {
      const res = await kundaliApi.getChartReport({ kundaliId: recordId, div, style, lang: langCode || lang });
      const cd = res.data?.data || res.data;
      return extractChart(cd?.chartDetails) || cd?.chartDetails;
    } catch (err) { return null; }
  };

  // Phase 2 — fetch both Lagna (D1) and Navamsa (D9) in parallel
  const fetchLagnaCharts = async (recordId, style, langCode) => {
    if (!recordId) return;
    setLagnaLoading(true);
    const [d1, d9] = await Promise.all([
      fetchOneChart(recordId, 'D1', style, langCode),
      fetchOneChart(recordId, 'D9', style, langCode),
    ]);
    setLagnaD1Svg(d1);
    setLagnaD9Svg(d9);
    setLagnaLoading(false);
  };

  // Phase 2 — style toggle changes both charts at once
  const onChangeChartStyle = (newStyle) => {
    setChartStyle(newStyle);
    if (kundaliRecord?.id) fetchLagnaCharts(kundaliRecord.id, newStyle, lang);
  };

  // Phase 3 — fetch transit chart + transit planet positions in parallel
  const fetchTransitChart = async (recordId, dateIso, style, langCode) => {
    if (!recordId) return;
    setTransitLoading(true);
    const dateToUse = dateIso || todayIso;
    const styleToUse = style || transitStyle;
    const langToUse = langCode || lang;
    const [chartRes, planetsRes] = await Promise.all([
      kundaliApi.getTransitChart({ kundaliId: recordId, transit_date: dateToUse, style: styleToUse, lang: langToUse }).catch(() => null),
      kundaliApi.getTransitPlanets({ kundaliId: recordId, transit_date: dateToUse, lang: langToUse }).catch(() => null),
    ]);
    if (chartRes) {
      const cd = chartRes.data?.data || chartRes.data;
      const raw = cd?.chartDetails;
      setTransitSvg(extractChart(raw) || raw);
      setTransitFetchedDate(cd?.transit_date || dateToUse);
    } else { setTransitSvg(null); }
    if (planetsRes) {
      const pd = planetsRes.data?.data || planetsRes.data;
      setTransitPlanets(pd?.planetDetails || pd);
    } else { setTransitPlanets(null); }
    setTransitLoading(false);
  };

  const onChangeTransitDate = (newDateIso) => {
    setTransitDate(newDateIso);
    if (kundaliRecord?.id) fetchTransitChart(kundaliRecord.id, newDateIso, transitStyle, lang);
  };

  const onChangeTransitStyle = (newStyle) => {
    setTransitStyle(newStyle);
    if (kundaliRecord?.id) fetchTransitChart(kundaliRecord.id, transitDate, newStyle, lang);
  };

  // Phase 4 — fetch mahadasha list (full response with antar/paryantar/sookshma/prana for current branch)
  const fetchMahadasha = async (recordId) => {
    if (!recordId) return;
    setMahadashaLoading(true);
    try {
      const res = await kundaliApi.getMahadashaList({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[Mahadasha] endpoint =>', d?.endpoint);
      // Store FULL response object (preserves antardasha, paryantardasha, Shookshamadasha, Pranadasha arrays)
      setMahadashaList(d?.mahadasha || d);
    } catch (err) { setMahadashaList(null); }
    setMahadashaLoading(false);
  };

  const toggleDashaExpand = (key) => {
    setDashaExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Generic proportional-cycle sub-period calculator. Used for both Vimshottari and Yogini.
  // Sub[i] starts from parent's lord, cycles through ORDER. Duration = parent × (sub_years / total).
  const computeProportionalSubs = (parentLord, parentStartIso, parentEndIso, ORDER, YEARS, total) => {
    if (!parentLord || !parentStartIso || !parentEndIso) return [];
    const startTs = new Date(parentStartIso).getTime();
    const endTs = new Date(parentEndIso).getTime();
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return [];
    const idx = ORDER.indexOf(parentLord);
    if (idx === -1) return [];
    const totalMs = endTs - startTs;
    const subs = [];
    let cursor = startTs;
    for (let i = 0; i < ORDER.length; i++) {
      const subLord = ORDER[(idx + i) % ORDER.length];
      const portion = YEARS[subLord] / total;
      const subDuration = totalMs * portion;
      const subEndTs = cursor + subDuration;
      subs.push({
        lord: subLord,
        start: new Date(cursor).toISOString().split('T')[0],
        end: new Date(subEndTs).toISOString().split('T')[0],
        startTs: cursor, endTs: subEndTs,
      });
      cursor = subEndTs;
    }
    return subs;
  };

  const computeSubDashas = (parentLord, parentStartIso, parentEndIso) =>
    computeProportionalSubs(parentLord, parentStartIso, parentEndIso, VIM_ORDER, VIM_YEARS, 120);

  const computeYoginiSubs = (parentLord, parentStartIso, parentEndIso) =>
    computeProportionalSubs(parentLord, parentStartIso, parentEndIso, YOG_ORDER, YOG_YEARS, 36);

  // Phase 5 — fetch yogini dasha list
  const fetchYoginiDasha = async (recordId) => {
    if (!recordId) return;
    setYoginiLoading(true);
    try {
      const res = await kundaliApi.getYoginiDashaList({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      setYoginiList(d?.yogini || d);
    } catch (err) { setYoginiList(null); }
    setYoginiLoading(false);
  };

  const toggleYoginiExpand = (key) => {
    setYoginiExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Phase 6 — fetch full ashtakvarga (sav + 8 binnas with charts) in parallel
  const fetchAshtakvarga = async (recordId, style) => {
    if (!recordId) return;
    setAshtakvargaLoading(true);
    try {
      const res = await kundaliApi.getAshtakvargaFull({ kundaliId: recordId, style: style || ashtakvargaStyle });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[Ashtakvarga] full response =>', d);
      // eslint-disable-next-line no-console
      console.log('[Ashtakvarga] sav.data =>', d?.sav?.data);
      // eslint-disable-next-line no-console
      console.log('[Ashtakvarga] sav.chart (first 200) =>', typeof d?.sav?.chart === 'string' ? d.sav.chart.substring(0, 200) : d?.sav?.chart);
      // eslint-disable-next-line no-console
      console.log('[Ashtakvarga] binnas.Sun =>', d?.binnas?.Sun);
      setAshtakvarga({ sav: d?.sav || null, binnas: d?.binnas || {} });
    } catch (err) { setAshtakvarga(null); }
    setAshtakvargaLoading(false);
  };

  const onChangeAshtakvargaStyle = (newStyle) => {
    setAshtakvargaStyle(newStyle);
    if (kundaliRecord?.id) fetchAshtakvarga(kundaliRecord.id, newStyle);
  };

  // Phase 9 — fetch KP system data (chart + planets + cusps + ruling)
  const fetchKpFull = async (recordId, style) => {
    if (!recordId) return;
    setKpLoading(true);
    try {
      const res = await kundaliApi.getKpFull({ kundaliId: recordId, style: style || kpStyle });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[KP] full response =>', d);
      // eslint-disable-next-line no-console
      console.log('[KP] kpPlanets =>', d?.kpPlanets);
      // eslint-disable-next-line no-console
      console.log('[KP] kpCusps =>', d?.kpCusps);
      // eslint-disable-next-line no-console
      console.log('[KP] rulingPlanets =>', d?.rulingPlanets);
      setKpData({
        kpPlanets: d?.kpPlanets || null,
        kpCusps: d?.kpCusps || null,
        rulingPlanets: d?.rulingPlanets || null,
        chalitChart: d?.chalitChart || null,
      });
    } catch (err) { setKpData(null); }
    setKpLoading(false);
  };

  const onChangeKpStyle = (newStyle) => {
    setKpStyle(newStyle);
    if (kundaliRecord?.id) fetchKpFull(kundaliRecord.id, newStyle);
  };

  // Phase 10 — fetch Sade Sati: current status + full phases table
  const fetchSadeSati = async (recordId) => {
    if (!recordId) return;
    setSadeSatiLoading(true);
    try {
      const res = await kundaliApi.getSadeSati({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[SadeSati] response =>', d);
      setSadeSati(d?.sadeSati || null);
      setSadeSatiTable(d?.sadeSatiTable || null);
    } catch (err) { setSadeSati(null); setSadeSatiTable(null); }
    setSadeSatiLoading(false);
  };

  // Phase 11 — fetch Shadbala
  const fetchShadbala = async (recordId) => {
    if (!recordId) return;
    setShadbalaLoading(true);
    try {
      const res = await kundaliApi.getShadbala({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[Shadbala] response =>', d);
      setShadbala(d?.shadbala || d);
    } catch (err) { setShadbala(null); }
    setShadbalaLoading(false);
  };

  // Phase 12 — fetch Bhav Bala
  const fetchBhavBala = async (recordId) => {
    if (!recordId) return;
    setBhavBalaLoading(true);
    try {
      const res = await kundaliApi.getBhavBala({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[BhavBala] response =>', d);
      setBhavBala(d?.bhavBala || d);
    } catch (err) { setBhavBala(null); }
    setBhavBalaLoading(false);
  };

  // Phase 13 — fetch Manglik dosh
  const fetchManglik = async (recordId) => {
    if (!recordId) return;
    setManglikLoading(true);
    try {
      const res = await kundaliApi.getManglikDosh({ kundaliId: recordId });
      const d = res.data?.data || res.data;
      // eslint-disable-next-line no-console
      console.log('[Manglik] response =>', d);
      setManglik(d?.manglik || d);
    } catch (err) { setManglik(null); }
    setManglikLoading(false);
  };

  const fetchBasic = async (recordId, langCode) => {
    if (!recordId) return;
    setBasicLoading(true);
    try {
      const res = await kundaliApi.getBasicReport({ kundaliId: recordId, lang: langCode || lang });
      const bd = res.data?.data || res.data;
      setBasicReport(bd?.planetDetails || bd);
    } catch (err) { setBasicReport(null); }
    setBasicLoading(false);
  };

  // Phase 1 — fetch panchang at birth
  const fetchBirthPanchang = async (recordId, langCode) => {
    if (!recordId) return null;
    try {
      const res = await kundaliApi.getBirthPanchang({ kundaliId: recordId, lang: langCode || lang });
      const d = res.data?.data || res.data;
      setBirthPanchang(d?.panchang || d);
    } catch (err) { setBirthPanchang(null); }
  };

  // Phase 1 — fetch avakhada / extended details
  const fetchAvakhada = async (recordId, langCode) => {
    if (!recordId) return null;
    try {
      const res = await kundaliApi.getAvakhadaDetails({ kundaliId: recordId, lang: langCode || lang });
      const d = res.data?.data || res.data;
      setAvakhada(d?.avakhada || d);
    } catch (err) { setAvakhada(null); }
  };

  const fetchBasicTab = async (recordId, langCode) => {
    if (!recordId) return;
    setBasicTabLoading(true);
    await Promise.all([
      fetchBirthPanchang(recordId, langCode),
      fetchAvakhada(recordId, langCode),
    ]);
    setBasicTabLoading(false);
  };

  const onChangeLang = (newLang) => {
    setLang(newLang);
    if (kundaliRecord?.id) {
      fetchBasic(kundaliRecord.id, newLang);
      fetchLagnaCharts(kundaliRecord.id, chartStyle, newLang);
      fetchBasicTab(kundaliRecord.id, newLang);
      // Transit only refetches if user has visited that tab (chart already loaded)
      if (transitSvg) fetchTransitChart(kundaliRecord.id, transitDate, transitStyle, newLang);
    }
  };

  // =============================================================
  // Form handlers
  // =============================================================
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlaceChange = (e) => {
    const place = e.target.value;
    setForm(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await kundaliApi.placeAutocomplete({ query: place });
        if (res.data?.suggestions?.length) {
          setSuggestions(res.data.suggestions); setShowSuggestions(true);
        } else { setSuggestions([]); setShowSuggestions(false); }
      } catch (err) { setSuggestions([]); }
      setPlaceLoading(false);
    }, 400);
  };

  const selectPlace = (suggestion) => {
    setForm(prev => ({
      ...prev,
      birthPlace: suggestion.name,
      latitude: suggestion.lat ? String(suggestion.lat) : '',
      longitude: suggestion.lon ? String(suggestion.lon) : '',
    }));
    setSuggestions([]); setShowSuggestions(false);
    if (!suggestion.lat) {
      kundaliApi.geocode({ place: suggestion.name }).then(res => {
        if (res.data?.latitude) setForm(prev => ({ ...prev, latitude: String(res.data.latitude), longitude: String(res.data.longitude) }));
      }).catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.birthDate || !form.birthTime || !form.birthPlace) {
      toast.error('Please fill all fields'); return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Location not found for this place. Please try a more specific place name.'); return;
    }
    setLoading(true);
    setBasicReport(null); setKundaliRecord(null);
    setLagnaD1Svg(null); setLagnaD9Svg(null); setChartSvg(null);
    setBirthPanchang(null); setAvakhada(null);
    try {
      const res = await kundaliApi.add({
        kundali: [{ name: form.name, gender: form.gender, birthDate: form.birthDate, birthTime: form.birthTime, birthPlace: form.birthPlace, latitude: form.latitude, longitude: form.longitude, pdf_type: 'basic' }]
      });
      const d = res.data?.data || res.data;
      const record = d?.recordList?.[0] || d?.recordList || null;
      setKundaliRecord(record);
      if (record?.id) {
        await Promise.all([
          fetchBasic(record.id, lang),
          fetchLagnaCharts(record.id, chartStyle, lang),
          fetchBasicTab(record.id, lang),
        ]);
      }
      toast.success('Kundali generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate kundali');
    }
    setLoading(false);
  };

  // =============================================================
  // Renderers — degree, planet table
  // =============================================================
  const fmtDeg = (deg) => {
    if (deg === undefined || deg === null || deg === '') return '-';
    const n = parseFloat(deg);
    if (!Number.isFinite(n)) return String(deg);
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = Math.round((mFloat - m) * 60);
    return `${sign}${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
  };

  const isRetro = (p) => p?.retro === 1 || p?.retro === '1' || p?.retro === true || p?.isRetro === true || p?.isRetro === 'true';

  // Common planet list extraction (filters meta entries)
  const getPlanetList = () => {
    if (!basicReport) return [];
    if (typeof basicReport === 'string') return [];
    const raw = Array.isArray(basicReport) ? basicReport : Object.values(basicReport);
    return raw.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const hasName = p.full_name || p.name || p.planet;
      const hasPosition = p.house != null || p.house_no != null || p.house_number != null
                       || p.zodiac || p.sign || p.current_sign
                       || p.local_degree != null || p.global_degree != null;
      return hasName && hasPosition;
    });
  };

  // Sign view — focus on zodiac placement & sign lord
  const renderPlanetSignView = (planets) => (
    <div className="planet-table-wrap">
      <table className="planet-table">
        <thead>
          <tr>
            <th>Planet</th><th>House</th><th>Zodiac</th><th>Sign Lord</th>
            <th>Degree in Sign</th><th>Total Degree</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((p, i) => {
            const planetName = p.full_name || p.name || p.planet || '-';
            const retro = isRetro(p);
            const sign = p.zodiac || p.sign || p.current_sign || '';
            const signLord = p.sign_lord || p.signLord || p.lord || SIGN_LORDS[sign] || '-';
            const isAsc = (p.name === 'As' || planetName === 'Ascendant');
            return (
              <tr key={i} style={isAsc ? { background: '#fef3c7' } : undefined}>
                <td>
                  <strong>{PLANET_GLYPH[planetName] || ''} {planetName}</strong>
                  {retro && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>R</span>}
                </td>
                <td>{p.house ?? p.house_no ?? p.house_number ?? '-'}</td>
                <td>{sign || '-'}</td>
                <td>{signLord && PLANET_GLYPH[signLord] ? `${PLANET_GLYPH[signLord]} ${signLord}` : (signLord || '-')}</td>
                <td>{fmtDeg(p.local_degree ?? p.localDegree ?? p.degree)}</td>
                <td>{fmtDeg(p.global_degree ?? p.globalDegree ?? p.fullDegree)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Nakshatra view — focus on lunar mansion & pada
  const renderPlanetNakshatraView = (planets) => (
    <div className="planet-table-wrap">
      <table className="planet-table">
        <thead>
          <tr>
            <th>Planet</th><th>Nakshatra</th><th>Pada</th><th>Nakshatra Lord</th>
            <th>Degree</th><th>Total Degree</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((p, i) => {
            const planetName = p.full_name || p.name || p.planet || '-';
            const retro = isRetro(p);
            const nakshatra = p.nakshatra || p.nakshatra_name || '';
            const pada = p.nakshatra_pada || p.pada || '';
            const nakLord = p.nakshatra_lord || p.nakLord || NAKSHATRA_LORDS[nakshatra] || '-';
            const isAsc = (p.name === 'As' || planetName === 'Ascendant');
            return (
              <tr key={i} style={isAsc ? { background: '#fef3c7' } : undefined}>
                <td>
                  <strong>{PLANET_GLYPH[planetName] || ''} {planetName}</strong>
                  {retro && <span style={{ marginLeft: 6, padding: '1px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>R</span>}
                </td>
                <td>{nakshatra || '-'}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#7c3aed' }}>{pada || '-'}</td>
                <td>{nakLord && PLANET_GLYPH[nakLord] ? `${PLANET_GLYPH[nakLord]} ${nakLord}` : (nakLord || '-')}</td>
                <td>{fmtDeg(p.local_degree ?? p.localDegree ?? p.degree)}</td>
                <td>{fmtDeg(p.global_degree ?? p.globalDegree ?? p.fullDegree)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderPlanetDetails = () => {
    if (basicLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading planet details...</div>;
    if (!basicReport) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;
    if (typeof basicReport === 'string') return <p>{basicReport}</p>;
    const planets = getPlanetList();
    if (!planets.length) return <p style={{ color: '#9ca3af' }}>No planet data available</p>;

    return (
      <div>
        {/* Sub-view toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { v: 'sign', label: '♉ Sign View', desc: 'Zodiac & Sign Lord' },
            { v: 'nakshatra', label: '⭐ Nakshatra View', desc: 'Lunar mansion & Pada' },
          ].map(opt => (
            <button key={opt.v} type="button" onClick={() => setPlanetsSubView(opt.v)}
              style={{
                padding: '10px 20px',
                border: planetsSubView === opt.v ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                background: planetsSubView === opt.v ? '#7c3aed' : '#fff',
                color: planetsSubView === opt.v ? '#fff' : '#1a0533',
                borderRadius: 50, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <span>{opt.label}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 500 }}>{opt.desc}</span>
            </button>
          ))}
        </div>

        {planetsSubView === 'sign' ? renderPlanetSignView(planets) : renderPlanetNakshatraView(planets)}

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          {planetsSubView === 'sign'
            ? '💡 Sign view dikhata hai planet kis rashi mein hai aur uska sign lord kaun hai. Useful for predicting house effects.'
            : '💡 Nakshatra view dikhata hai planet kaunse 27 nakshatras mein hai, kaun sa pada (1-4), aur nakshatra lord. Useful for Vimshottari dasha calculation.'}
        </p>
      </div>
    );
  };

  // =============================================================
  // Phase 1 — Basic tab building blocks
  // =============================================================
  const SectionCard = ({ title, icon, children }) => (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', marginBottom: 16, border: '1px solid #f0e6ff', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      <h4 style={{ color: '#1a0533', fontSize: '1.05rem', margin: 0, marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #f3f0fa', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span> {title}
      </h4>
      {children}
    </div>
  );

  const KVGrid = ({ pairs }) => {
    const filtered = pairs.filter(([k, v]) => v !== undefined && v !== null && v !== '' && v !== '-');
    if (!filtered.length) return <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>No data available</p>;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px 20px' }}>
        {filtered.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px dashed #f0e6ff' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{k}</span>
            <span style={{ color: '#1a0533', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', wordBreak: 'break-word' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  };

  // Safely deep-pick a value from possibly-nested response
  const dpick = (obj, ...paths) => {
    for (const p of paths) {
      const parts = p.split('.');
      let cur = obj;
      let ok = true;
      for (const part of parts) {
        if (cur == null || typeof cur !== 'object') { ok = false; break; }
        cur = cur[part];
      }
      if (ok && cur !== undefined && cur !== null && cur !== '') {
        if (typeof cur === 'object' && cur.name) return cur.name;
        return cur;
      }
    }
    return null;
  };

  // Phase 1 — Birth Details card
  const renderBirthDetails = () => {
    const k = kundaliRecord || {};
    const tz = k.timezone;
    const tzStr = (tz === null || tz === undefined || tz === '') ? null
      : `UTC ${parseFloat(tz) >= 0 ? '+' : ''}${tz}`;
    const pairs = [
      ['Name', k.name],
      ['Gender', k.gender],
      ['Date of Birth', k.birthDate],
      ['Time of Birth', k.birthTime],
      ['Place of Birth', k.birthPlace],
      ['Latitude', k.latitude],
      ['Longitude', k.longitude],
      ['Timezone', tzStr],
    ];
    return <KVGrid pairs={pairs} />;
  };

  // Phase 1 — Panchang card (from /panchang/panchang)
  const renderPanchang = () => {
    if (!birthPanchang) return <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>No panchang data</p>;
    const p = birthPanchang;
    const tithi = dpick(p, 'tithi.details.tithi_name', 'tithi.name', 'tithi');
    const tithiPaksha = dpick(p, 'tithi.details.paksha', 'paksha');
    const nakshatra = dpick(p, 'nakshatra.details.nak_name', 'nakshatra.name', 'nakshatra');
    const nakLord = dpick(p, 'nakshatra.details.ruler', 'nakshatra.ruler', 'nakshatra_lord');
    const yoga = dpick(p, 'yoga.details.yog_name', 'yoga.name', 'yoga');
    const karana = dpick(p, 'karana.details.karan_name', 'karana.name', 'karana');
    const day = dpick(p, 'day.name', 'day');
    const sunrise = dpick(p, 'advanced_details.sunrise', 'sunrise');
    const sunset = dpick(p, 'advanced_details.sunset', 'sunset');
    const moonrise = dpick(p, 'advanced_details.moonrise', 'moonrise');
    const moonset = dpick(p, 'advanced_details.moonset', 'moonset');
    const sunSign = dpick(p, 'advanced_details.sun_rashi.name', 'sun_rashi.name', 'sun_rashi');
    const moonSign = dpick(p, 'advanced_details.moon_rashi.name', 'moon_rashi.name', 'moon_rashi');
    const masaAmanta = dpick(p, 'advanced_details.masa.amanta_name', 'masa.amanta_name');
    const masaPurnimanta = dpick(p, 'advanced_details.masa.purnimanta_name', 'masa.purnimanta_name');
    const ritu = dpick(p, 'advanced_details.ritu.name', 'ritu.name', 'ritu');
    const ayanamsa = dpick(p, 'advanced_details.ayanamsa', 'ayanamsa.name', 'ayanamsa.value', 'ayanamsa');
    const vedicWeekday = dpick(p, 'advanced_details.vedic_weekday.name', 'vedic_weekday.name', 'vedic_weekday');
    const samvat = dpick(p, 'advanced_details.years.vikram_samvaat_number', 'years.vikram_samvaat_number');

    const pairs = [
      ['Day', day],
      ['Vedic Weekday', vedicWeekday],
      ['Tithi', tithiPaksha ? `${tithi} (${tithiPaksha})` : tithi],
      ['Nakshatra', nakLord ? `${nakshatra} (Lord: ${nakLord})` : nakshatra],
      ['Yoga', yoga],
      ['Karana', karana],
      ['Sun Sign', sunSign],
      ['Moon Sign', moonSign],
      ['Sunrise', sunrise],
      ['Sunset', sunset],
      ['Moonrise', moonrise],
      ['Moonset', moonset],
      ['Masa (Amanta)', masaAmanta],
      ['Masa (Purnimanta)', masaPurnimanta],
      ['Ritu', ritu],
      ['Ayanamsa', ayanamsa],
      ['Vikram Samvat', samvat],
    ];
    return <KVGrid pairs={pairs} />;
  };

  // Phase 1 — Avakhada card (from /extended-horoscope/extended-kundli-details)
  const renderAvakhada = () => {
    if (!avakhada) return <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>No avakhada data</p>;
    const a = avakhada;
    const pairs = [
      ['Varna',           a.varna],
      ['Vashya',          a.vashya || a.vasya],
      ['Yoni',            a.yoni],
      ['Gana',            a.gana],
      ['Nadi',            a.nadi],
      ['Sign / Rashi',    a.sign || a.rashi],
      ['Sign Lord',       a.sign_lord || a.rashi_lord],
      ['Nakshatra',       a.nakshatra],
      ['Nakshatra Lord',  a.nakshatra_lord],
      ['Charan / Pada',   a.charan || a.pada],
      ['Yunja',           a.yunja],
      ['Tatva',           a.tatva],
      ['Name Alphabet',   a.name_alphabet || a.first_letter || a.name_start],
      ['Paya',            a.paya],
      ['Ayanamsa',        a.ayanamsa],
      ['Birth Lagna',     a.birth_lagna || a.lagna],
      ['Lagna Lord',      a.lagna_lord || a.birth_lagna_lord],
      ['Chandra Avastha', a.chandra_avastha],
      ['Chandra Kriya',   a.chandra_kriya],
      ['Chandra Vela',    a.chandra_vela],
      ['Karan',           a.karan],
      ['Yog',             a.yog],
      ['Tithi',           a.tithi],
    ];
    return <KVGrid pairs={pairs} />;
  };

  // =============================================================
  // Build planet → "Dd°mm'" map from basicReport (used to inject degrees into chart SVG)
  // =============================================================
  const buildDegreeMap = (report) => {
    if (!report) return {};
    const raw = Array.isArray(report) ? report : Object.values(report);
    const map = {};
    raw.forEach(p => {
      if (!p || typeof p !== 'object') return;
      const code = p.name || p.short_name; // "As", "Su", "Mo", "Ma", "Me", "Ju", "Ve", "Sa", "Ra", "Ke"
      if (!code) return;
      const deg = p.local_degree;
      if (deg === undefined || deg === null || deg === '') return;
      const n = parseFloat(deg);
      if (!Number.isFinite(n)) return;
      const abs = Math.abs(n);
      const d = Math.floor(abs);
      const m = Math.floor((abs - d) * 60);
      const retro = isRetro(p);
      map[code] = `${d}°${String(m).padStart(2, '0')}'${retro ? 'R' : ''}`;
    });
    return map;
  };

  // Inject a small <text> sibling below every planet label inside an SVG chart string.
  // Detects each <text ...>CODE</text> where CODE matches a key in degreeMap, then appends
  // a degree text right below it (slightly offset, smaller font, purple).
  const injectDegreesIntoSvg = (svgStr, degreeMap) => {
    if (!svgStr || typeof svgStr !== 'string') return svgStr;
    if (!degreeMap || !Object.keys(degreeMap).length) return svgStr;
    return svgStr.replace(
      /<text\s+([^>]*?)>\s*([A-Za-z]{2,4})\s*<\/text>/g,
      (match, attrs, content) => {
        const planet = content.trim();
        if (!degreeMap[planet]) return match;
        const xMatch = attrs.match(/\bx\s*=\s*["']?([-\d.]+)["']?/);
        const yMatch = attrs.match(/\by\s*=\s*["']?([-\d.]+)["']?/);
        if (!xMatch || !yMatch) return match;
        const x = parseFloat(xMatch[1]);
        const y = parseFloat(yMatch[1]);
        const degText = degreeMap[planet];
        // Place degree just below planet label (offset 16px, small purple font)
        const degEl = `<text x="${x}" y="${y + 16}" style="font-family:'roboto','Lucida Sans',sans-serif;font-size:13px;fill:#7c3aed;font-weight:600;">${degText}</text>`;
        return match + degEl;
      }
    );
  };

  // =============================================================
  // Shared SVG renderer (used by Lagna + Divisional)
  // opts: { maxWidth, degreeMap } — pass degreeMap to overlay degrees into chart
  // =============================================================
  const renderSvgChart = (svg, opts = {}) => {
    const { maxWidth = 520, degreeMap = null } = opts;
    if (!svg) return <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Chart not available</div>;
    const str = typeof svg === 'string' ? svg : '';
    const wrapStyle = { background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #f0e6ff', textAlign: 'center', overflowX: 'auto' };
    const svgIdx = str.indexOf('<svg');
    if (svgIdx >= 0) {
      let cleanSvg = str.substring(svgIdx).replace(/<svg([^>]*)>/, (m, attrs) => {
        const hasViewBox = /viewBox\s*=/i.test(attrs);
        const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
        const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
        let newAttrs = attrs
          .replace(/\bwidth\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '')
          .replace(/\bheight\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '');
        if (!hasViewBox && wMatch && hMatch) newAttrs = ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"` + newAttrs;
        return `<svg width="100%" height="auto" preserveAspectRatio="xMidYMid meet"${newAttrs}>`;
      });
      if (degreeMap) cleanSvg = injectDegreesIntoSvg(cleanSvg, degreeMap);
      return <div style={{ ...wrapStyle, maxWidth, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: cleanSvg }} />;
    }
    if (/^https?:\/\//.test(str)) {
      return <div style={wrapStyle}><img src={str} alt="Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
    }
    if (str.startsWith('data:image')) {
      return <div style={wrapStyle}><img src={str} alt="Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
    }
    if (str.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(str)) {
      const clean = str.replace(/\s+/g, '');
      const decoded = (() => { try { return atob(clean); } catch (_) { return ''; } })();
      const isSvg = decoded.includes('<svg');
      const src = `data:image/${isSvg ? 'svg+xml' : 'png'};base64,${clean}`;
      return <div style={wrapStyle}><img src={src} alt="Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
    }
    return <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Unrecognized chart format</div>;
  };

  // =============================================================
  // Phase 2 — Lagna tab (D1 + D9 with shared style toggle)
  // =============================================================

  // Quick reference table — planet abbreviations + degrees
  // Accepts any planet-details payload (D1 / D9 / Transit) — caller passes data + label
  // Helps clients verify chart placement at a glance: "As 2°50' Aqu", "Sa-13°51' R" etc.
  const renderQuickPositions = (data, opts = {}) => {
    const source = data === undefined ? basicReport : data;
    if (!source) return null;
    const { label = 'Planetary Positions', note } = opts;
    const raw = Array.isArray(source) ? source : Object.values(source);
    const planets = raw.filter(p => {
      if (!p || typeof p !== 'object') return false;
      const hasName = p.full_name || p.name;
      const hasPos = p.local_degree != null || p.zodiac || p.sign;
      return hasName && hasPos;
    });
    if (!planets.length) return null;

    const fmtShort = (deg) => {
      if (deg === null || deg === undefined || deg === '') return '';
      const n = parseFloat(deg);
      if (!Number.isFinite(n)) return '';
      const abs = Math.abs(n);
      const d = Math.floor(abs);
      const m = Math.floor((abs - d) * 60);
      return `${d}°${String(m).padStart(2, '0')}'`;
    };
    const shortSign = (z) => {
      if (!z) return '';
      const map = { Aries: 'Ari', Taurus: 'Tau', Gemini: 'Gem', Cancer: 'Can', Leo: 'Leo', Virgo: 'Vir', Libra: 'Lib', Scorpio: 'Sco', Sagittarius: 'Sag', Capricorn: 'Cap', Aquarius: 'Aqu', Pisces: 'Pis' };
      return map[z] || (typeof z === 'string' ? z.substring(0, 3) : '');
    };

    if (!planets.length) return null;

    return (
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed #e0d4f5' }}>
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px 10px', fontSize: '0.78rem' }}>
          {planets.map((p, i) => {
            const lbl = p.name || p.full_name || '?';
            const deg = fmtShort(p.local_degree);
            const sign = shortSign(p.zodiac || p.sign);
            const retro = isRetro(p);
            return (
              <div key={i} style={{ background: '#faf7ff', borderRadius: 6, padding: '5px 8px', display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}
                title={`${p.full_name || lbl} — ${p.zodiac || p.sign || ''} ${fmtDeg(p.local_degree)}`}>
                <span style={{ fontWeight: 700, color: '#1a0533' }}>{lbl}{retro && <span style={{ color: '#b91c1c', marginLeft: 2 }}>R</span>}</span>
                <span style={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{deg}{sign && ` ${sign}`}</span>
              </div>
            );
          })}
        </div>
        {note && <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 8, fontStyle: 'italic', margin: '8px 0 0' }}>{note}</p>}
      </div>
    );
  };

  const renderLagnaTab = () => {
    const styles = ['north', 'south', 'east'];
    const degreeMap = showDegrees ? buildDegreeMap(basicReport) : null;

    const ChartPanel = ({ title, subtitle, svg, accent, withDegrees, positionsLabel, positionsNote }) => (
      <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${accent}33`, borderTop: `4px solid ${accent}`, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h4 style={{ color: accent, margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h4>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>{subtitle}</p>
        </div>
        {lagnaLoading ? (
          <div style={{ textAlign: 'center', color: '#7c3aed', padding: '60px 20px', fontWeight: 600 }}>Generating chart...</div>
        ) : (
          <>
            {renderSvgChart(svg, { maxWidth: 360, degreeMap: withDegrees ? degreeMap : null })}
            {positionsLabel && renderQuickPositions(undefined, { label: positionsLabel, note: positionsNote })}
          </>
        )}
      </div>
    );

    return (
      <div>
        {/* Controls row: style toggle + show-degrees toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>Chart Style:</span>
            {styles.map(s => (
              <button key={s} type="button" onClick={() => onChangeChartStyle(s)}
                style={{
                  padding: '8px 16px',
                  border: chartStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                  background: chartStyle === s ? '#7c3aed' : '#fff',
                  color: chartStyle === s ? '#fff' : '#1a0533',
                  borderRadius: 50, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {s} Indian
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1a0533', background: showDegrees ? '#f3e8ff' : '#fff', padding: '8px 14px', borderRadius: 50, border: '2px solid #e0d4f5' }}>
            <input type="checkbox" checked={showDegrees} onChange={e => setShowDegrees(e.target.checked)}
              style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: 'pointer' }} />
            Show degrees on chart
          </label>
        </div>

        {/* Two charts side-by-side on desktop, stacked on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          <ChartPanel
            title="📍 Lagna Chart (D1)"
            subtitle="Birth chart — personality, life path & general fortune"
            svg={lagnaD1Svg}
            accent="#7c3aed"
            withDegrees={true}
            positionsLabel="Quick Reference — Planetary Positions (D1)"
          />
          <ChartPanel
            title="💑 Navamsa Chart (D9)"
            subtitle="Spouse, marriage & dharma — second-most important chart"
            svg={lagnaD9Svg}
            accent="#ec4899"
            withDegrees={false}
            positionsLabel="Birth Reference (D1 Positions)"
            positionsNote="Showing D1 birth positions for reference — D9 chart visually shows navamsa placements."
          />
        </div>

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 Lagna chart pe planet code ke neeche degree (purple) dikhega. Toggle off bhi kar sakte ho. Navamsa pe degrees nahi (D9 positions alag hote hain).
        </p>
      </div>
    );
  };

  // =============================================================
  // Phase 3 — Transit tab
  // Shows planet positions for a chosen date relative to the birth chart
  // =============================================================
  const renderTransitTab = () => {
    const styles = ['north', 'south', 'east'];
    const fetchedDateLabel = transitFetchedDate || transitDate;
    const transitDegreeMap = showTransitDegrees ? buildDegreeMap(transitPlanets) : null;

    return (
      <div>
        {/* Lazy-load: first time user opens this tab, fetch */}
        {!transitSvg && !transitLoading && kundaliRecord?.id && (() => {
          fetchTransitChart(kundaliRecord.id, transitDate, transitStyle, lang);
          return null;
        })()}

        {/* Controls row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>📅 Transit Date:</span>
            <input type="date" value={transitDate} max={`${new Date().getFullYear() + 5}-12-31`}
              onChange={e => onChangeTransitDate(e.target.value)}
              style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer', background: '#fff' }} />
            {transitDate !== todayIso && (
              <button type="button" onClick={() => onChangeTransitDate(todayIso)}
                style={{ background: 'transparent', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                ↺ Today
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>Style:</span>
            {styles.map(s => (
              <button key={s} type="button" onClick={() => onChangeTransitStyle(s)}
                style={{
                  padding: '8px 14px',
                  border: transitStyle === s ? '2px solid #0ea5e9' : '2px solid #e0d4f5',
                  background: transitStyle === s ? '#0ea5e9' : '#fff',
                  color: transitStyle === s ? '#fff' : '#1a0533',
                  borderRadius: 50, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {s} Indian
              </button>
            ))}
          </div>
        </div>

        {/* Show-degrees-on-chart toggle */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1a0533', background: showTransitDegrees ? '#e0f2fe' : '#fff', padding: '8px 14px', borderRadius: 50, border: '2px solid #bae6fd' }}>
            <input type="checkbox" checked={showTransitDegrees} onChange={e => setShowTransitDegrees(e.target.checked)}
              style={{ accentColor: '#0ea5e9', width: 16, height: 16, cursor: 'pointer' }} />
            Show degrees on chart
          </label>
        </div>

        {/* Transit chart panel */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #bae6fd', borderTop: '4px solid #0ea5e9', padding: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#0ea5e9', margin: 0, fontSize: '1rem', fontWeight: 700 }}>🌌 Transit Chart</h4>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>
              Planet positions on <strong style={{ color: '#1a0533' }}>{fetchedDateLabel}</strong> over your birth chart
            </p>
          </div>
          {transitLoading ? (
            <div style={{ textAlign: 'center', color: '#0ea5e9', padding: '60px 20px', fontWeight: 600 }}>Generating transit chart...</div>
          ) : (
            <>
              {renderSvgChart(transitSvg, { maxWidth: 480, degreeMap: transitDegreeMap })}
              {renderQuickPositions(transitPlanets, {
                label: `Transit Positions on ${fetchedDateLabel}`,
                note: 'Where planets are in the sky on the chosen date.'
              })}
            </>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 Transit chart shows where planets are <strong>RIGHT NOW</strong> (or chosen date) relative to your janma kundali. Use it to understand current dasha effects, planetary periods, gochar phal.
        </p>
      </div>
    );
  };

  // =============================================================
  // Phase 4 — Dasha tab (Vimshottari Mahadasha → Antar → Pratyantar → Sookshma)
  // =============================================================

  // Normalize mahadasha API response into uniform list of {lord, start, end, startTs, endTs}.
  // Handles 4 shapes:
  //   A) /current-mahadasha-full: { mahadasha: [{name,start,end},...], antardasha: [...], ... }
  //   B) /maha-dasha (legacy): { mahadasha: [lords], mahadasha_order: [start dates] } parallel arrays
  //   C) Array of objects directly
  //   D) Object with numeric keys: { 0: {...}, 1: {...} }
  const normalizeMahadashaList = (raw) => {
    if (!raw) return [];

    // Shape A — current-mahadasha-full has nested array of mahadasha objects.
    // Detect by checking if raw[key] is array of objects with name/planet/lord field.
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const candidateKeys = ['mahadasha', 'mahadashas', 'dashas', 'table', 'list', 'data', 'periods'];
      for (const k of candidateKeys) {
        const arr = raw[k];
        if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && !Array.isArray(arr[0])) {
          if (arr[0].name || arr[0].planet || arr[0].lord || arr[0].dasha_lord) {
            return normalizeMahadashaList(arr); // recursive — falls into array-of-objects handler
          }
        }
      }
    }

    // Shape C/D — array of objects (or numeric-keyed object)
    if (Array.isArray(raw) || (typeof raw === 'object' && !raw.mahadasha && !raw.mahadasha_order)) {
      const items = Array.isArray(raw) ? raw : Object.values(raw);
      const objRows = items.filter(it => it && typeof it === 'object' && !Array.isArray(it));
      if (objRows.length > 0 && (objRows[0].planet || objRows[0].lord || objRows[0].dasha_lord || objRows[0].name)) {
        const result = objRows.map(it => {
          const lord = it.planet || it.lord || it.dasha_lord || it.name;
          const start = it.start_date || it.start || it.start_time || it.from;
          const end = it.end_date || it.end || it.end_time || it.to;
          if (!lord || !start || !end) return null;
          const startTs = new Date(start).getTime();
          const endTs = new Date(end).getTime();
          if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return null;
          return {
            lord: String(lord).trim(),
            start: new Date(startTs).toISOString().split('T')[0],
            end: new Date(endTs).toISOString().split('T')[0],
            startTs, endTs,
          };
        }).filter(Boolean);

        // Apply same loop-prepend as Shape A — fill all predecessors back to birth
        if (result.length > 0 && kundaliRecord?.birthDate) {
          const birthTs = new Date(kundaliRecord.birthDate).getTime();
          if (Number.isFinite(birthTs)) {
            let safety = 0;
            while (result[0].startTs > birthTs && safety < 9) {
              const firstLord = result[0].lord;
              const firstIdx = VIM_ORDER.indexOf(firstLord);
              if (firstIdx === -1) break;
              const prevLord = VIM_ORDER[(firstIdx - 1 + 9) % 9];
              const prevYears = VIM_YEARS[prevLord] || 0;
              const prevStartTs = result[0].startTs - prevYears * 365.25 * 24 * 60 * 60 * 1000;
              result.unshift({
                lord: prevLord,
                start: new Date(prevStartTs).toISOString().split('T')[0],
                end: result[0].start,
                startTs: prevStartTs,
                endTs: result[0].startTs,
              });
              safety++;
            }
          }
        }
        return result;
      }
    }

    // Shape A — parallel arrays (legacy /maha-dasha)
    if (raw.mahadasha && Array.isArray(raw.mahadasha) && raw.mahadasha_order && Array.isArray(raw.mahadasha_order)) {
      const lords = raw.mahadasha;
      const dates = raw.mahadasha_order;
      const result = [];
      for (let i = 0; i < lords.length; i++) {
        const lord = String(lords[i]).trim();
        const startStr = dates[i];
        const startTs = new Date(startStr).getTime();
        if (!Number.isFinite(startTs)) continue;
        let endStr, endTs;
        if (i + 1 < dates.length) {
          endStr = dates[i + 1];
          endTs = new Date(endStr).getTime();
        } else {
          // Last mahadasha — extend by planet's standard Vimshottari years
          const years = VIM_YEARS[lord] || 0;
          endTs = startTs + years * 365.25 * 24 * 60 * 60 * 1000;
          endStr = new Date(endTs).toISOString();
        }
        if (!Number.isFinite(endTs)) continue;
        result.push({
          lord,
          start: new Date(startTs).toISOString().split('T')[0],
          end: new Date(endTs).toISOString().split('T')[0],
          startTs, endTs,
        });
      }

      // Prepend birth-time mahadasha + ALL predecessors until we go before birth date.
      // API often only returns 9 mahadashas starting from a future point — we need to walk
      // backwards in cyclic order, prepending each predecessor with its standard duration,
      // until the prepended mahadasha's start date is before the birth date.
      // Without this loop, missing mahadashas between birth and API's first entry.
      if (result.length > 0 && kundaliRecord?.birthDate) {
        const birthTs = new Date(kundaliRecord.birthDate).getTime();
        if (Number.isFinite(birthTs)) {
          // Safety bound: max 9 prepends (full cycle) to avoid infinite loop on bad data
          let safetyCounter = 0;
          while (result[0].startTs > birthTs && safetyCounter < 9) {
            const firstLord = result[0].lord;
            const firstIdx = VIM_ORDER.indexOf(firstLord);
            if (firstIdx === -1) break;
            const prevLord = VIM_ORDER[(firstIdx - 1 + 9) % 9];
            const prevYears = VIM_YEARS[prevLord] || 0;
            const prevStartTs = result[0].startTs - prevYears * 365.25 * 24 * 60 * 60 * 1000;
            result.unshift({
              lord: prevLord,
              start: new Date(prevStartTs).toISOString().split('T')[0],
              end: result[0].start,
              startTs: prevStartTs,
              endTs: result[0].startTs,
            });
            safetyCounter++;
          }
        }
      }
      return result;
    }

    // Shape B/C — array or numeric-key object of {planet, start_date, end_date}
    const items = Array.isArray(raw) ? raw : Object.values(raw);
    return items.map(it => {
      if (!it || typeof it !== 'object') return null;
      const lord = it.planet || it.lord || it.dasha_lord || it.name;
      const start = it.start || it.start_date || it.start_time;
      const end = it.end || it.end_date || it.end_time;
      if (!lord || !start || !end) return null;
      return {
        lord: String(lord).trim(),
        start: String(start).substring(0, 10),
        end: String(end).substring(0, 10),
        startTs: new Date(start).getTime(),
        endTs: new Date(end).getTime(),
      };
    }).filter(Boolean);
  };

  // Format duration between two dates as "Xy Ym" or "Ym Wd"
  const fmtDuration = (startTs, endTs) => {
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return '';
    const days = (endTs - startTs) / (1000 * 60 * 60 * 24);
    if (days >= 365) {
      const years = Math.floor(days / 365.25);
      const remDays = days - years * 365.25;
      const months = Math.round(remDays / 30.44);
      return `${years}y ${months}m`;
    }
    if (days >= 30) {
      const months = Math.floor(days / 30.44);
      const wks = Math.round((days - months * 30.44) / 7);
      return `${months}m ${wks}w`;
    }
    return `${Math.round(days)}d`;
  };

  const fmtDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  // Reusable row component
  const DashaRow = ({ level, lord, start, end, startTs, endTs, isCurrent, isExpandable, isExpanded, onClick, children }) => {
    const indent = (level - 1) * 24;
    const accent = level === 1 ? '#7c3aed' : level === 2 ? '#0ea5e9' : level === 3 ? '#10b981' : '#f59e0b';
    const bg = isCurrent ? '#fef3c7' : (level === 1 ? '#fff' : level === 2 ? '#faf5ff' : level === 3 ? '#f0f9ff' : '#f0fdf4');
    const fontSize = level === 1 ? '0.95rem' : level === 2 ? '0.88rem' : level === 3 ? '0.82rem' : '0.78rem';

    return (
      <>
        <div
          onClick={isExpandable ? onClick : undefined}
          style={{
            marginLeft: indent,
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', marginBottom: 4,
            background: bg, borderRadius: 8, border: `1px solid ${accent}22`,
            borderLeft: `3px solid ${accent}`,
            cursor: isExpandable ? 'pointer' : 'default',
            transition: 'background 0.15s',
          }}
          onMouseOver={(e) => { if (isExpandable) e.currentTarget.style.background = level === 1 ? '#faf5ff' : '#f3e8ff'; }}
          onMouseOut={(e) => e.currentTarget.style.background = bg}>
          {isExpandable && (
            <span style={{ color: accent, fontWeight: 700, fontSize: '0.85rem', width: 14 }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!isExpandable && <span style={{ width: 14 }} />}
          <span style={{ fontSize: '1rem' }}>{PLANET_GLYPH[lord] || '•'}</span>
          <span style={{ fontWeight: 700, color: accent, fontSize, minWidth: 80 }}>{lord}</span>
          <span style={{ color: '#6b7280', fontSize: '0.78rem', flex: 1, fontVariantNumeric: 'tabular-nums' }}>
            {fmtDate(start)} → {fmtDate(end)}
          </span>
          <span style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {fmtDuration(startTs, endTs)}
          </span>
          {isCurrent && (
            <span style={{ background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Current
            </span>
          )}
        </div>
        {children}
      </>
    );
  };

  const renderDashaTab = () => {
    // Lazy load on first open
    if (!mahadashaList && !mahadashaLoading && kundaliRecord?.id) {
      fetchMahadasha(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading dasha periods...</div>;
    }
    if (mahadashaLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading dasha periods...</div>;

    const list = normalizeMahadashaList(mahadashaList);
    if (!list.length) {
      return (
        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
          <strong style={{ color: '#92400e' }}>Mahadasha data unavailable.</strong>
          <p style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 6, marginBottom: 8 }}>API response was empty or unexpected. Raw data:</p>
          <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 10, borderRadius: 6, overflowX: 'auto', maxHeight: 200 }}>
            {JSON.stringify(mahadashaList, null, 2).substring(0, 600)}
          </pre>
        </div>
      );
    }

    const todayTs = Date.now();
    const isInPeriod = (s, e) => todayTs >= s && todayTs <= e;

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#1a0533', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>⏰ Vimshottari Dasha Tree</h4>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>
            Click any period to drill down: <strong>Mahadasha → Antardasha → Pratyantar → Sookshma</strong>. Current period highlighted in yellow.
          </p>
        </div>

        <div style={{ background: '#faf7ff', padding: 12, borderRadius: 12, border: '1px solid #f0e6ff' }}>
          {list.map((md, mIdx) => {
            const mKey = `M${mIdx}`;
            const mExpanded = !!dashaExpanded[mKey];
            const antars = mExpanded ? computeSubDashas(md.lord, md.start, md.end) : [];

            return (
              <DashaRow
                key={mKey} level={1} lord={md.lord} start={md.start} end={md.end}
                startTs={md.startTs} endTs={md.endTs}
                isCurrent={isInPeriod(md.startTs, md.endTs)}
                isExpandable
                isExpanded={mExpanded}
                onClick={() => toggleDashaExpand(mKey)}>

                {mExpanded && antars.map((ad, aIdx) => {
                  const aKey = `${mKey}.A${aIdx}`;
                  const aExpanded = !!dashaExpanded[aKey];
                  const pratyas = aExpanded ? computeSubDashas(ad.lord, ad.start, ad.end) : [];

                  return (
                    <DashaRow
                      key={aKey} level={2} lord={ad.lord} start={ad.start} end={ad.end}
                      startTs={ad.startTs} endTs={ad.endTs}
                      isCurrent={isInPeriod(ad.startTs, ad.endTs)}
                      isExpandable
                      isExpanded={aExpanded}
                      onClick={() => toggleDashaExpand(aKey)}>

                      {aExpanded && pratyas.map((pd, pIdx) => {
                        const pKey = `${aKey}.P${pIdx}`;
                        const pExpanded = !!dashaExpanded[pKey];
                        const sookshmas = pExpanded ? computeSubDashas(pd.lord, pd.start, pd.end) : [];

                        return (
                          <DashaRow
                            key={pKey} level={3} lord={pd.lord} start={pd.start} end={pd.end}
                            startTs={pd.startTs} endTs={pd.endTs}
                            isCurrent={isInPeriod(pd.startTs, pd.endTs)}
                            isExpandable
                            isExpanded={pExpanded}
                            onClick={() => toggleDashaExpand(pKey)}>

                            {pExpanded && sookshmas.map((sd, sIdx) => (
                              <DashaRow
                                key={`${pKey}.S${sIdx}`} level={4} lord={sd.lord} start={sd.start} end={sd.end}
                                startTs={sd.startTs} endTs={sd.endTs}
                                isCurrent={isInPeriod(sd.startTs, sd.endTs)}
                                isExpandable={false}
                              />
                            ))}
                          </DashaRow>
                        );
                      })}
                    </DashaRow>
                  );
                })}
              </DashaRow>
            );
          })}
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
          💡 Mahadasha API se aati hai. Antar/Pratyantar/Sookshma Vimshottari proportional formula se calculate hote hain (sab major astro books mein same formula).
        </p>
      </div>
    );
  };

  // =============================================================
  // Phase 5 — Yogini Dasha tab
  // =============================================================

  // Normalize Yogini API response — handles 4 shapes:
  //   A1) parallel arrays with START dates: { yogini_dasha: [...], yogini_order: [...] }
  //   A2) parallel arrays with END dates:   { yogini_dasha: [...], dasha_end_dates: [...] }
  //   B)  array of objects: [{ yogini, start_date, end_date }, ...]
  //   C)  numeric-key object
  const normalizeYoginiList = (raw) => {
    if (!raw) return [];

    const arrKey = ['dasha_list', 'yogini_dasha', 'yoginiDasha', 'yogini', 'dasha', 'mahadasha'].find(k => Array.isArray(raw[k]));
    const startKey = ['yogini_order', 'yoginiOrder', 'order', 'mahadasha_order', 'start_dates', 'dasha_start_dates', 'dates'].find(k => Array.isArray(raw[k]));
    const endKey = ['dasha_end_dates', 'end_dates', 'yogini_end_dates'].find(k => Array.isArray(raw[k]));

    if (arrKey && (startKey || endKey)) {
      const lords = raw[arrKey];
      const dates = raw[startKey || endKey];
      const isEndDates = !startKey && !!endKey;

      const result = [];
      const birthTs = kundaliRecord?.birthDate ? new Date(kundaliRecord.birthDate).getTime() : null;

      if (isEndDates) {
        // dates[i] is the END of yogini[i] (= START of yogini[i+1])
        // First yogini's start = birth date (best estimate when API doesn't say)
        for (let i = 0; i < lords.length; i++) {
          const lord = String(lords[i]).trim();
          const endTs = new Date(dates[i]).getTime();
          if (!Number.isFinite(endTs)) continue;
          let startTs;
          if (i === 0) startTs = Number.isFinite(birthTs) ? birthTs : (endTs - (YOG_YEARS[lord] || 0) * 365.25 * 86400000);
          else startTs = new Date(dates[i - 1]).getTime();
          if (!Number.isFinite(startTs)) continue;
          result.push({
            lord,
            start: new Date(startTs).toISOString().split('T')[0],
            end: new Date(endTs).toISOString().split('T')[0],
            startTs, endTs,
          });
        }
      } else {
        // dates[i] is the START of yogini[i]
        for (let i = 0; i < lords.length; i++) {
          const lord = String(lords[i]).trim();
          const startTs = new Date(dates[i]).getTime();
          if (!Number.isFinite(startTs)) continue;
          let endTs;
          if (i + 1 < dates.length) endTs = new Date(dates[i + 1]).getTime();
          else endTs = startTs + (YOG_YEARS[lord] || 0) * 365.25 * 86400000;
          if (!Number.isFinite(endTs)) continue;
          result.push({
            lord,
            start: new Date(startTs).toISOString().split('T')[0],
            end: new Date(endTs).toISOString().split('T')[0],
            startTs, endTs,
          });
        }
      }

      // Prepend birth-time yogini ONLY if first listed starts AFTER birth (start-dates path)
      if (!isEndDates && result.length && Number.isFinite(birthTs) && result[0].startTs > birthTs) {
        const firstIdx = YOG_ORDER.indexOf(result[0].lord);
        if (firstIdx !== -1) {
          const prevLord = YOG_ORDER[(firstIdx - 1 + 8) % 8];
          const prevYears = YOG_YEARS[prevLord] || 0;
          const prevStartTs = result[0].startTs - prevYears * 365.25 * 86400000;
          result.unshift({
            lord: prevLord,
            start: new Date(prevStartTs).toISOString().split('T')[0],
            end: result[0].start,
            startTs: prevStartTs,
            endTs: result[0].startTs,
          });
        }
      }
      return result;
    }

    // Shape B/C — array of objects
    const items = Array.isArray(raw) ? raw : Object.values(raw);
    return items.map(it => {
      if (!it || typeof it !== 'object') return null;
      const lord = it.yogini || it.planet || it.lord || it.dasha_lord || it.name;
      const start = it.start || it.start_date || it.start_time;
      const end = it.end || it.end_date || it.end_time;
      if (!lord || !start || !end) return null;
      return {
        lord: String(lord).trim(),
        start: String(start).substring(0, 10),
        end: String(end).substring(0, 10),
        startTs: new Date(start).getTime(),
        endTs: new Date(end).getTime(),
      };
    }).filter(Boolean);
  };

  const renderYoginiTab = () => {
    if (!yoginiList && !yoginiLoading && kundaliRecord?.id) {
      fetchYoginiDasha(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading yogini dasha...</div>;
    }
    if (yoginiLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading yogini dasha...</div>;

    const list = normalizeYoginiList(yoginiList);
    if (!list.length) {
      return (
        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
          <strong style={{ color: '#92400e' }}>Yogini dasha data unavailable.</strong>
          <p style={{ fontSize: '0.8rem', color: '#92400e', marginTop: 6, marginBottom: 8 }}>API response was empty or unexpected. Raw data:</p>
          <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 10, borderRadius: 6, overflowX: 'auto', maxHeight: 200 }}>
            {JSON.stringify(yoginiList, null, 2).substring(0, 600)}
          </pre>
        </div>
      );
    }

    const todayTs = Date.now();
    const isInPeriod = (s, e) => todayTs >= s && todayTs <= e;

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#1a0533', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>🌙 Yogini Dasha Tree</h4>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>
            8 yoginis (Mangala, Pingala, Dhanya, Bhramari, Bhadrika, Ulka, Siddha, Sankata) — 36-year cycle. Click to drill down to sub-yoginis. Current period highlighted.
          </p>
        </div>

        <div style={{ background: '#faf7ff', padding: 12, borderRadius: 12, border: '1px solid #f0e6ff' }}>
          {list.map((yd, yIdx) => {
            const yKey = `Y${yIdx}`;
            const yExpanded = !!yoginiExpanded[yKey];
            const subs = yExpanded ? computeYoginiSubs(yd.lord, yd.start, yd.end) : [];

            return (
              <DashaRow
                key={yKey} level={1} lord={yd.lord} start={yd.start} end={yd.end}
                startTs={yd.startTs} endTs={yd.endTs}
                isCurrent={isInPeriod(yd.startTs, yd.endTs)}
                isExpandable
                isExpanded={yExpanded}
                onClick={() => toggleYoginiExpand(yKey)}>

                {yExpanded && subs.map((sub, sIdx) => {
                  const sKey = `${yKey}.S${sIdx}`;
                  const sExpanded = !!yoginiExpanded[sKey];
                  const subSubs = sExpanded ? computeYoginiSubs(sub.lord, sub.start, sub.end) : [];

                  return (
                    <DashaRow
                      key={sKey} level={2} lord={sub.lord} start={sub.start} end={sub.end}
                      startTs={sub.startTs} endTs={sub.endTs}
                      isCurrent={isInPeriod(sub.startTs, sub.endTs)}
                      isExpandable
                      isExpanded={sExpanded}
                      onClick={() => toggleYoginiExpand(sKey)}>

                      {sExpanded && subSubs.map((ss, ssIdx) => {
                        const ssKey = `${sKey}.T${ssIdx}`;
                        const ssExpanded = !!yoginiExpanded[ssKey];
                        const leaves = ssExpanded ? computeYoginiSubs(ss.lord, ss.start, ss.end) : [];

                        return (
                          <DashaRow
                            key={ssKey} level={3} lord={ss.lord} start={ss.start} end={ss.end}
                            startTs={ss.startTs} endTs={ss.endTs}
                            isCurrent={isInPeriod(ss.startTs, ss.endTs)}
                            isExpandable
                            isExpanded={ssExpanded}
                            onClick={() => toggleYoginiExpand(ssKey)}>

                            {ssExpanded && leaves.map((lf, lIdx) => (
                              <DashaRow
                                key={`${ssKey}.L${lIdx}`} level={4} lord={lf.lord} start={lf.start} end={lf.end}
                                startTs={lf.startTs} endTs={lf.endTs}
                                isCurrent={isInPeriod(lf.startTs, lf.endTs)}
                                isExpandable={false}
                              />
                            ))}
                          </DashaRow>
                        );
                      })}
                    </DashaRow>
                  );
                })}
              </DashaRow>
            );
          })}
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
          💡 Yogini list API se aati hai. Sub-periods Yogini proportional formula se calculate hote hain (1+2+3+4+5+6+7+8 = 36 years cycle).
        </p>
      </div>
    );
  };

  // =============================================================
  // Phase 6 — Ashtakvarga tab (Sarvashtakavarga + 8 binnashtakvarga)
  // =============================================================
  const ASHTAK_VIEWS = ['Sav', 'Ascendant', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const ASHTAK_LABEL = {
    Sav: '🌟 Sarvashtakavarga',
    Ascendant: '🔱 Ascendant', Sun: '☉ Sun', Moon: '☽ Moon', Mars: '♂ Mars',
    Mercury: '☿ Mercury', Jupiter: '♃ Jupiter', Venus: '♀ Venus', Saturn: '♄ Saturn',
  };

  // Pull a 12-house numeric array from any-shape ashtakvarga response (used for binnas)
  const extractHouseArray = (data) => {
    if (!data) return null;
    if (Array.isArray(data)) return data.length === 12 ? data : null;
    if (typeof data === 'object') {
      // For Sav: data has ashtakvarga_total = 12 totals. For binna: ashtakvarga_points may be 12-array.
      const candidates = ['ashtakvarga_total', 'house_chart', 'points', 'values', 'total', 'sav_values', 'binna_values'];
      for (const k of candidates) {
        const v = data[k];
        if (Array.isArray(v) && v.length === 12) return v;
        if (v && typeof v === 'object') {
          const arr = Object.values(v);
          if (arr.length === 12 && arr.every(x => x !== undefined)) return arr;
        }
      }
      // ashtakvarga_points for binna might be 12-array; for sav it's 12×7 matrix — only use if 1D
      if (Array.isArray(data.ashtakvarga_points) && data.ashtakvarga_points.length === 12) {
        if (!Array.isArray(data.ashtakvarga_points[0])) return data.ashtakvarga_points;
      }
      // Object with numeric keys 1-12
      const houses = [];
      for (let i = 1; i <= 12; i++) {
        if (data[i] !== undefined) houses.push(data[i]);
        else if (data[String(i)] !== undefined) houses.push(data[String(i)]);
      }
      if (houses.length === 12) return houses;
    }
    return null;
  };

  // Extract full Sarvashtakavarga matrix from API response.
  // Actual VedicAstroAPI shape (verified):
  //   ashtakvarga_order = [8 planet names incl Ascendant]
  //   ashtakvarga_points = [8 rows × 12 houses] — each row is one planet's contribution
  //   ashtakvarga_total = [12 house totals] — sum of 7 planets per house (Asc EXCLUDED)
  const extractSavMatrix = (data) => {
    if (!data || typeof data !== 'object') return null;
    const planets = data.ashtakvarga_order || data.planets;
    const points = data.ashtakvarga_points || data.points;
    const houseTotals = data.ashtakvarga_total || data.totals || data.house_totals;
    if (!Array.isArray(planets) || !Array.isArray(points) || !Array.isArray(houseTotals)) return null;
    if (points.length !== planets.length) return null;
    if (!Array.isArray(points[0]) || points[0].length !== 12) return null;
    if (houseTotals.length !== 12) return null;
    return { planets, points, houseTotals };
  };

  // Sarvashtakavarga full matrix table — rows = 8 planets, columns = 12 houses + per-planet sum.
  // Last row = per-house total (sum of 7 planets, Ascendant excluded — gives 337 grand total).
  const renderSavMatrixTable = (data) => {
    const matrix = extractSavMatrix(data);
    if (!matrix) {
      return (
        <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a' }}>
          <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0, marginBottom: 6 }}>Sav matrix format unrecognized:</p>
          <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 160, margin: 0 }}>
            {JSON.stringify(data, null, 2).substring(0, 400)}
          </pre>
        </div>
      );
    }
    const grandTotal = matrix.houseTotals.reduce((s, n) => s + (parseInt(n) || 0), 0);
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: 580 }}>
          <thead>
            <tr style={{ background: '#7c3aed', color: '#fff' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700 }}>Planet \ House</th>
              {Array.from({ length: 12 }, (_, i) => (
                <th key={i} style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700, minWidth: 28 }}>H{i + 1}</th>
              ))}
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Sum</th>
            </tr>
          </thead>
          <tbody>
            {matrix.planets.map((planet, i) => {
              const row = matrix.points[i] || [];
              const planetSum = row.reduce((s, n) => s + (parseInt(n) || 0), 0);
              const isAsc = planet === 'Ascendant';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f0e6ff', background: isAsc ? '#fef3c7' : (i % 2 ? '#faf7ff' : '#fff') }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1a0533' }}>
                    <span style={{ marginRight: 4 }}>{PLANET_GLYPH[planet] || '•'}</span>
                    {planet}
                  </td>
                  {row.map((val, j) => {
                    const n = parseInt(val) || 0;
                    const intensity = Math.min(1, n / 8);
                    const cellBg = `rgba(124, 58, 237, ${0.04 + intensity * 0.18})`;
                    return (
                      <td key={j} style={{ padding: '8px 4px', textAlign: 'center', color: '#374151', fontVariantNumeric: 'tabular-nums', background: cellBg }}>{val}</td>
                    );
                  })}
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#1a0533', background: '#f3e8ff', fontVariantNumeric: 'tabular-nums' }}>{planetSum}</td>
                </tr>
              );
            })}
            <tr style={{ background: '#5b21b6', color: '#fff' }}>
              <td style={{ padding: '10px', fontWeight: 700 }}>House Total (Sav)</td>
              {matrix.houseTotals.map((t, i) => {
                const n = parseInt(t) || 0;
                return <td key={i} style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{n}</td>;
              })}
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{grandTotal}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
          🔒 Bottom row "House Total" = sum of 7 planets only (Ascendant excluded) — gives standard 337 grand total
        </p>
      </div>
    );
  };

  const renderAshtakHouseTable = (data, isSav) => {
    const houses = extractHouseArray(data);
    if (!houses) {
      return (
        <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a' }}>
          <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0, marginBottom: 6 }}>House values format unrecognized:</p>
          <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 160, margin: 0 }}>
            {JSON.stringify(data, null, 2).substring(0, 400)}
          </pre>
        </div>
      );
    }
    const total = houses.reduce((s, n) => s + (parseInt(n) || 0), 0);
    const max = isSav ? 56 : 8; // sav max per house = 56, binna max = 8
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 8 }}>
          {houses.map((val, i) => {
            const n = parseInt(val) || 0;
            const intensity = Math.min(1, n / max);
            const bg = `rgba(124, 58, 237, ${0.08 + intensity * 0.32})`;
            return (
              <div key={i} style={{ background: bg, padding: '10px 6px', borderRadius: 8, textAlign: 'center', border: '1px solid #e0d4f5' }}>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>House {i + 1}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a0533', fontVariantNumeric: 'tabular-nums' }}>{n}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6b7280', padding: '8px 4px', borderTop: '1px dashed #e0d4f5' }}>
          <span>Total: <strong style={{ color: '#1a0533' }}>{total}</strong></span>
          <span>Max possible: <strong style={{ color: '#1a0533' }}>{max * 12}</strong></span>
        </div>
      </div>
    );
  };

  const renderAshtakvargaTab = () => {
    if (!ashtakvarga && !ashtakvargaLoading && kundaliRecord?.id) {
      fetchAshtakvarga(kundaliRecord.id, ashtakvargaStyle);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading ashtakvarga (9 charts + 9 tables)...</div>;
    }
    if (ashtakvargaLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading ashtakvarga...</div>;
    if (!ashtakvarga) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Ashtakvarga data unavailable</p>;

    const isSav = ashtakvargaView === 'Sav';
    const current = isSav ? ashtakvarga.sav : ashtakvarga.binnas?.[ashtakvargaView];

    return (
      <div>
        {/* Style toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>Chart Style:</span>
          {['north', 'south', 'east'].map(s => (
            <button key={s} type="button" onClick={() => onChangeAshtakvargaStyle(s)}
              style={{
                padding: '6px 12px',
                border: ashtakvargaStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                background: ashtakvargaStyle === s ? '#7c3aed' : '#fff',
                color: ashtakvargaStyle === s ? '#fff' : '#1a0533',
                borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Sub-tab pills (Sav + 8 planets) */}
        <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
            {ASHTAK_VIEWS.map(v => {
              const active = ashtakvargaView === v;
              return (
                <button key={v} type="button" onClick={() => setAshtakvargaView(v)}
                  style={{
                    padding: '7px 14px',
                    border: active ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                    background: active ? '#7c3aed' : '#fff',
                    color: active ? '#fff' : '#1a0533',
                    borderRadius: 50, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                  {ASHTAK_LABEL[v]}
                </button>
              );
            })}
          </div>
        </div>

        {/* SAV VIEW — full matrix table only (VedicAstroAPI doesn't provide Sav chart) */}
        {isSav ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #7c3aed', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#7c3aed', margin: 0, fontSize: '1rem', fontWeight: 700 }}>🌟 Sarvashtakavarga Full Table</h4>
              <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.75rem' }}>
                8 planets × 12 houses with each planet's point contribution · per-planet sum on right · house total bottom row
              </p>
            </div>
            {renderSavMatrixTable(current?.data)}
          </div>
        ) : (
          /* BINNA VIEW — chart + per-house breakdown side-by-side */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #7c3aed', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <h4 style={{ color: '#7c3aed', margin: 0, fontSize: '1rem', fontWeight: 700 }}>{ASHTAK_LABEL[ashtakvargaView]} — Chart</h4>
                <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.75rem' }}>
                  {ashtakvargaView}'s point contribution to each house · numbers shown in cells
                </p>
              </div>
              {renderSvgChart(current?.chart, { maxWidth: 360 })}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #ec4899', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <h4 style={{ color: '#ec4899', margin: 0, fontSize: '1rem', fontWeight: 700 }}>{ASHTAK_LABEL[ashtakvargaView]} — House Points (Easy Read)</h4>
                <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.75rem' }}>
                  Same numbers as chart, in clean grid form · Max 8 per house · Max total 48
                </p>
              </div>
              {renderAshtakHouseTable(current?.data, isSav)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, padding: 12, background: '#faf5ff', borderRadius: 8, border: '1px solid #e0d4f5' }}>
          <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
            <strong>💡 Ashtakvarga points kya hain?</strong> Har planet apne 8 source points (khud + 7 planets + ascendant) se har ghar ko strength deta hai (0-8). Higher = ghar zyada strong. Sav (combined) max 56/house, individual binna max 8/house.
            Yeh same numbers chart ke ander cells mein bhi print hote hain — table sirf easy reading ke liye hai.
          </p>
        </div>

        {/* Debug — show raw current view data */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Show raw API data for {ASHTAK_LABEL[ashtakvargaView]} (debug)</summary>
          <pre style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a', fontSize: '0.7rem', overflowX: 'auto', maxHeight: 320, marginTop: 8 }}>
            {JSON.stringify({
              data: current?.data,
              chart_preview: typeof current?.chart === 'string' ? current.chart.substring(0, 500) : current?.chart,
              chart_type: typeof current?.chart,
              chart_length: typeof current?.chart === 'string' ? current.chart.length : null,
            }, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  // =============================================================
  // Phase 9 — KP System tab (Bhav Chalit + KP Planets + KP Cusps + Ruling Planets)
  // =============================================================
  const renderKpTab = () => {
    if (!kpData && !kpLoading && kundaliRecord?.id) {
      fetchKpFull(kundaliRecord.id, kpStyle);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading KP system data...</div>;
    }
    if (kpLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading KP system data...</div>;
    if (!kpData) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>KP data unavailable</p>;

    // Normalize KP planets/cusps response into uniform array
    const normalizeKpRows = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'object') return Object.values(raw);
      return [];
    };

    const kpPlanets = normalizeKpRows(kpData.kpPlanets).filter(p => p && typeof p === 'object');
    const kpCusps = normalizeKpRows(kpData.kpCusps).filter(c => c && typeof c === 'object');

    // Picker — try multiple field names per row
    const get = (row, ...fields) => {
      for (const f of fields) {
        const v = row?.[f];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return null;
    };

    const planetWithGlyph = (name) => {
      if (!name) return '-';
      const glyph = PLANET_GLYPH[name];
      return glyph ? `${glyph} ${name}` : name;
    };

    // Derive Birth Ruling Planets from kpPlanets data (since /ruling-planets API returns null)
    // Per KP system: Lagna's sign/star/sub lord + Moon's sign/star/sub lord + day lord at birth
    const findPlanetRow = (...names) => {
      for (const n of names) {
        const found = kpPlanets.find(p => p.name === n || p.full_name === n);
        if (found) return found;
      }
      return null;
    };
    const ascRow = findPlanetRow('As', 'Ascendant');
    const moonRow = findPlanetRow('Mo', 'Moon');
    const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const birthDate = kundaliRecord?.birthDate;
    const dayLord = birthDate ? WEEKDAY_LORDS[new Date(birthDate).getDay()] : null;

    return (
      <div>
        {/* Style toggle for Chalit chart */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ alignSelf: 'center', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>Chart Style:</span>
          {['north', 'south', 'east'].map(s => (
            <button key={s} type="button" onClick={() => onChangeKpStyle(s)}
              style={{
                padding: '6px 12px',
                border: kpStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                background: kpStyle === s ? '#7c3aed' : '#fff',
                color: kpStyle === s ? '#fff' : '#1a0533',
                borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Chalit Chart + Ruling Planets side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 }}>
          {/* Chalit Chart */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #7c3aed', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#7c3aed', margin: 0, fontSize: '1rem', fontWeight: 700 }}>📜 Bhav Chalit Chart</h4>
              <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>House cusps & bhav placement (KP system)</p>
            </div>
            {renderSvgChart(kpData.chalitChart, { maxWidth: 360 })}
          </div>

          {/* Birth Ruling Planets — derived from kpPlanets (Asc + Moon rows + birth weekday) */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #ec4899', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#ec4899', margin: 0, fontSize: '1rem', fontWeight: 700 }}>👑 Birth Ruling Planets</h4>
              <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>Lagna + Moon ke sign/star/sub lords aur birth weekday lord</p>
            </div>
            {(() => {
              const pairs = [
                ['Day Lord (Vaar)', dayLord],
                ['Lagna Sign Lord', get(ascRow, 'pseudo_rasi_lord') || SIGN_LORDS[get(ascRow, 'zodiac')]],
                ['Lagna Star Lord', get(ascRow, 'pseudo_nakshatra_lord')],
                ['Lagna Sub Lord', get(ascRow, 'sub_lord')],
                ['Lagna Sub-Sub Lord', get(ascRow, 'sub_sub_lord')],
                ['Moon Sign Lord', get(moonRow, 'pseudo_rasi_lord') || SIGN_LORDS[get(moonRow, 'zodiac')]],
                ['Moon Star Lord', get(moonRow, 'pseudo_nakshatra_lord')],
                ['Moon Sub Lord', get(moonRow, 'sub_lord')],
                ['Moon Sub-Sub Lord', get(moonRow, 'sub_sub_lord')],
              ].filter(([, v]) => v);

              if (!pairs.length) {
                return <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.85rem' }}>No data — Asc & Moon rows missing in KP planets</p>;
              }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                  {pairs.map(([k, v], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 6, background: i % 2 ? '#faf7ff' : '#fff', border: '1px solid #f0e6ff' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>{k}</span>
                      <span style={{ color: '#1a0533', fontWeight: 600, fontSize: '0.82rem' }}>{planetWithGlyph(v)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* KP Planets table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #0ea5e9', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 16 }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#0ea5e9', margin: 0, fontSize: '1rem', fontWeight: 700 }}>🪐 KP Planets Table</h4>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>Each planet's KP placement: sign, sign lord, star lord (nakshatra owner), sub lord</p>
          </div>
          {kpPlanets.length === 0 ? (
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, border: '1px solid #fde68a' }}>
              <p style={{ color: '#92400e', fontSize: '0.75rem', margin: 0, marginBottom: 6 }}>KP planets data unavailable. Raw:</p>
              <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 200, margin: 0 }}>
                {JSON.stringify(kpData.kpPlanets, null, 2).substring(0, 500)}
              </pre>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#0ea5e9', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Planet</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sign</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sign Lord</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Star Lord</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sub Lord</th>
                  </tr>
                </thead>
                <tbody>
                  {kpPlanets.map((p, i) => {
                    const name = get(p, 'full_name', 'planet', 'name');
                    const sign = get(p, 'zodiac', 'pseudo_rasi', 'sign', 'rashi');
                    const signLord = get(p, 'pseudo_rasi_lord', 'sign_lord', 'rashi_lord') || SIGN_LORDS[sign];
                    const starLord = get(p, 'pseudo_nakshatra_lord', 'star_lord', 'nakshatra_lord');
                    const subLord = get(p, 'sub_lord', 'subLord', 'sub');
                    const isAsc = name === 'Ascendant' || name === 'As';
                    return (
                      <tr key={i} style={{ background: isAsc ? '#fef3c7' : (i % 2 ? '#faf7ff' : '#fff'), borderBottom: '1px solid #f0e6ff' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a0533' }}>{planetWithGlyph(name)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{sign || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(signLord)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(starLord)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(subLord)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* KP Cusps (Houses) table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #10b981', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#10b981', margin: 0, fontSize: '1rem', fontWeight: 700 }}>🏛️ KP Cusps (Houses) Table</h4>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>12 cusps with degree, sign, sign lord, star lord, sub lord — central to KP analysis</p>
          </div>
          {kpCusps.length === 0 ? (
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, border: '1px solid #fde68a' }}>
              <p style={{ color: '#92400e', fontSize: '0.75rem', margin: 0, marginBottom: 6 }}>KP cusps data unavailable. Raw:</p>
              <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 200, margin: 0 }}>
                {JSON.stringify(kpData.kpCusps, null, 2).substring(0, 500)}
              </pre>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#10b981', color: '#fff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Cusp</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Degree</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sign</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sign Lord</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Star Lord</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Sub Lord</th>
                  </tr>
                </thead>
                <tbody>
                  {kpCusps.map((c, i) => {
                    const cuspNum = get(c, 'house', 'cusp', 'house_no', 'house_number') || (i + 1);
                    // bhavmadhya = mid-cusp, more KP-accurate than start. Fall back to start.
                    const deg = get(c, 'bhavmadhya', 'local_start_degree', 'degree', 'local_degree', 'cusp_degree');
                    const sign = get(c, 'start_rasi', 'zodiac', 'sign', 'rashi');
                    const signLord = get(c, 'start_rasi_lord', 'sign_lord', 'rashi_lord') || SIGN_LORDS[sign];
                    const starLord = get(c, 'start_nakshatra_lord', 'star_lord', 'nakshatra_lord');
                    const subLord = get(c, 'cusp_sub_lord', 'sub_lord', 'sub');
                    return (
                      <tr key={i} style={{ background: i % 2 ? '#f0fdf4' : '#fff', borderBottom: '1px solid #d1fae5' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#10b981' }}>H{cuspNum}</td>
                        <td style={{ padding: '8px 12px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{fmtDeg(deg)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{sign || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(signLord)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(starLord)}</td>
                        <td style={{ padding: '8px 12px', color: '#374151' }}>{planetWithGlyph(subLord)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 KP (Krishnamurti Paddhati) system — sub-lord based predictions. Cusps ka sub-lord most important hai for event timing. Ruling planets se horary questions answer hote hain.
        </p>

        {/* Debug — show raw API responses to identify field names */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Show raw API data (debug — for fixing field names)</summary>
          <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a', marginTop: 8 }}>
            <p style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, margin: '0 0 6px' }}>kpPlanets (first row only):</p>
            <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 180, margin: '0 0 12px' }}>
              {JSON.stringify(Array.isArray(kpData.kpPlanets) ? kpData.kpPlanets[0] : (typeof kpData.kpPlanets === 'object' ? Object.values(kpData.kpPlanets || {})[0] : kpData.kpPlanets), null, 2)}
            </pre>
            <p style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, margin: '0 0 6px' }}>kpCusps (first row only):</p>
            <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 180, margin: '0 0 12px' }}>
              {JSON.stringify(Array.isArray(kpData.kpCusps) ? kpData.kpCusps[0] : (typeof kpData.kpCusps === 'object' ? Object.values(kpData.kpCusps || {})[0] : kpData.kpCusps), null, 2)}
            </pre>
            <p style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 700, margin: '0 0 6px' }}>rulingPlanets:</p>
            <pre style={{ fontSize: '0.7rem', background: '#fff', padding: 8, borderRadius: 4, overflowX: 'auto', maxHeight: 200, margin: 0 }}>
              {JSON.stringify(kpData.rulingPlanets, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    );
  };

  // =============================================================
  // Phase 12 — Bhav Bala tab (House strength for 12 houses)
  // VedicAstroAPI returns inverted: { bhavadhipathi_bala: { 1: 250, 2: 180, ... }, ... }
  // 60 virupas = 1 Rupa. Required ~5 Rupas (300 virupas) per house for full results.
  // =============================================================
  const BHAVBALA_COMPONENTS = [
    { id: 'bhavadhipathi', label: 'Bhavadhipathi (Lord Strength)', keys: ['bhavadhipathi_bala', 'bhava_adhipati_bala', 'bhavaadhipathi_bala', 'lord_bala'] },
    { id: 'digbala',       label: 'Bhava Dig (Directional)',       keys: ['bhava_digbala', 'bhava_dig_bala', 'bhavadig_bala', 'dig_bala'] },
    { id: 'drishti',       label: 'Bhava Drishti (Aspectual)',     keys: ['bhava_drishti_bala', 'bhava_drik_bala', 'drishti_bala', 'drik_bala'] },
  ];

  const renderBhavBalaTab = () => {
    if (!bhavBala && !bhavBalaLoading && kundaliRecord?.id) {
      fetchBhavBala(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading bhav bala...</div>;
    }
    if (bhavBalaLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading bhav bala...</div>;
    if (!bhavBala || (typeof bhavBala === 'object' && Object.keys(bhavBala).length === 0)) {
      return (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderLeft: '4px solid #f59e0b', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>ℹ️</div>
            <h4 style={{ color: '#92400e', margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700 }}>
              Bhav Bala — VedicAstroAPI Plan Mein Available Nahi
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>
              Aapki current "Vedic Complete Plan" mein <strong>Bhav Bala</strong> ka dedicated endpoint nahi hai. Backend ne 10 alternate paths try kiye, koi response nahi mila.
              <br /><br />
              <strong>Workaround:</strong> Bhav Bala calculate karne ke liye <strong>house lord ka Shadbala</strong> + house's directional strength se manually derive kar sakte ho. Most professional astrologers Shadbala (planet strength) se hi bhav strength infer karte hain.
              <br /><br />
              Suggestion: Astrologer experts ko Shadbala tab pe direct karein — wahan se planet (= house lord) ki strength se house ki strength deduce kar sakte hain.
            </p>
          </div>
          <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #f0e6ff' }}>
            <strong style={{ color: '#7c3aed', fontSize: '0.85rem', display: 'block', marginBottom: 8 }}>📋 House Lord Quick Reference</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, fontSize: '0.78rem' }}>
              {[
                ['H1 (Self)', 'See Lagna sign lord in ⚖️ Shada Bala'],
                ['H2 (Wealth)', '2nd sign lord from Lagna'],
                ['H3 (Siblings)', '3rd sign lord from Lagna'],
                ['H4 (Mother)', '4th sign lord from Lagna'],
                ['H5 (Children)', '5th sign lord from Lagna'],
                ['H6 (Disease)', '6th sign lord from Lagna'],
                ['H7 (Spouse)', '7th sign lord from Lagna'],
                ['H8 (Longevity)', '8th sign lord from Lagna'],
                ['H9 (Fortune)', '9th sign lord from Lagna'],
                ['H10 (Career)', '10th sign lord from Lagna'],
                ['H11 (Gains)', '11th sign lord from Lagna'],
                ['H12 (Loss)', '12th sign lord from Lagna'],
              ].map(([k, v], i) => (
                <div key={i} style={{ padding: '6px 10px', background: i % 2 ? '#faf7ff' : '#fff', border: '1px solid #f0e6ff', borderRadius: 6 }}>
                  <strong style={{ color: '#7c3aed' }}>{k}:</strong>{' '}
                  <span style={{ color: '#6b7280' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Get a house's value for a component (in virupas)
    const getComp = (house, comp) => {
      for (const k of comp.keys) {
        const obj = bhavBala[k];
        if (obj && typeof obj === 'object') {
          const v = obj[house] !== undefined ? obj[house] : obj[String(house)];
          if (v !== undefined && v !== null) {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : null;
          }
        }
      }
      return null;
    };

    // Total Bhav Bala for a house in Rupas
    const getTotalRupas = (house) => {
      // Try direct totals first
      const directKeys = ['total_bhava_bala', 'total_bhavabala', 'bhava_bala_total', 'total'];
      for (const k of directKeys) {
        const obj = bhavBala[k];
        if (obj && typeof obj === 'object') {
          const v = obj[house] !== undefined ? obj[house] : obj[String(house)];
          if (v !== undefined && v !== null) {
            const n = parseFloat(v);
            if (Number.isFinite(n)) return n / 60;
          }
        }
      }
      // Compute by summing components
      let sumVirupas = 0;
      let count = 0;
      for (const c of BHAVBALA_COMPONENTS) {
        const v = getComp(house, c);
        if (v !== null) { sumVirupas += v; count++; }
      }
      if (count === 0) return null;
      return sumVirupas / 60;
    };

    const HOUSE_THEMES = {
      1: 'Self / Body', 2: 'Wealth / Family', 3: 'Siblings / Courage', 4: 'Mother / Home',
      5: 'Children / Intellect', 6: 'Enemies / Disease', 7: 'Spouse / Partnership',
      8: 'Longevity / Mysteries', 9: 'Fortune / Father', 10: 'Career / Status',
      11: 'Gains / Friends', 12: 'Loss / Liberation',
    };
    const REQUIRED_RUPAS = 5; // standard threshold ~5 Rupas (300 virupas)
    const houses = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#1a0533', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>🏛️ Bhav Bala — House Strength</h4>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>
            Strength of each of 12 houses. Total ≥ <strong>{REQUIRED_RUPAS} Rupas</strong> = strong house (delivers full results in life area).
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 18, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 680 }}>
            <thead>
              <tr style={{ background: '#7c3aed', color: '#fff' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>House</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Theme</th>
                {BHAVBALA_COMPONENTS.map(c => (
                  <th key={c.id} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{c.label}<br /><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(virupas)</span></th>
                ))}
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Total<br /><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(Rupas)</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {houses.map((h, i) => {
                const total = getTotalRupas(h);
                const isStrong = total !== null && total >= REQUIRED_RUPAS;
                const fmt = (v, decimals = 2) => v === null || v === undefined ? '-' : (typeof v === 'number' ? v.toFixed(decimals) : String(v));
                return (
                  <tr key={h} style={{ background: i % 2 ? '#faf7ff' : '#fff', borderBottom: '1px solid #f0e6ff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#7c3aed' }}>H{h}</td>
                    <td style={{ padding: '8px 12px', color: '#374151', fontSize: '0.78rem' }}>{HOUSE_THEMES[h]}</td>
                    {BHAVBALA_COMPONENTS.map(c => (
                      <td key={c.id} style={{ padding: '8px 6px', textAlign: 'center', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(getComp(h, c))}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(total)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {total === null ? <span style={{ color: '#9ca3af' }}>-</span> : (
                        <span style={{
                          padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                          background: isStrong ? '#dcfce7' : '#fee2e2',
                          color: isStrong ? '#166534' : '#b91c1c',
                        }}>
                          {isStrong ? '✓ Strong' : '⚠ Weak'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#faf5ff', padding: 12, borderRadius: 8, border: '1px solid #e0d4f5' }}>
          <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>
            <strong>💡 Bhav Bala kya hai?</strong> 12 houses ki individual strength.
            <br />
            <strong>Bhavadhipathi</strong> = house ka lord planet kitna strong hai.
            <strong> Bhava Dig</strong> = house ka directional strength.
            <strong> Bhava Drishti</strong> = house ko kaunse beneficial/malefic aspects mil rahe hain.
            <br /><br />
            Total ≥ 5 Rupas = ghar strong hai (us life area mein achhe results milenge). Below = ghar weak — extra remedies/effort lagega.
          </p>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Show raw API data (debug)</summary>
          <pre style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a', fontSize: '0.7rem', overflowX: 'auto', maxHeight: 320, marginTop: 8 }}>
            {JSON.stringify(bhavBala, null, 2).substring(0, 1500)}
          </pre>
        </details>
      </div>
    );
  };

  // =============================================================
  // Phase 13 — Manglik tab (final)
  // =============================================================
  const renderManglikTab = () => {
    if (!manglik && !manglikLoading && kundaliRecord?.id) {
      fetchManglik(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading manglik analysis...</div>;
    }
    if (manglikLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading manglik analysis...</div>;
    if (!manglik) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Manglik data unavailable</p>;

    const get = (...fields) => {
      for (const f of fields) {
        const v = manglik[f];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return null;
    };

    // Detect manglik status
    const isManglik =
      manglik.is_present === true || manglik.is_present === 'true' ||
      manglik.manglik_present_rule?.is_present === true ||
      manglik.is_manglik === true || manglik.manglik === true;

    const status = get('manglik_status', 'status', 'bot_response');
    const percentage = get('percentage_manglik_present', 'manglik_percent', 'manglik_percentage');
    const presentRules = manglik.manglik_present_rule?.based_on_rules || manglik.manglik_present_rule?.rules || manglik.present_rules || [];
    const cancelRules = manglik.manglik_cancel_rule?.based_on_rules || manglik.manglik_cancel_rule?.rules || manglik.cancel_rules || [];
    const description = get('description', 'desc');
    const remedies = get('remedies', 'remedy_list');
    const remediesArr = Array.isArray(remedies) ? remedies : (typeof remedies === 'object' && remedies ? Object.values(remedies) : []);
    const conclusion = get('conclusion', 'final_verdict');

    const statusColor = isManglik ? '#dc2626' : '#10b981';
    const statusBg = isManglik ? '#fee2e2' : '#dcfce7';

    return (
      <div>
        {/* Status Banner */}
        <div style={{ background: statusBg, borderRadius: 14, padding: 28, marginBottom: 20, textAlign: 'center', border: `2px solid ${statusColor}` }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{isManglik ? '🔥' : '✅'}</div>
          <h3 style={{ margin: 0, color: statusColor, fontSize: '1.5rem', fontWeight: 700 }}>
            {isManglik ? 'You are Manglik' : 'You are NOT Manglik'}
          </h3>
          {percentage !== null && (
            <p style={{ margin: '10px 0 0', color: statusColor, fontSize: '1.05rem', fontWeight: 600 }}>
              Intensity: <strong>{percentage}{typeof percentage === 'number' ? '%' : ''}</strong>
            </p>
          )}
          {status && typeof status === 'string' && status.length < 200 && (
            <p style={{ margin: '8px 0 0', color: statusColor, fontSize: '0.9rem', fontWeight: 500 }}>{status}</p>
          )}
        </div>

        {/* Two-column: Present rules + Cancel rules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
          {presentRules.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #fecaca', borderTop: '4px solid #dc2626' }}>
              <h4 style={{ color: '#dc2626', margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>⚠ Manglik Present Reasons</h4>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                {presentRules.map((r, i) => (
                  <li key={i} style={{ color: '#7f1d1d', fontSize: '0.85rem', marginBottom: 6 }}>
                    {typeof r === 'string' ? r : (r?.description || r?.rule || r?.reason || JSON.stringify(r))}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cancelRules.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #bbf7d0', borderTop: '4px solid #166534' }}>
              <h4 style={{ color: '#166534', margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>✓ Cancellation Reasons</h4>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                {cancelRules.map((r, i) => (
                  <li key={i} style={{ color: '#14532d', fontSize: '0.85rem', marginBottom: 6 }}>
                    {typeof r === 'string' ? r : (r?.description || r?.rule || r?.reason || JSON.stringify(r))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Bot response / Description */}
        {(status || description) && status?.length >= 200 && (
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderLeft: '4px solid #7c3aed', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
            <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 8 }}>📜 Detailed Analysis</strong>
            {status && status.length >= 200 && <p style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 8px' }}>{status}</p>}
            {description && <p style={{ color: '#374151', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{description}</p>}
          </div>
        )}

        {/* Conclusion */}
        {conclusion && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e0d4f5', borderTop: '4px solid #7c3aed', marginBottom: 20 }}>
            <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 8, fontSize: '0.95rem' }}>🎯 Conclusion</strong>
            <p style={{ color: '#374151', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{typeof conclusion === 'string' ? conclusion : JSON.stringify(conclusion)}</p>
          </div>
        )}

        {/* Remedies */}
        {remediesArr.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #10b981', padding: 16, marginBottom: 20 }}>
            <h4 style={{ color: '#10b981', margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>🙏 Remedies</h4>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
              {remediesArr.map((r, i) => (
                <li key={i} style={{ color: '#374151', fontSize: '0.88rem', marginBottom: 4 }}>
                  {typeof r === 'string' ? r : (r?.remedy || r?.description || r?.text || JSON.stringify(r))}
                </li>
              ))}
            </ol>
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 Manglik dosh = Mars in 1st, 4th, 7th, 8th, ya 12th house from Lagna/Moon/Venus. Marriage compatibility ke liye important. Bahut sare cancellations bhi hote hain — present reasons + cancel reasons dono read karein.
        </p>

        {/* Debug */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Show raw API data (debug)</summary>
          <pre style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a', fontSize: '0.7rem', overflowX: 'auto', maxHeight: 320, marginTop: 8 }}>
            {JSON.stringify(manglik, null, 2).substring(0, 1500)}
          </pre>
        </details>
      </div>
    );
  };

  // =============================================================
  // Phase 10 — Sade Sati tab
  // =============================================================
  const renderSadeSatiTab = () => {
    if (!sadeSati && !sadeSatiLoading && kundaliRecord?.id) {
      fetchSadeSati(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading Sade Sati analysis...</div>;
    }
    if (sadeSatiLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading Sade Sati analysis...</div>;
    if (!sadeSati) return <p style={{ color: '#9ca3af', textAlign: 'center', padding: 30 }}>Sade Sati data unavailable</p>;

    const get = (...fields) => {
      for (const f of fields) {
        const v = sadeSati[f];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return null;
    };

    const periodType = get('shani_period_type', 'period_type', 'phase');
    const isInSadeSati = periodType && !/none|not|no|nil/i.test(String(periodType));
    const saturnRetro = get('saturn_retrograde', 'retrograde');
    const age = get('age');
    const description = get('description', 'desc');
    const botResponse = get('bot_response', 'response');
    const remedies = get('remedies', 'remedy_list');
    const remediesArr = Array.isArray(remedies) ? remedies : (typeof remedies === 'object' && remedies ? Object.values(remedies) : []);
    const startDate = get('start_date', 'sade_sati_start_date', 'startDate');
    const endDate = get('end_date', 'sade_sati_end_date', 'endDate');
    const phases = get('phases', 'phase_list', 'sade_sati_phases');
    const phasesArr = Array.isArray(phases) ? phases : (typeof phases === 'object' && phases ? Object.values(phases) : []);

    // Status banner color based on currently in/out + phase intensity
    const statusColor = !isInSadeSati ? '#10b981' : (/peak|janma|moon/i.test(String(periodType)) ? '#dc2626' : '#f59e0b');
    const statusBg = !isInSadeSati ? '#dcfce7' : (/peak|janma|moon/i.test(String(periodType)) ? '#fee2e2' : '#fef3c7');

    return (
      <div>
        {/* Status Banner */}
        <div style={{ background: statusBg, borderRadius: 14, padding: 24, marginBottom: 20, textAlign: 'center', border: `2px solid ${statusColor}` }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>{!isInSadeSati ? '✅' : (/peak/i.test(String(periodType)) ? '🔥' : '⚠️')}</div>
          <h3 style={{ margin: 0, color: statusColor, fontSize: '1.4rem', fontWeight: 700 }}>
            {!isInSadeSati ? 'Not in Sade Sati' : `Currently in Sade Sati`}
          </h3>
          {isInSadeSati && periodType && (
            <p style={{ margin: '6px 0 0', color: statusColor, fontSize: '1rem', fontWeight: 600 }}>
              Phase: <strong>{periodType}</strong>
            </p>
          )}
        </div>

        {/* Quick info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          {age !== null && (
            <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #f0e6ff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Current Age</div>
              <div style={{ fontSize: '1.5rem', color: '#7c3aed', fontWeight: 700, marginTop: 4 }}>{age}</div>
            </div>
          )}
          {saturnRetro !== null && (
            <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #f0e6ff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Saturn Retrograde</div>
              <div style={{ fontSize: '1.1rem', color: saturnRetro === true || saturnRetro === 'true' || /yes/i.test(String(saturnRetro)) ? '#dc2626' : '#10b981', fontWeight: 700, marginTop: 4 }}>
                {saturnRetro === true || saturnRetro === 'true' || /yes/i.test(String(saturnRetro)) ? '♄ Yes' : 'No'}
              </div>
            </div>
          )}
          {startDate && (
            <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #f0e6ff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Start Date</div>
              <div style={{ fontSize: '1rem', color: '#1a0533', fontWeight: 700, marginTop: 4 }}>{startDate}</div>
            </div>
          )}
          {endDate && (
            <div style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #f0e6ff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>End Date</div>
              <div style={{ fontSize: '1rem', color: '#1a0533', fontWeight: 700, marginTop: 4 }}>{endDate}</div>
            </div>
          )}
        </div>

        {/* Sade Sati Phases Table — always show 3 phases (use API data if available, else compute) */}
        {(() => {
          // Saturn signs around Moon's natal sign
          const ZODIACS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
          const moonSign = get('moon_sign', 'janma_rashi') || (() => {
            // Try to derive from basicReport (Moon row's zodiac)
            if (basicReport) {
              const planets = Array.isArray(basicReport) ? basicReport : Object.values(basicReport);
              const moon = planets.find(p => p?.name === 'Mo' || p?.full_name === 'Moon');
              return moon?.zodiac;
            }
            return null;
          })();
          const moonIdx = ZODIACS.indexOf(moonSign);
          const risingSign = moonIdx >= 0 ? ZODIACS[(moonIdx + 11) % 12] : null; // 12th from Moon
          const peakSign = moonSign;
          const settingSign = moonIdx >= 0 ? ZODIACS[(moonIdx + 1) % 12] : null; // 2nd from Moon

          // Build phases — priority order:
          // 1. Real /sade-sati-table endpoint data (preferred)
          // 2. phasesArr from current-sade-sati response
          // 3. Estimated 3 equal periods from start/end dates
          let phases = [];
          // Source 1: dedicated /sade-sati-table endpoint (array of phase objects)
          const tableData = sadeSatiTable;
          let tableArr = [];
          if (Array.isArray(tableData)) tableArr = tableData;
          else if (tableData && typeof tableData === 'object') {
            // Could be nested: { phases: [...] } or { sade_sati_table: [...] } or numeric-keyed
            const candidates = ['phases', 'sade_sati_table', 'sadesati_table', 'table', 'data', 'list'];
            for (const k of candidates) {
              if (Array.isArray(tableData[k])) { tableArr = tableData[k]; break; }
            }
            if (!tableArr.length) {
              const vals = Object.values(tableData);
              if (vals.length && typeof vals[0] === 'object') tableArr = vals;
            }
          }

          if (tableArr.length > 0) {
            phases = tableArr.map(ph => ({
              type: ph?.type || ph?.phase || ph?.phase_type || ph?.shani_period_type || ph?.name || '-',
              sign: ph?.sign || ph?.zodiac || ph?.rashi || ph?.saturn_sign || '-',
              start: ph?.start_date || ph?.start || ph?.from || '-',
              end: ph?.end_date || ph?.end || ph?.to || '-',
            }));
          } else if (phasesArr.length > 0) {
            phases = phasesArr.map(ph => ({
              type: ph?.type || ph?.phase || ph?.shani_period_type || '-',
              sign: ph?.sign || ph?.zodiac || ph?.rashi || '-',
              start: ph?.start_date || ph?.start || '-',
              end: ph?.end_date || ph?.end || '-',
            }));
          } else if (startDate && endDate) {
            // Estimate 3 equal 2.5-year phases from full 7.5y window
            const sd = new Date(startDate);
            const ed = new Date(endDate);
            if (Number.isFinite(sd.getTime()) && Number.isFinite(ed.getTime())) {
              const span = ed.getTime() - sd.getTime();
              const oneThird = span / 3;
              const fmt = (ts) => new Date(ts).toISOString().split('T')[0];
              phases = [
                { type: 'Rising (Dhayya)', sign: risingSign || '-', start: fmt(sd.getTime()), end: fmt(sd.getTime() + oneThird) },
                { type: 'Peak (Janma)', sign: peakSign || '-', start: fmt(sd.getTime() + oneThird), end: fmt(sd.getTime() + 2 * oneThird) },
                { type: 'Setting (Dhayya)', sign: settingSign || '-', start: fmt(sd.getTime() + 2 * oneThird), end: fmt(ed.getTime()) },
              ];
            }
          } else {
            // Show structure even without dates
            phases = [
              { type: 'Rising (Dhayya)', sign: risingSign || '-', start: '-', end: '-' },
              { type: 'Peak (Janma)', sign: peakSign || '-', start: '-', end: '-' },
              { type: 'Setting (Dhayya)', sign: settingSign || '-', start: '-', end: '-' },
            ];
          }

          // Mark which phase is currently active based on periodType text
          const isCurrentPhase = (type) => {
            if (!periodType || !isInSadeSati) return false;
            const t = String(type).toLowerCase();
            const p = String(periodType).toLowerCase();
            if (p.includes('peak') || p.includes('janma') || p.includes('moon')) return t.includes('peak');
            if (p.includes('rising') || p.includes('start')) return t.includes('rising');
            if (p.includes('setting') || p.includes('descend') || p.includes('end')) return t.includes('setting');
            return false;
          };

          return (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #7c3aed', padding: 16, marginBottom: 20 }}>
              <h4 style={{ color: '#7c3aed', margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>📅 Sade Sati 7.5-Year Cycle</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 12px' }}>
                Saturn ka transit Moon ke 12th, 1st, aur 2nd ghar mein — total 3 phases × ~2.5 years = 7.5 years
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#7c3aed', color: '#fff' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Phase Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Saturn Sign</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Start</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>End</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phases.map((ph, i) => {
                      const current = isCurrentPhase(ph.type);
                      return (
                        <tr key={i} style={{ background: current ? '#fef3c7' : (i % 2 ? '#faf7ff' : '#fff'), borderBottom: '1px solid #f0e6ff' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: current ? '#92400e' : '#1a0533' }}>{ph.type}</td>
                          <td style={{ padding: '10px 12px', color: '#374151' }}>{ph.sign}</td>
                          <td style={{ padding: '10px 12px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{ph.start}</td>
                          <td style={{ padding: '10px 12px', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{ph.end}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {current ? (
                              <span style={{ background: '#10b981', color: '#fff', padding: '3px 10px', borderRadius: 50, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Current
                              </span>
                            ) : <span style={{ color: '#9ca3af' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {moonSign && (
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 8, fontStyle: 'italic' }}>
                  📍 Moon at birth: <strong>{moonSign}</strong> — Saturn passes through {risingSign} → {peakSign} → {settingSign} during the 7.5y cycle
                </p>
              )}
              {tableArr.length > 0 && (
                <p style={{ fontSize: '0.7rem', color: '#10b981', marginTop: 4, fontStyle: 'italic' }}>
                  ✓ Real data from /extended-horoscope/sade-sati-table endpoint
                </p>
              )}
              {tableArr.length === 0 && phasesArr.length === 0 && startDate && endDate && (
                <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
                  ⚙ Phase boundaries estimated by splitting 7.5y window into 3 equal periods
                </p>
              )}
            </div>
          );
        })()}

        {/* Description / bot response */}
        {(description || botResponse) && (
          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderLeft: '4px solid #7c3aed', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
            <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 8 }}>📜 Description</strong>
            {botResponse && <p style={{ color: '#374151', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 8px' }}>{botResponse}</p>}
            {description && <p style={{ color: '#374151', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>{description}</p>}
          </div>
        )}

        {/* Remedies */}
        {remediesArr.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #10b981', padding: 16, marginBottom: 20 }}>
            <h4 style={{ color: '#10b981', margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>🙏 Remedies</h4>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
              {remediesArr.map((r, i) => (
                <li key={i} style={{ color: '#374151', fontSize: '0.88rem', marginBottom: 4 }}>
                  {typeof r === 'string' ? r : (r?.remedy || r?.description || r?.text || JSON.stringify(r))}
                </li>
              ))}
            </ol>
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 Sade Sati = Shani (Saturn) ka 7.5 saal ka cycle Moon ke 12th, 1st, aur 2nd ghar mein. Three phases each ~2.5 years. Janma rashi (Moon's sign) sabse intense hota hai.
        </p>

        {/* Full API Response — always visible (both endpoints) */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #6366f1', padding: 16, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
            <h4 style={{ color: '#6366f1', margin: 0, fontSize: '1rem', fontWeight: 700 }}>📦 Full API Response</h4>
            <button
              type="button"
              onClick={() => {
                const json = JSON.stringify({ current_sade_sati: sadeSati, sade_sati_table: sadeSatiTable }, null, 2);
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(json).then(() => toast.success('Copied to clipboard!')).catch(() => toast.error('Copy failed'));
                }
              }}
              style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
              📋 Copy JSON
            </button>
          </div>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0 0 12px' }}>
            Complete VedicAstroAPI responses from both endpoints — untruncated
          </p>

          {/* current-sade-sati */}
          <div style={{ marginBottom: 14 }}>
            <strong style={{ color: '#7c3aed', fontSize: '0.82rem', display: 'block', marginBottom: 6 }}>
              🔵 /extended-horoscope/current-sade-sati
            </strong>
            <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 14, borderRadius: 8, fontSize: '0.72rem', overflowX: 'auto', overflowY: 'auto', maxHeight: 320, margin: 0, lineHeight: 1.5, fontFamily: "'SF Mono', Monaco, 'Courier New', monospace" }}>
              {JSON.stringify(sadeSati, null, 2)}
            </pre>
          </div>

          {/* sade-sati-table */}
          <div>
            <strong style={{ color: '#10b981', fontSize: '0.82rem', display: 'block', marginBottom: 6 }}>
              🟢 /extended-horoscope/sade-sati-table
            </strong>
            <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 14, borderRadius: 8, fontSize: '0.72rem', overflowX: 'auto', overflowY: 'auto', maxHeight: 400, margin: 0, lineHeight: 1.5, fontFamily: "'SF Mono', Monaco, 'Courier New', monospace" }}>
              {JSON.stringify(sadeSatiTable, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // =============================================================
  // Phase 11 — Shadbala tab (Six-fold planetary strength)
  // VedicAstroAPI returns data INVERTED: { component_key: { Sun: virupas, Moon: virupas, ... }, ... }
  // 60 virupas = 1 Rupa. Required values are in Rupas.
  // =============================================================
  const SHADBALA_REQUIRED = { Sun: 6.5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5 };
  const SHADBALA_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  // Each component → list of API keys to try (component-totals first, fallback to alternatives)
  const SHADBALA_COMPONENTS = [
    { id: 'sthana',     label: 'Sthana (Positional)',  keys: ['total_sthana_bala', 'sthana_bala'] },
    { id: 'dig',        label: 'Dig (Directional)',    keys: ['total_dig_bala', 'dig_bala', 'dik_bala'] },
    { id: 'kala',       label: 'Kala (Temporal)',      keys: ['total_kala_bala', 'kala_bala'] },
    { id: 'cheshta',    label: 'Cheshta (Motional)',   keys: ['total_cheshta_bala', 'cheshta_bala', 'chesta_bala'] },
    { id: 'naisargika', label: 'Naisargika (Natural)', keys: ['total_naisargika_bala', 'naisargika_bala'] },
    { id: 'drik',       label: 'Drik (Aspectual)',     keys: ['total_drik_bala', 'drik_bala', 'drig_bala'] },
  ];

  const renderShadbalaTab = () => {
    if (!shadbala && !shadbalaLoading && kundaliRecord?.id) {
      fetchShadbala(kundaliRecord.id);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading shadbala...</div>;
    }
    if (shadbalaLoading) return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading shadbala...</div>;
    if (!shadbala || (typeof shadbala === 'object' && Object.keys(shadbala).length === 0)) {
      return (
        <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
          <strong style={{ color: '#92400e' }}>Shadbala data unavailable.</strong>
        </div>
      );
    }

    // Get a planet's value for a component (in virupas)
    const getComp = (planet, comp) => {
      for (const k of comp.keys) {
        const obj = shadbala[k];
        if (obj && typeof obj === 'object' && obj[planet] !== undefined && obj[planet] !== null) {
          const n = parseFloat(obj[planet]);
          return Number.isFinite(n) ? n : null;
        }
      }
      return null;
    };

    // Total Shadbala for a planet in Rupas (sum of all 6 components / 60)
    const getTotalRupas = (planet) => {
      // First try if API directly gives totals
      const directKeys = ['total_shadbala_in_rupas', 'shadbala_in_rupas', 'total_rupas'];
      for (const k of directKeys) {
        const obj = shadbala[k];
        if (obj && typeof obj === 'object' && obj[planet] !== undefined) {
          const n = parseFloat(obj[planet]);
          if (Number.isFinite(n)) return n;
        }
      }
      // Compute by summing components and converting virupas → Rupas (÷ 60)
      let sumVirupas = 0;
      let count = 0;
      for (const c of SHADBALA_COMPONENTS) {
        const v = getComp(planet, c);
        if (v !== null) { sumVirupas += v; count++; }
      }
      if (count === 0) return null;
      return sumVirupas / 60;
    };

    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ color: '#1a0533', margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>⚖️ Shadbala — Six-fold Planetary Strength</h4>
          <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>
            Total strength of each planet measured in <strong>Rupas</strong>. Compared to minimum required → planet is Strong (above) or Weak (below).
          </p>
        </div>

        {/* Main Shadbala summary table — values in virupas (60 virupas = 1 Rupa) */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: 18, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#7c3aed', color: '#fff' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Planet</th>
                {SHADBALA_COMPONENTS.map(c => (
                  <th key={c.id} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700 }}>{c.label}<br /><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(virupas)</span></th>
                ))}
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Total<br /><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(Rupas)</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Required<br /><span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(Rupas)</span></th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, background: '#5b21b6' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {SHADBALA_PLANETS.map((planet, i) => {
                const total = getTotalRupas(planet);
                const required = SHADBALA_REQUIRED[planet];
                const isStrong = total !== null && required !== null && total >= required;
                const fmt = (v, decimals = 2) => v === null || v === undefined ? '-' : (typeof v === 'number' ? v.toFixed(decimals) : String(v));
                return (
                  <tr key={planet} style={{ background: i % 2 ? '#faf7ff' : '#fff', borderBottom: '1px solid #f0e6ff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1a0533' }}>
                      {PLANET_GLYPH[planet]} {planet}
                    </td>
                    {SHADBALA_COMPONENTS.map(c => (
                      <td key={c.id} style={{ padding: '8px 6px', textAlign: 'center', color: '#374151', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(getComp(planet, c))}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', fontVariantNumeric: 'tabular-nums' }}>
                      {fmt(total)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                      {required.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {total === null ? <span style={{ color: '#9ca3af' }}>-</span> : (
                        <span style={{
                          padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                          background: isStrong ? '#dcfce7' : '#fee2e2',
                          color: isStrong ? '#166534' : '#b91c1c',
                        }}>
                          {isStrong ? '✓ Strong' : '⚠ Weak'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#faf5ff', padding: 12, borderRadius: 8, border: '1px solid #e0d4f5' }}>
          <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, lineHeight: 1.6 }}>
            <strong>💡 Shadbala kya hai?</strong> 6 categories of planetary strength:
            <br />
            <strong>Sthana</strong> = sign placement (exalted, own, friend's signs).
            <strong> Dig</strong> = ideal direction/house.
            <strong> Kala</strong> = time-based (day/night, lunar month).
            <strong> Cheshta</strong> = motion (forward/retrograde).
            <strong> Naisargika</strong> = inherent natural strength.
            <strong> Drik</strong> = beneficial vs malefic aspects received.
            <br /><br />
            Total Rupas ≥ Required = planet can deliver full results. Below = weakened, dilute results.
          </p>
        </div>

        {/* Debug */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 600 }}>🔍 Show raw API data (debug)</summary>
          <pre style={{ background: '#fff8e1', padding: 12, borderRadius: 8, border: '1px solid #fde68a', fontSize: '0.7rem', overflowX: 'auto', maxHeight: 320, marginTop: 8 }}>
            {JSON.stringify(shadbala, null, 2).substring(0, 1500)}
          </pre>
        </details>
      </div>
    );
  };

  // =============================================================
  // Phase 8 — Divisional Charts tab (D2-D60 + Chalit/Sun/Moon — D1/D9 are in Lagna tab)
  // =============================================================
  const DIVISIONAL_OPTIONS = [
    { div: 'chalit',  name: 'Chalit Chart',       desc: 'House cusps & house bhav placement (KP/Bhav)' },
    { div: 'sun',     name: 'Sun Chart (Surya Kundli)', desc: 'Personality & ego — chart from Sun as ascendant' },
    { div: 'moon',    name: 'Moon Chart (Chandra Kundli)', desc: 'Mind & emotions — chart from Moon as ascendant' },
    { div: 'D2',      name: 'Hora (D2)',          desc: 'Wealth, financial prospects' },
    { div: 'D3',      name: 'Drekkana (D3)',      desc: 'Siblings, courage, life span' },
    { div: 'D4',      name: 'Chaturthamsa (D4)',  desc: 'Property, residence, fortune' },
    { div: 'D7',      name: 'Saptamsa (D7)',      desc: 'Children, progeny, creativity' },
    { div: 'D10',     name: 'Dasamsa (D10)',      desc: 'Career, profession, social status' },
    { div: 'D12',     name: 'Dwadasamsa (D12)',   desc: 'Parents, ancestry, lineage' },
    { div: 'D16',     name: 'Shodasamsa (D16)',   desc: 'Vehicles, pleasures, comforts' },
    { div: 'D20',     name: 'Vimsamsa (D20)',     desc: 'Spirituality, religious progress, devotion' },
    { div: 'D24',     name: 'Chaturvimsamsa (D24)', desc: 'Education, learning, academic pursuits' },
    { div: 'D27',     name: 'Saptavimsamsa (D27)', desc: 'Strength, weakness, stamina (Bhamsa)' },
    { div: 'D30',     name: 'Trimsamsa (D30)',    desc: 'Misfortunes, illnesses, troubles' },
    { div: 'D40',     name: 'Khavedamsa (D40)',   desc: 'Auspicious & inauspicious effects (matrilineal)' },
    { div: 'D45',     name: 'Akshavedamsa (D45)', desc: 'Character, conduct, integrity (patrilineal)' },
    { div: 'D60',     name: 'Shashtiamsa (D60)',  desc: 'Past karma, deepest analysis — most important' },
  ];

  // Charts where D1 (rashi) planet degrees DIRECTLY apply.
  // For D2-D60, planets get repositioned by divisional formula → degrees would be misleading.
  const DIV_SUPPORTS_DEGREES = (div) => div === 'chalit' || div === 'sun' || div === 'moon';

  const renderDivisionalTab = () => {
    // Lazy-load on first open
    if (!chartSvg && !chartLoading && kundaliRecord?.id) {
      fetchChart(kundaliRecord.id, chartDiv, chartStyle, lang);
      return <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading divisional chart...</div>;
    }

    const currentOpt = DIVISIONAL_OPTIONS.find(o => o.div === chartDiv) || DIVISIONAL_OPTIONS[0];
    const supportsDegrees = DIV_SUPPORTS_DEGREES(chartDiv);
    // Auto-apply D1 degrees ONLY for Chalit / Sun / Moon charts. Skip for D2-D60.
    const degreeMap = supportsDegrees && showDegrees ? buildDegreeMap(basicReport) : null;

    return (
      <div>
        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>📐 Divisional Chart:</span>
            <select value={chartDiv} onChange={e => { const v = e.target.value; setChartDiv(v); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, v, chartStyle, lang); }}
              style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, background: '#fff', fontSize: '0.9rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer', minWidth: 240 }}>
              {DIVISIONAL_OPTIONS.map(opt => (
                <option key={opt.div} value={opt.div}>{opt.name}{DIV_SUPPORTS_DEGREES(opt.div) ? ' °' : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600, marginRight: 6 }}>Style:</span>
            {['north', 'south', 'east'].map(s => (
              <button key={s} type="button" onClick={() => { setChartStyle(s); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, chartDiv, s, lang); }}
                style={{
                  padding: '8px 14px',
                  border: chartStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                  background: chartStyle === s ? '#7c3aed' : '#fff',
                  color: chartStyle === s ? '#fff' : '#1a0533',
                  borderRadius: 50, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                }}>
                {s} Indian
              </button>
            ))}
          </div>
        </div>

        {/* Show-degrees-on-chart toggle (enabled only for chalit/sun/moon) */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            cursor: supportsDegrees ? 'pointer' : 'not-allowed',
            opacity: supportsDegrees ? 1 : 0.4,
            fontSize: '0.85rem', fontWeight: 600, color: '#1a0533',
            background: supportsDegrees && showDegrees ? '#f3e8ff' : '#fff',
            padding: '8px 14px', borderRadius: 50, border: '2px solid #e0d4f5',
          }}
            title={supportsDegrees ? 'Toggle degrees on chart' : 'Degrees not applicable to D2-D60 (planet positions differ from D1)'}>
            <input type="checkbox" checked={supportsDegrees && showDegrees} disabled={!supportsDegrees}
              onChange={e => setShowDegrees(e.target.checked)}
              style={{ accentColor: '#7c3aed', width: 16, height: 16, cursor: supportsDegrees ? 'pointer' : 'not-allowed' }} />
            Show degrees on chart {!supportsDegrees && <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginLeft: 4 }}>(only Chalit / Sun / Moon)</span>}
          </label>
        </div>

        {/* Chart panel */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e6ff', borderTop: '4px solid #7c3aed', padding: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.04)', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#7c3aed', margin: 0, fontSize: '1rem', fontWeight: 700 }}>📐 {currentOpt.name}</h4>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '0.78rem' }}>{currentOpt.desc}</p>
          </div>
          {chartLoading ? (
            <div style={{ textAlign: 'center', color: '#7c3aed', padding: '60px 20px', fontWeight: 600 }}>Generating chart...</div>
          ) : (
            renderSvgChart(chartSvg, { maxWidth: 480, degreeMap })
          )}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#9ca3af', textAlign: 'center', marginTop: 14, fontStyle: 'italic' }}>
          💡 Sirf <strong>Chalit / Sun / Moon</strong> charts mein D1 degrees inject hote hain (kyunki yahan planet positions D1 jaisi hi hain). D2-D60 mein planets divisional formula se reposition hote hain — degrees alag honge, isliye chart pe nahi dikhate (misleading hoga).
        </p>
      </div>
    );
  };

  // OLD renderChartUI — kept for reference, no longer used
  const renderChartUI = () => (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={chartDiv} onChange={e => { const v = e.target.value; setChartDiv(v); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, v, chartStyle); }}
          style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, background: '#fff', fontSize: '0.9rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer' }}>
          <option value="D1">D1 — Lagna (Birth Chart)</option>
          <option value="D9">D9 — Navamsa (Marriage)</option>
          <option value="D2">D2 — Hora (Wealth)</option>
          <option value="D3">D3 — Drekkana (Siblings)</option>
          <option value="D4">D4 — Chaturthamsa (Property)</option>
          <option value="D7">D7 — Saptamsa (Children)</option>
          <option value="D10">D10 — Dasamsa (Career)</option>
          <option value="D12">D12 — Dwadasamsa (Parents)</option>
          <option value="D16">D16 — Shodasamsa (Vehicles)</option>
          <option value="D20">D20 — Vimsamsa (Spirituality)</option>
          <option value="D24">D24 — Chaturvimsamsa (Education)</option>
          <option value="D27">D27 — Saptavimsamsa (Strength)</option>
          <option value="D30">D30 — Trimsamsa (Misfortunes)</option>
          <option value="D40">D40 — Khavedamsa</option>
          <option value="D45">D45 — Akshvedamsa (Character)</option>
          <option value="D60">D60 — Shashtiamsa</option>
          <option value="chalit">Chalit Chart</option>
          <option value="moon">Moon Chart</option>
          <option value="sun">Sun Chart</option>
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {['north', 'south', 'east'].map(s => (
            <button key={s} type="button"
              onClick={() => { setChartStyle(s); if (kundaliRecord?.id) fetchChart(kundaliRecord.id, chartDiv, s); }}
              style={{ padding: '8px 14px', border: chartStyle === s ? '2px solid #7c3aed' : '2px solid #e0d4f5', background: chartStyle === s ? '#7c3aed' : '#fff', color: chartStyle === s ? '#fff' : '#1a0533', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
              {s} Indian
            </button>
          ))}
        </div>
      </div>
      {chartLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Generating chart...</div>
      ) : chartSvg ? (
        (() => {
          const str = typeof chartSvg === 'string' ? chartSvg : '';
          const wrapStyle = { background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #f0e6ff', textAlign: 'center', overflowX: 'auto' };
          const svgIdx = str.indexOf('<svg');
          if (svgIdx >= 0) {
            const cleanSvg = str.substring(svgIdx).replace(/<svg([^>]*)>/, (m, attrs) => {
              const hasViewBox = /viewBox\s*=/i.test(attrs);
              const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
              const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
              let newAttrs = attrs
                .replace(/\bwidth\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '')
                .replace(/\bheight\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '');
              if (!hasViewBox && wMatch && hMatch) newAttrs = ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"` + newAttrs;
              return `<svg width="100%" height="auto" preserveAspectRatio="xMidYMid meet"${newAttrs}>`;
            });
            return <div style={{ ...wrapStyle, maxWidth: 520, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: cleanSvg }} />;
          }
          if (/^https?:\/\//.test(str)) {
            return <div style={wrapStyle}><img src={str} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
          }
          if (str.startsWith('data:image')) {
            return <div style={wrapStyle}><img src={str} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
          }
          if (str.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(str)) {
            const clean = str.replace(/\s+/g, '');
            const decoded = (() => { try { return atob(clean); } catch (_) { return ''; } })();
            const isSvg = decoded.includes('<svg');
            const src = `data:image/${isSvg ? 'svg+xml' : 'png'};base64,${clean}`;
            return <div style={wrapStyle}><img src={src} alt="Kundali Chart" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} /></div>;
          }
          return (
            <div style={{ background: '#fff8e1', padding: 16, borderRadius: 12, border: '1px solid #fde68a' }}>
              <p style={{ color: '#92400e', fontWeight: 600, marginBottom: 8 }}>⚠ Chart format not recognized — debug info:</p>
              <pre style={{ fontSize: '0.75rem', background: '#fff', padding: 12, borderRadius: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, color: '#374151', margin: 0 }}>
                {typeof chartSvg === 'string' ? chartSvg.substring(0, 800) : JSON.stringify(chartSvg, null, 2).substring(0, 800)}
              </pre>
            </div>
          );
        })()
      ) : (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Chart not available — try regenerating</div>
      )}
    </div>
  );

  // =============================================================
  // Coming-soon placeholder for unbuilt phases
  // =============================================================
  const renderComingSoon = (tab) => (
    <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', border: '2px dashed #e0d4f5', borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>{tab.label.split(' ')[0]}</div>
      <h3 style={{ color: '#7c3aed', marginBottom: 8 }}>{tab.label.split(' ').slice(1).join(' ')}</h3>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: 4 }}>Phase {tab.phase} — Coming Soon</p>
      <p style={{ color: '#9ca3af', fontSize: '0.8rem', maxWidth: 420, margin: '0 auto' }}>
        Yeh section ek-ek karke add ho raha hai. Phase {tab.phase} ka kaam start hote hi yahan complete data dikhega.
      </p>
    </div>
  );

  // =============================================================
  // Render — main return
  // =============================================================
  return (
    <div className="kundali-page">
      <div className="list-hero">
        <h2>Free Janam Kundali</h2>
        <p>Generate your birth chart based on Vedic astrology</p>
      </div>
      <div className="container">
        <div className="kundali-layout">
          {/* ============ FORM ============ */}
          <form className="kundali-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Enter your name" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Time of Birth</label>
                <input type="time" name="birthTime" value={form.birthTime} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Place of Birth</label>
              <div className="place-input-wrap">
                <input type="text" name="birthPlace" value={form.birthPlace} onChange={handlePlaceChange} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onFocus={() => suggestions.length && setShowSuggestions(true)} placeholder="Enter city name e.g. Delhi, Mumbai" autoComplete="off" />
                {placeLoading && <span className="place-loader"></span>}
                {form.latitude && form.longitude && !placeLoading && <span className="place-check">✓</span>}
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e0d4f5', borderRadius: '0 0 10px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {suggestions.map((s, i) => (
                      <div key={i} onClick={() => selectPlace(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem', color: '#374151' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f9f5ff'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                        📍 {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.latitude && <span className="place-coords">Lat: {form.latitude}, Lon: {form.longitude}</span>}
            </div>
            <button type="submit" className="kundali-btn" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Kundali'}
            </button>
          </form>

          {/* ============ RESULT ============ */}
          {kundaliRecord && (
            <div className="kundali-result">
              <h3>Your Kundali — {kundaliRecord?.name || form.name}</h3>

              <div className="kundali-info-row">
                <span>DOB: {kundaliRecord.birthDate}</span>
                <span>TOB: {kundaliRecord.birthTime}</span>
                <span>Place: {kundaliRecord.birthPlace}</span>
              </div>

              {/* Language picker */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>🌐 Language:</span>
                <select value={lang} onChange={(e) => onChangeLang(e.target.value)}
                  style={{ padding: '8px 12px', border: '2px solid #e0d4f5', borderRadius: 8, background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: '#1a0533', cursor: 'pointer' }}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>

              {/* 13 Tabs — horizontal scroll on mobile */}
              <div style={{ overflowX: 'auto', marginBottom: 18, paddingBottom: 6, borderBottom: '1px solid #f0e6ff' }}>
                <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
                  {TABS.map(t => {
                    const active = activeTab === t.key;
                    return (
                      <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                        style={{
                          padding: '8px 14px',
                          border: active ? '2px solid #7c3aed' : '2px solid #e0d4f5',
                          background: active ? '#7c3aed' : (t.ready ? '#fff' : '#faf7ff'),
                          color: active ? '#fff' : (t.ready ? '#1a0533' : '#9ca3af'),
                          borderRadius: 50,
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                        }}>
                        {t.label}
                        {!t.ready && <span style={{ marginLeft: 6, fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>P{t.phase}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              {activeTab === 'basic' && (
                <div>
                  {basicTabLoading && !birthPanchang && !avakhada ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#7c3aed', fontWeight: 600 }}>Loading basic kundali...</div>
                  ) : (
                    <>
                      <SectionCard title="Birth Details" icon="📋">
                        {renderBirthDetails()}
                      </SectionCard>
                      <SectionCard title="Panchang Details (at birth)" icon="📅">
                        {renderPanchang()}
                      </SectionCard>
                      <SectionCard title="Avakhada Details" icon="🔯">
                        {renderAvakhada()}
                      </SectionCard>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'lagna' && renderLagnaTab()}

              {activeTab === 'transit' && renderTransitTab()}

              {activeTab === 'dasha' && renderDashaTab()}

              {activeTab === 'yogini' && renderYoginiTab()}

              {activeTab === 'ashtakvarga' && renderAshtakvargaTab()}

              {activeTab === 'planets' && renderPlanetDetails()}

              {activeTab === 'divisional' && renderDivisionalTab()}

              {activeTab === 'kp' && renderKpTab()}

              {activeTab === 'sadesati' && renderSadeSatiTab()}

              {activeTab === 'shadbala' && renderShadbalaTab()}

              {activeTab === 'bhavbala' && renderBhavBalaTab()}

              {activeTab === 'manglik' && renderManglikTab()}

              {(() => {
                const tab = TABS.find(t => t.key === activeTab);
                if (!tab || tab.ready) return null;
                return renderComingSoon(tab);
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kundali;
