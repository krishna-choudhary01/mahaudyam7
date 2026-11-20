import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { bazaarDataService } from '../../services/bazaar/bazaarDataService';
import { rankMarketsForUser } from '../../services/bazaar/bazaarRecommendationEngine';
import { travelCostService, TRANSPORT_MODES } from '../../services/bazaar/travelCostService';
import { profitIntelligenceService } from '../../services/bazaar/profitIntelligenceService';
import { locationService } from '../../services/location/locationService';
import { authService } from '../../services/auth/authService';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { BAZAAR_PRODUCT_CATEGORIES, DAYS_OF_WEEK } from '../../data/bazaar/initialMarkets';
import { SearchableSelect } from '../common/SearchableSelect';
import { MarketCard } from './MarketCard';
import { MarketDetailModal } from './MarketDetailModal';
import { BazaarVisitHistorySection } from './BazaarVisitHistorySection';
import { NewMarketProposalSection } from './NewMarketProposalSection';
import { Button } from '../common/Button';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import { bazaarPerformanceService } from '../../services/bazaar/bazaarPerformanceService';
import './BazaarPathModule.css';

export function BazaarPathModule({ onBack }) {
  const { isOnline } = useOnlineStatus();
  const { t, isMarathi } = useLanguage();
  const currentUser = authService.getCurrentUser();
  const userId = authService.getUserId();

  // --- 1. SEARCH LOCATION HIERARCHY (MAHARASHTRA -> DISTRICT -> TALUKA -> VILLAGE) ---
  const defaultDistrict = currentUser?.districtCode || 490; // Nashik
  const defaultTaluka = currentUser?.talukaCode || 4154;    // Sinnar
  const defaultVillage = currentUser?.villageCode || null;

  const [searchDistrict, setSearchDistrict] = useState(defaultDistrict);
  const [searchTaluka, setSearchTaluka] = useState(defaultTaluka);
  const [searchVillage, setSearchVillage] = useState(defaultVillage);
  const [showLocationEditor, setShowLocationEditor] = useState(false);

  // Dependent location lists
  const [districts] = useState(() => locationService.getAllDistricts());
  const [talukas, setTalukas] = useState(() => locationService.getTalukasForDistrict(defaultDistrict));
  const [villages, setVillages] = useState([]);
  const [villageLoading, setVillageLoading] = useState(false);
  const [villageError, setVillageError] = useState(null);

  // GPS Geolocation & Radius State
  const [userCoords, setUserCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [searchRadiusKm, setSearchRadiusKm] = useState(50); // 15, 30, 50, 100 km

  // --- 2. PRODUCT SELECTION & SELLING DETAILS ---
  const [productCategory, setProductCategory] = useState('Vegetables');
  const [productName, setProductName] = useState('Onion');
  const [quantityCarried, setQuantityCarried] = useState(10);
  const [quantityUnit, setQuantityUnit] = useState('Quintal');
  const [costPerUnit, setCostPerUnit] = useState(1200);
  const [expectedPricePerUnit, setExpectedPricePerUnit] = useState(1850);
  const [transportModeId, setTransportModeId] = useState('motorcycle');
  const [showProductConfig, setShowProductConfig] = useState(false);

  // What-if Profit Simulator Interactive Controls
  const [simulatedPriceAdjustmentPct, setSimulatedPriceAdjustmentPct] = useState(0); // -30% to +30%
  const [simulatedSellThroughPct, setSimulatedSellThroughPct] = useState(85); // 40% to 100%

  // --- 3. MARKETS DATA & FAVORITES ---
  const [allMarkets, setAllMarkets] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarketForModal, setSelectedMarketForModal] = useState(null);

  // View navigation tabs: 'discover' | 'profit' | 'travel' | 'calendar' | 'history' | 'propose'
  const [activeTab, setActiveTab] = useState('discover');
  const [filterOnlyFavorites, setFilterOnlyFavorites] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');

  // Load villages whenever taluka changes
  const loadVillages = useCallback(async (dCode, tCode) => {
    if (!dCode || !tCode) {
      setVillages([]);
      return;
    }
    setVillageLoading(true);
    setVillageError(null);
    try {
      const res = await locationService.getVillagesForTaluka(dCode, tCode);
      if (res && res.error) {
        setVillageError(res.error);
        setVillages([]);
      } else {
        setVillages(Array.isArray(res) ? res : res.villages || []);
      }
    } catch (e) {
      setVillageError(`Failed to load villages: ${e.message}`);
      setVillages([]);
    } finally {
      setVillageLoading(false);
    }
  }, []);

  // Initial load: seed IndexedDB, fetch markets, personal favorites, and villages
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await bazaarDataService.init();
      const markets = await bazaarDataService.getAllMarkets();
      setAllMarkets(markets);

      if (userId) {
        const favs = await bazaarDataService.getUserFavorites(userId);
        setFavorites(favs);
        const visits = await bazaarPerformanceService.getVisitHistory(userId);
        setVisitHistory(visits);
      } else {
        setFavorites([]);
        setVisitHistory([]);
      }

      if (searchDistrict && searchTaluka) {
        await loadVillages(searchDistrict, searchTaluka);
      }
    } catch (e) {
      console.error('Failed to load bazaar markets', e);
    } finally {
      setLoading(false);
    }
  }, [userId, searchDistrict, searchTaluka, loadVillages]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // District selector handler
  const handleDistrictChange = (dCode) => {
    const num = dCode ? Number(dCode) : '';
    setSearchDistrict(num);
    setSearchTaluka('');
    setSearchVillage('');
    setVillages([]);
    if (num) {
      const tList = locationService.getTalukasForDistrict(num);
      setTalukas(tList);
    } else {
      setTalukas([]);
    }
  };

  // Taluka selector handler
  const handleTalukaChange = (tCode) => {
    const num = tCode ? Number(tCode) : '';
    setSearchTaluka(num);
    setSearchVillage('');
    if (num && searchDistrict) {
      loadVillages(searchDistrict, num);
    } else {
      setVillages([]);
    }
  };

  // GPS Geolocation Handler
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError(isMarathi ? 'या ब्राउझरमध्ये GPS सुविधा उपलब्ध नाही.' : 'Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserCoords(coords);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(isMarathi ? 'GPS स्थान मिळवता आले नाही. कृपया गाव स्वतः निवडा.' : `GPS unavailable: ${err.message}. Please select your village manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Toggle favorite market
  const handleToggleFavorite = async (marketId) => {
    if (!userId) return;
    try {
      const updated = await bazaarDataService.toggleFavorite(userId, marketId);
      setFavorites(updated);
    } catch (e) {
      console.warn('Could not update favorite', e);
    }
  };

  // Resolved Location Names for Display
  const districtObj = districts.find((d) => d.code === Number(searchDistrict));
  const talukaObj = districtObj
    ? locationService.getTalukasForDistrict(districtObj.code).find((t) => t.code === Number(searchTaluka))
    : null;
  const villageObj = villages.find((v) => Number(v.code || v.c) === Number(searchVillage));

  // Current effective product price based on simulator
  const effectivePrice = Math.max(1, Math.round(Number(expectedPricePerUnit) * (1 + simulatedPriceAdjustmentPct / 100)));

  // Product details payload
  const currentProductDetails = useMemo(() => ({
    category: productCategory,
    productName,
    quantityCarried: Number(quantityCarried) || 10,
    costPerUnit: Number(costPerUnit) || 1200,
    expectedPricePerUnit: effectivePrice,
    transportModeId
  }), [productCategory, productName, quantityCarried, costPerUnit, effectivePrice, transportModeId]);

  // Rank markets using the Net Opportunity Scoring Algorithm
  const rankedMarkets = useMemo(() => {
    if (!allMarkets || allMarkets.length === 0) return [];

    let filtered = allMarkets;

    // Filter by district if set and GPS not active
    if (!userCoords && searchDistrict) {
      filtered = filtered.filter((m) => Number(m.districtCode) === Number(searchDistrict));
    }

    // Filter by day of week if set
    if (selectedDayFilter !== 'all') {
      filtered = filtered.filter((m) => m.operatingDay === selectedDayFilter);
    }

    // Filter by category if set
    if (productCategory && productCategory !== 'all') {
      filtered = filtered.filter((m) => m.productCategories?.includes(productCategory));
    }

    // Rank via Recommendation Engine
    const evaluations = rankMarketsForUser({
      markets: filtered,
      userLocation: {
        districtCode: searchDistrict,
        talukaCode: searchTaluka,
        villageCode: searchVillage,
        coordinates: userCoords
      },
      productDetails: currentProductDetails,
      searchRadiusKm,
      currentDate: new Date(),
      userId,
      userVisitHistory: visitHistory
    });

    return evaluations;
  }, [allMarkets, userCoords, searchDistrict, searchTaluka, searchVillage, selectedDayFilter, productCategory, currentProductDetails, searchRadiusKm, userId]);

  // Displayed evaluations with optional favorites filter
  const displayedEvaluations = useMemo(() => {
    if (filterOnlyFavorites) {
      return rankedMarkets.filter((ev) => favorites.includes(ev.market.id));
    }
    return rankedMarkets;
  }, [rankedMarkets, filterOnlyFavorites, favorites]);

  // Top recommended market for detailed profit intelligence simulations
  const primaryMarketEvaluation = rankedMarkets.length > 0 ? rankedMarkets[0] : null;

  // Active simulated profit calculation for What-if tab
  const activeProfitSimulation = useMemo(() => {
    if (!primaryMarketEvaluation) return null;
    return profitIntelligenceService.calculateProfit({
      quantityCarried: Number(quantityCarried) || 10,
      costPerUnit: Number(costPerUnit) || 1200,
      expectedPricePerUnit: effectivePrice,
      sellThroughPct: simulatedSellThroughPct,
      travelCost: primaryMarketEvaluation.travelCalc?.travelCost || 120,
      stallFee: primaryMarketEvaluation.market.stallFee || 50,
      packagingCost: Math.round((Number(quantityCarried) || 10) * 15)
    });
  }, [primaryMarketEvaluation, quantityCarried, costPerUnit, effectivePrice, simulatedSellThroughPct]);

  // Active simulated 3 scenarios
  const activeScenarios = useMemo(() => {
    if (!primaryMarketEvaluation) return null;
    return profitIntelligenceService.generateScenarios({
      quantityCarried: Number(quantityCarried) || 10,
      costPerUnit: Number(costPerUnit) || 1200,
      expectedPricePerUnit: Number(expectedPricePerUnit) || 1850,
      travelCost: primaryMarketEvaluation.travelCalc?.travelCost || 120,
      stallFee: primaryMarketEvaluation.market.stallFee || 50,
      packagingCost: Math.round((Number(quantityCarried) || 10) * 15)
    });
  }, [primaryMarketEvaluation, quantityCarried, costPerUnit, expectedPricePerUnit]);

  // Unsold stock recovery analysis
  const unsoldStockRecovery = useMemo(() => {
    if (!activeProfitSimulation || activeProfitSimulation.unsoldQuantity <= 0) return null;
    const secondaryMarket = rankedMarkets.length > 1 ? rankedMarkets[1] : null;
    return profitIntelligenceService.evaluateUnsoldStockRecovery({
      unsoldQuantity: activeProfitSimulation.unsoldQuantity,
      costPerUnit: Number(costPerUnit) || 1200,
      nextMarketExpectedPrice: effectivePrice,
      nextMarketTravelCost: secondaryMarket?.travelCalc?.travelCost || 150,
      nextMarketStallFee: 40
    });
  }, [activeProfitSimulation, rankedMarkets, costPerUnit, effectivePrice]);

  return (
    <div className="bazaarpath-container" role="region" aria-label={t('bazaar.title')}>
      {/* Top Back Navigation */}
      <div className="bazaar-nav">
        <Button
          variant="outline"
          onClick={onBack}
          className="bazaar-back-btn"
          aria-label={t('modules.placeholder.backBtn')}
        >
          <AppIcon name="arrow-left" size={16} />
          {t('modules.placeholder.backBtn')}
        </Button>
      </div>

      {/* Primary Module Header */}
      <header className="bazaar-header">
        <div className="bazaar-header__title-row">
          <div className="bazaar-header__icon">
            <AppIcon name="market" size={34} color="#1b5e20" />
          </div>
          <div className="bazaar-header__content">
            <div className="bazaar-header__badge-row">
              <span className="bazaar-tag">{isMarathi ? 'महाउद्यम • बाजारपेठ व नफा बुद्धिमत्ता' : 'MahaUdyam • Market & Profit Intelligence'}</span>
              <span className={`network-pill ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? (isMarathi ? '🌐 ऑनलाइन दर अद्यतनित (Live Sync)' : '🌐 Online Live Sync') : (isMarathi ? '📶 ऑफलाइन साठा उपलब्ध (Offline Mode)' : '📶 Offline Cached Mode')}
              </span>
            </div>
            <h1 className="bazaar-title">{t('bazaar.title')}</h1>
            <p className="bazaar-lead">
              {t('bazaar.subtitle')}
            </p>
          </div>
        </div>
      </header>

      {/* 1. LOCATION DISCOVERY & JURISDICTION BAR */}
      <section className="location-bar-card" aria-label={t('bazaar.locationBarTitle')}>
        <div className="location-bar__summary">
          <div className="location-bar__info">
            <AppIcon name="map-pin" size={22} color="#2b5329" />
            <div>
              <span className="location-bar__lbl">{t('bazaar.yourLocation')}</span>
              <div className="location-bar__val">
                {districtObj ? (isMarathi ? `${districtObj.marathiName} (${districtObj.name})` : `${districtObj.name} (${districtObj.marathiName})`) : t('bazaar.showingAllMarkets')}
                {talukaObj && ` › ${isMarathi ? talukaObj.marathiName : talukaObj.name}`}
                {villageObj && ` › ${isMarathi ? (villageObj.name_mr || villageObj.m) : (villageObj.name_en || villageObj.n)} (LGD: ${villageObj.code || villageObj.c})`}
              </div>
              {userCoords && (
                <span className="gps-active-tag">
                  ✓ {t('bazaar.gpsDetected')} ({userCoords.lat.toFixed(2)}°N, {userCoords.lng.toFixed(2)}°E) • {t('bazaar.withinRadius', { radius: searchRadiusKm })}
                </span>
              )}
            </div>
          </div>

          <div className="location-bar__actions">
            <Button
              variant="outline"
              className="btn-location-change"
              onClick={() => setShowLocationEditor(!showLocationEditor)}
            >
              {showLocationEditor ? (isMarathi ? 'स्थान बंद करा' : 'Close Location') : t('bazaar.resetLocation')}
            </Button>

            <Button
              variant="outline"
              className="btn-gps"
              onClick={handleDetectGps}
              disabled={gpsLoading}
            >
              <AppIcon name="route" size={16} />
              {gpsLoading ? t('bazaar.locatingGps') : t('bazaar.detectGps')}
            </Button>
          </div>
        </div>

        {gpsError && (
          <div className="bazaar-alert warning" role="alert">
            <AppIcon name="info" size={16} color="#b76e00" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Change Location Drawer (Maharashtra -> District -> Taluka -> Village) */}
        {showLocationEditor && (
          <div className="location-editor-drawer">
            <div className="drawer-notice">
              <AppIcon name="info" size={16} color="#1b5e20" />
              <span>
                <strong>{isMarathi ? 'स्थानिक शोध टीप:' : 'Search Note:'}</strong> {isMarathi
                  ? 'हा बदल केवळ बाजारपेठ शोधण्यासाठी आहे. तुमच्या खात्याच्या मुख्य प्रोफाईलमध्ये बदल होणार नाही.'
                  : 'Changing location here filters weekly markets without modifying your permanent user profile.'}
              </span>
            </div>

            <div className="location-selectors-row">
              {/* 1. District */}
              <div className="sel-group">
                <SearchableSelect
                  id="bazaar-search-district"
                  label={t('home.selectDistrict') + ':'}
                  options={districts.map((d) => ({
                    value: d.code,
                    label: isMarathi ? d.marathiName : d.name,
                    marathiLabel: isMarathi ? d.name : d.marathiName,
                    code: `LGD ${d.code} (${d.talukaCount} ${isMarathi ? 'तालुके' : 'Talukas'})`
                  }))}
                  value={searchDistrict}
                  onChange={handleDistrictChange}
                  placeholder={t('home.selectDistrict')}
                />
              </div>

              {/* 2. Taluka */}
              <div className="sel-group">
                <SearchableSelect
                  id="bazaar-search-taluka"
                  label={t('home.selectTaluka') + ':'}
                  options={talukas.map((t) => ({
                    value: t.code,
                    label: isMarathi ? t.marathiName : t.name,
                    marathiLabel: isMarathi ? t.name : t.marathiName,
                    code: `LGD ${t.code}`
                  }))}
                  value={searchTaluka}
                  onChange={handleTalukaChange}
                  placeholder={searchDistrict ? t('home.selectTaluka') : t('home.chooseDistrictFirst')}
                  disabled={!searchDistrict || talukas.length === 0}
                />
              </div>

              {/* 3. Village */}
              <div className="sel-group">
                <SearchableSelect
                  id="bazaar-search-village"
                  label={t('home.selectVillage') + ':'}
                  options={(Array.isArray(villages) ? villages : []).map((v) => ({
                    value: v.code || v.c,
                    label: isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n),
                    marathiLabel: isMarathi ? (v.name_en || v.n) : (v.name_mr || v.m),
                    code: `LGD ${v.code || v.c}`
                  }))}
                  value={searchVillage}
                  onChange={(val) => setSearchVillage(val)}
                  placeholder={
                    !searchTaluka
                      ? t('home.chooseTalukaFirst')
                      : villageLoading
                      ? t('common.loading')
                      : t('home.selectVillage')
                  }
                  disabled={!searchTaluka || villageLoading}
                  loading={villageLoading}
                  error={villageError}
                  onRetry={() => loadVillages(searchDistrict, searchTaluka)}
                />
              </div>
            </div>

            {/* Radius Selector */}
            <div className="radius-picker-wrap">
              <span className="radius-label">{t('bazaar.radiusLabel')}</span>
              <div className="radius-buttons">
                {[15, 30, 50, 100].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`radius-btn ${searchRadiusKm === r ? 'radius-btn--active' : ''}`}
                    onClick={() => setSearchRadiusKm(r)}
                  >
                    {r} {t('common.units.km')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. PRODUCT SELECTION & SELLING DETAILS BAR */}
      <section className="product-details-card" aria-label={t('bazaar.productDrawerTitle')}>
        <div className="product-summary-bar">
          <div className="prod-summary-info">
            <span className="prod-title-tag">
              {isMarathi ? 'विक्री शेतमाल:' : 'Product:'} <strong>{productName}</strong> ({productCategory})
            </span>
            <span className="prod-stat-pill">
              {isMarathi ? 'साठा:' : 'Stock:'} <strong>{quantityCarried} {quantityUnit}</strong> • {isMarathi ? 'उत्पादन खर्च:' : 'Cost:'} <strong>₹{costPerUnit}</strong> • {isMarathi ? 'विक्री दर:' : 'Price:'} <strong>₹{expectedPricePerUnit}</strong>
            </span>
            <span className="prod-mode-pill">
              {t('bazaar.transportModeLabel')} <strong>{isMarathi ? (TRANSPORT_MODES.find((m) => m.id === transportModeId)?.name_mr || 'दुचाकी') : (TRANSPORT_MODES.find((m) => m.id === transportModeId)?.name_en || 'Motorcycle')}</strong>
            </span>
          </div>

          <Button
            variant="outline"
            className="btn-toggle-product"
            onClick={() => setShowProductConfig(!showProductConfig)}
          >
            {showProductConfig ? (isMarathi ? 'माहिती बंद करा' : 'Close Config') : t('bazaar.openConfigBtn')}
          </Button>
        </div>

        {/* Product Configuration Drawer */}
        {showProductConfig && (
          <div className="product-config-drawer">
            {/* Category Chips */}
            <div className="config-group">
              <label className="config-label">{t('bazaar.categoryLabel')}</label>
              <div className="category-chips">
                {BAZAAR_PRODUCT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip-btn ${productCategory === cat.id ? 'chip-btn--active' : ''}`}
                    onClick={() => setProductCategory(cat.id)}
                  >
                    <span>{isMarathi ? cat.label_mr : cat.label_en}</span>
                    <small className="chip-en">{isMarathi ? cat.label_en : cat.label_mr}</small>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="config-inputs-grid">
              <div className="input-group">
                <label className="input-lbl">{isMarathi ? 'उत्पादनाचे नाव:' : 'Product Name:'}</label>
                <input
                  type="text"
                  className="config-input"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={isMarathi ? 'उदा. कांदा, गूळ' : 'e.g. Onion, Jaggery'}
                />
              </div>

              <div className="input-group">
                <label className="input-lbl">{t('bazaar.quantityLabel', { unit: quantityUnit })}</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    className="config-input"
                    value={quantityCarried}
                    onChange={(e) => setQuantityCarried(e.target.value)}
                  />
                  <select
                    className="config-select-unit"
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                  >
                    <option value="Quintal">{isMarathi ? 'क्विंटल (Quintal)' : 'Quintal'}</option>
                    <option value="Kg">{isMarathi ? 'किलो (Kg)' : 'Kg'}</option>
                    <option value="Crate">{isMarathi ? 'क्रेट (Crate)' : 'Crate'}</option>
                    <option value="Dozen">{isMarathi ? 'डझन (Dozen)' : 'Dozen'}</option>
                    <option value="Litre">{isMarathi ? 'लिटर (Litre)' : 'Litre'}</option>
                    <option value="Pieces">{isMarathi ? 'नग (Pieces)' : 'Pieces'}</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-lbl">{t('bazaar.unitCostLabel', { unit: quantityUnit })}</label>
                <input
                  type="number"
                  min="1"
                  className="config-input"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  placeholder={isMarathi ? '₹ प्रति एकक' : '₹ per unit'}
                />
              </div>

              <div className="input-group">
                <label className="input-lbl">{t('bazaar.sellingPriceLabel', { unit: quantityUnit })}</label>
                <input
                  type="number"
                  min="1"
                  className="config-input"
                  value={expectedPricePerUnit}
                  onChange={(e) => setExpectedPricePerUnit(e.target.value)}
                  placeholder={isMarathi ? '₹ प्रति एकक' : '₹ per unit'}
                />
              </div>

              <div className="input-group">
                <label className="input-lbl">{t('bazaar.transportModeLabel')}</label>
                <select
                  className="config-select"
                  value={transportModeId}
                  onChange={(e) => setTransportModeId(e.target.value)}
                >
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {isMarathi ? `${m.name_mr} (${m.name_en})` : `${m.name_en} (${m.name_mr})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. FOUR MAIN FEATURE TABS */}
      <div className="bazaar-main-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'discover'}
          className={`main-tab-btn ${activeTab === 'discover' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <AppIcon name="search" size={17} />
          <span>१. {t('bazaar.tabDiscover')}</span>
          <span className="tab-count-pill">{rankedMarkets.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profit'}
          className={`main-tab-btn ${activeTab === 'profit' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('profit')}
        >
          <AppIcon name="trending-up" size={17} />
          <span>२. {t('bazaar.tabProfit')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'travel'}
          className={`main-tab-btn ${activeTab === 'travel' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('travel')}
        >
          <AppIcon name="route" size={17} />
          <span>३. {t('bazaar.tabTravel')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`main-tab-btn ${activeTab === 'calendar' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <AppIcon name="calendar" size={17} />
          <span>४. {t('bazaar.tabCalendar')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`main-tab-btn ${activeTab === 'history' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <AppIcon name="clock" size={17} />
          <span>५. {isMarathi ? 'भेट इतिहास व प्रत्यक्ष नफा' : 'Visit History & Actuals'}</span>
          {visitHistory.length > 0 && <span className="tab-count-pill">{visitHistory.length}</span>}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'propose'}
          className={`main-tab-btn ${activeTab === 'propose' ? 'main-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('propose')}
        >
          <AppIcon name="plus" size={17} />
          <span>६. {isMarathi ? 'नवीन बाजार नोंदणी' : 'Submit Market'}</span>
        </button>
      </div>

      {/* TAB 1: DISCOVER MARKETS */}
      {activeTab === 'discover' && (
        <section className="tab-view-content" aria-label={t('bazaar.tabDiscover')}>
          {/* Day & Favorites Filter Bar */}
          <div className="sub-filters-bar">
            <div className="day-filter-chips">
              <button
                type="button"
                className={`sub-filter-btn ${selectedDayFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedDayFilter('all')}
              >
                {isMarathi ? 'सर्व दिवस' : 'All Days'}
              </button>
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`sub-filter-btn ${selectedDayFilter === d ? 'active' : ''}`}
                  onClick={() => setSelectedDayFilter(d)}
                >
                  {isMarathi ? (t(`bazaar.calendar.days.${d}`) || d) : d}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`fav-toggle-pill ${filterOnlyFavorites ? 'active' : ''}`}
              onClick={() => setFilterOnlyFavorites(!filterOnlyFavorites)}
            >
              <AppIcon name="heart-fill" size={15} color={filterOnlyFavorites ? '#c62828' : 'currentColor'} />
              <span>{isMarathi ? `पसंतीचे बाजार (${favorites.length})` : `Favorites (${favorites.length})`}</span>
            </button>
          </div>

          {/* Markets List */}
          {loading ? (
            <div className="loading-box" role="status">
              <div className="spinner" />
              <p>{t('common.loading')}</p>
            </div>
          ) : displayedEvaluations.length === 0 ? (
            <div className="empty-box" role="status">
              <AppIcon name="market" size={48} color="#9e9e9e" />
              <h3>{isMarathi ? 'कोणतीही बाजारपेठ आढळली नाही' : 'No weekly markets found'}</h3>
              <p>{isMarathi ? 'निवडलेल्या निकषांसाठी आठवडे बाजार आढळला नाही. कृपया शोध त्रिज्या किंवा वार बदलून पहा.' : 'No markets found matching the selected radius or filters. Try widening your radius or changing the day.'}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchRadiusKm(100);
                  setSelectedDayFilter('all');
                  setFilterOnlyFavorites(false);
                }}
              >
                {isMarathi ? 'शोध अंतर मर्यादा वाढवा (१०० कि.मी.)' : 'Widen Search Radius (100 km)'}
              </Button>
            </div>
          ) : (
            <div className="markets-grid">
              {displayedEvaluations.map((ev) => (
                <MarketCard
                  key={ev.market.id}
                  evaluation={ev}
                  isFavorite={favorites.includes(ev.market.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onViewDetails={(m) => setSelectedMarketForModal({ market: m, evaluation: ev })}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: PROFIT INTELLIGENCE & WHAT-IF SIMULATOR */}
      {activeTab === 'profit' && (
        <section className="tab-view-content" aria-label={t('bazaar.tabProfit')}>
          {primaryMarketEvaluation && activeProfitSimulation ? (
            <div className="profit-intelligence-layout">
              {/* Financial Summary Top Card */}
              <div className="profit-hero-card">
                <div className="hero-top-row">
                  <div>
                    <span className="hero-sub">{t('bazaar.profit.selectedMarketLabel')}</span>
                    <h2 className="hero-title">
                      {isMarathi ? (primaryMarketEvaluation.market.name_mr || primaryMarketEvaluation.market.name) : primaryMarketEvaluation.market.name}
                    </h2>
                    <span className="hero-loc">
                      {primaryMarketEvaluation.market.taluka}, {primaryMarketEvaluation.market.district} • {isMarathi ? (t(`bazaar.calendar.days.${primaryMarketEvaluation.market.operatingDay}`) || primaryMarketEvaluation.market.operatingDay) : primaryMarketEvaluation.market.operatingDay}
                    </span>
                  </div>
                  <div className={`hero-profit-badge ${activeProfitSimulation.netProfit >= 0 ? 'positive' : 'negative'}`}>
                    <span className="hero-profit-lbl">{t('bazaar.profit.netProfit')}</span>
                    <span className="hero-profit-val">
                      {activeProfitSimulation.netProfit >= 0 ? '+' : ''}₹{activeProfitSimulation.netProfit.toLocaleString('en-IN')}
                    </span>
                    <span className="hero-profit-sub">{t('bazaar.profit.profitMargin')}: {activeProfitSimulation.profitMargin}% • {t('bazaar.profit.roi')}: {activeProfitSimulation.returnOnInvestment}%</span>
                  </div>
                </div>

                {/* 4 Financial Columns */}
                <div className="hero-columns-grid">
                  <div className="hero-col">
                    <span className="col-lbl">{t('bazaar.profit.grossRevenue')}:</span>
                    <strong className="col-val text-green">₹{activeProfitSimulation.grossRevenue.toLocaleString('en-IN')}</strong>
                    <small className="col-sub">{activeProfitSimulation.quantitySold} {quantityUnit} ({activeProfitSimulation.sellThroughPct}%)</small>
                  </div>
                  <div className="hero-col">
                    <span className="col-lbl">{t('bazaar.profit.productCost')}:</span>
                    <strong className="col-val">₹{activeProfitSimulation.productCost.toLocaleString('en-IN')}</strong>
                    <small className="col-sub">{activeProfitSimulation.quantityCarried} {quantityUnit} @ ₹{costPerUnit}</small>
                  </div>
                  <div className="hero-col">
                    <span className="col-lbl">{t('bazaar.profit.travelExpenses')}:</span>
                    <strong className="col-val">₹{activeProfitSimulation.logisticsAndMarketCost.toLocaleString('en-IN')}</strong>
                    <small className="col-sub">{t('bazaar.marketCard.travelCost')} ₹{activeProfitSimulation.travelCost} • {t('bazaar.profit.marketFee')} ₹{activeProfitSimulation.stallFee}</small>
                  </div>
                  <div className="hero-col">
                    <span className="col-lbl">{t('bazaar.profit.totalCost')}:</span>
                    <strong className="col-val text-danger">₹{activeProfitSimulation.totalCost.toLocaleString('en-IN')}</strong>
                    <small className="col-sub">{t('bazaar.profit.minSafePrice')}: ₹{activeProfitSimulation.minSellingPrice}</small>
                  </div>
                </div>
              </div>

              {/* Interactive What-if Profit Simulator */}
              <div className="simulator-card">
                <div className="simulator-header">
                  <AppIcon name="trending-up" size={20} color="#1b5e20" />
                  <h3 className="sim-title">{t('bazaar.profit.whatIfTitle')}</h3>
                </div>
                <p className="sim-desc">
                  {t('bazaar.profit.whatIfSubtitle')}
                </p>

                <div className="sliders-grid">
                  {/* Slider 1: Selling Price Adjustment */}
                  <div className="slider-control">
                    <div className="slider-lbl-row">
                      <span>{t('bazaar.profit.priceSlider')}</span>
                      <strong className="slider-val">
                        {simulatedPriceAdjustmentPct >= 0 ? '+' : ''}{simulatedPriceAdjustmentPct}% (₹{effectivePrice} / {quantityUnit})
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="5"
                      value={simulatedPriceAdjustmentPct}
                      onChange={(e) => setSimulatedPriceAdjustmentPct(Number(e.target.value))}
                      className="bazaar-range-slider"
                      aria-label={t('bazaar.profit.priceSlider')}
                    />
                    <div className="slider-hints">
                      <span>-30%</span>
                      <span>₹{expectedPricePerUnit}</span>
                      <span>+30%</span>
                    </div>
                  </div>

                  {/* Slider 2: Sell-through Percentage */}
                  <div className="slider-control">
                    <div className="slider-lbl-row">
                      <span>{t('bazaar.profit.volumeSlider')}</span>
                      <strong className="slider-val">{simulatedSellThroughPct}% ({activeProfitSimulation.quantitySold} {quantityUnit})</strong>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={simulatedSellThroughPct}
                      onChange={(e) => setSimulatedSellThroughPct(Number(e.target.value))}
                      className="bazaar-range-slider"
                      aria-label={t('bazaar.profit.volumeSlider')}
                    />
                    <div className="slider-hints">
                      <span>40%</span>
                      <span>85%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Scenarios Table */}
              {activeScenarios && (
                <div className="scenarios-card">
                  <h3 className="scenarios-title">{t('bazaar.profit.scenariosTitle')}</h3>
                  <div className="scenarios-table-wrap">
                    <table className="scenarios-table">
                      <thead>
                        <tr>
                          <th>{t('bazaar.profit.colScenario')}</th>
                          <th>{t('bazaar.profit.colSellThrough')}</th>
                          <th>{t('bazaar.profit.colRealizedPrice')}</th>
                          <th>{t('bazaar.profit.colRevenue')}</th>
                          <th>{t('bazaar.profit.colTotalCost')}</th>
                          <th>{t('bazaar.profit.colNetProfit')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="sc-conservative">
                          <td>
                            <strong>{isMarathi ? activeScenarios.conservative.label_mr : activeScenarios.conservative.label_en}</strong>
                            <small>{isMarathi ? 'दुपारनंतरचे दर' : 'Lower afternoon rate'}</small>
                          </td>
                          <td>65%</td>
                          <td>₹{activeScenarios.conservative.quantitySold > 0 ? Math.round(Number(expectedPricePerUnit) * 0.9) : 0}</td>
                          <td>₹{activeScenarios.conservative.grossRevenue.toLocaleString('en-IN')}</td>
                          <td>₹{activeScenarios.conservative.totalCost.toLocaleString('en-IN')}</td>
                          <td className={activeScenarios.conservative.netProfit >= 0 ? 'text-green font-bold' : 'text-red font-bold'}>
                            ₹{activeScenarios.conservative.netProfit.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr className="sc-expected">
                          <td>
                            <strong>{isMarathi ? activeScenarios.expected.label_mr : activeScenarios.expected.label_en}</strong>
                            <small>{isMarathi ? 'अपेक्षित बाजार' : 'Normal expected market'}</small>
                          </td>
                          <td>85%</td>
                          <td>₹{expectedPricePerUnit}</td>
                          <td>₹{activeScenarios.expected.grossRevenue.toLocaleString('en-IN')}</td>
                          <td>₹{activeScenarios.expected.totalCost.toLocaleString('en-IN')}</td>
                          <td className="text-green font-bold">
                            ₹{activeScenarios.expected.netProfit.toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr className="sc-optimistic">
                          <td>
                            <strong>{isMarathi ? activeScenarios.optimistic.label_mr : activeScenarios.optimistic.label_en}</strong>
                            <small>{isMarathi ? 'ताजा दर्जेदार माल' : 'Freshness premium'}</small>
                          </td>
                          <td>100%</td>
                          <td>₹{Math.round(Number(expectedPricePerUnit) * 1.1)}</td>
                          <td>₹{activeScenarios.optimistic.grossRevenue.toLocaleString('en-IN')}</td>
                          <td>₹{activeScenarios.optimistic.totalCost.toLocaleString('en-IN')}</td>
                          <td className="text-green font-bold">
                            +₹{activeScenarios.optimistic.netProfit.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Break-even & Unsold Stock Recovery Cards */}
              <div className="recovery-grid">
                <div className="break-even-card">
                  <h4>{t('bazaar.profit.breakEvenHeading')}</h4>
                  <div className="be-metric-row">
                    <div className="be-big">
                      <span className="be-big-num">{activeProfitSimulation.breakEvenQuantity}</span>
                      <span className="be-big-unit">{quantityUnit}</span>
                    </div>
                    <div className="be-desc">
                      <p>
                        {isMarathi
                          ? `सर्व खर्च भरून काढण्यासाठी किमान ${activeProfitSimulation.breakEvenQuantity} ${quantityUnit} माल विकावा लागेल.`
                          : `You need to sell at least ${activeProfitSimulation.breakEvenQuantity} ${quantityUnit} to recover all expenses.`}
                      </p>
                      <span className="be-status-tag">
                        {activeProfitSimulation.isBreakEvenAchievable ? (isMarathi ? '✓ सहज साध्य' : '✓ Achievable') : (isMarathi ? '⚠ जोखीम' : '⚠ High Risk')}
                      </span>
                    </div>
                  </div>
                </div>

                {unsoldStockRecovery && (
                  <div className="recovery-card">
                    <h4>{t('bazaar.profit.recoveryTitle')}</h4>
                    <p className="rec-text">{isMarathi ? unsoldStockRecovery.advice : (unsoldStockRecovery.adviceEn || unsoldStockRecovery.advice)}</p>
                    <div className="rec-stats">
                      <span>{isMarathi ? 'अडकलेले भांडवल:' : 'Tied Capital:'} <strong>₹{unsoldStockRecovery.originalInventoryValue}</strong></span>
                      <span>{isMarathi ? 'पुढील प्रवास खर्च:' : 'Next Trip Cost:'} <strong>₹{unsoldStockRecovery.additionalTripCost}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-box">
              <p>{isMarathi ? 'नफा विश्लेषण पाहण्यासाठी कृपया प्रथम बाजारपेठ शोधा.' : 'Please select a market to inspect profit intelligence.'}</p>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: TRAVEL COST INTELLIGENCE */}
      {activeTab === 'travel' && (
        <section className="tab-view-content" aria-label={t('bazaar.tabTravel')}>
          {primaryMarketEvaluation ? (
            <div className="travel-intelligence-layout">
              <div className="travel-hero-card">
                <h3>{t('bazaar.travel.title')}</h3>
                <p className="travel-lead">
                  {isMarathi
                    ? `तुमचे स्थान ते ${primaryMarketEvaluation.market.name_mr || primaryMarketEvaluation.market.name} (${primaryMarketEvaluation.distanceText}) या प्रवासासाठी तुलना:`
                    : `Compare transport modes for the trip to ${primaryMarketEvaluation.market.name} (${primaryMarketEvaluation.distanceText}):`}
                </p>

                {/* All Modes Comparison Table */}
                <div className="travel-table-wrap">
                  <table className="travel-table">
                    <thead>
                      <tr>
                        <th>{t('bazaar.travel.colMode')}</th>
                        <th>{isMarathi ? 'एका बाजूचे अंतर' : 'One-way Distance'}</th>
                        <th>{t('bazaar.travel.roundTripRoad')}</th>
                        <th>{t('bazaar.travel.transitTime')}</th>
                        <th>{t('bazaar.travel.colRoundTripCost')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {travelCostService.compareAllModes(primaryMarketEvaluation.estimatedRoadKm, true).map((m) => {
                        const isCurrent = m.modeId === transportModeId;
                        return (
                          <tr key={m.modeId} className={isCurrent ? 'row-selected' : ''}>
                            <td>
                              <strong>{isMarathi ? m.modeNameMr : m.modeNameEn}</strong>
                              <small>{isMarathi ? m.modeNameEn : m.modeNameMr}</small>
                              {isCurrent && <span className="active-tag">{isMarathi ? 'सध्या निवडलेले' : 'Active Choice'}</span>}
                            </td>
                            <td>{m.oneWayKm} {t('common.units.km')}</td>
                            <td>{m.roundTripKm} {t('common.units.km')}</td>
                            <td>~{m.timeMinutes} {t('common.units.min')}</td>
                            <td>
                              <strong className="cost-pill">₹{m.travelCost}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="travel-notes-box">
                  <AppIcon name="info" size={16} color="#1b5e20" />
                  <span>
                    <strong>{isMarathi ? 'रस्ता अंतर स्पष्टीकरण:' : 'Topographic Circuity Note:'}</strong> {t('bazaar.travel.circuityNotice')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-box">
              <p>{isMarathi ? 'प्रवास खर्च विश्लेषण पाहण्यासाठी प्रथम बाजारपेठ शोधा.' : 'Please select a market to inspect travel intelligence.'}</p>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: MARKET CALENDAR & RISK ALERTS */}
      {activeTab === 'calendar' && (
        <section className="tab-view-content" aria-label={t('bazaar.tabCalendar')}>
          <div className="calendar-layout">
            <div className="calendar-card">
              <div className="cal-header">
                <AppIcon name="calendar" size={20} color="#1b5e20" />
                <h3>{t('bazaar.calendar.title')}</h3>
              </div>

              <div className="cal-grid">
                {DAYS_OF_WEEK.map((day) => {
                  const dayMarkets = allMarkets.filter((m) => m.operatingDay === day);
                  return (
                    <div key={day} className="cal-day-col">
                      <div className="day-col-header">
                        <strong>{isMarathi ? (t(`bazaar.calendar.days.${day}`) || day) : day}</strong>
                        <span className="day-count">{dayMarkets.length} {isMarathi ? 'बाजार' : 'markets'}</span>
                      </div>
                      <div className="day-markets-list">
                        {dayMarkets.map((m) => (
                          <div
                            key={m.id}
                            className="day-mkt-pill"
                            onClick={() => setSelectedMarketForModal({ market: m, evaluation: primaryMarketEvaluation })}
                          >
                            <span className="mkt-name">{isMarathi ? (m.name_mr || m.name) : m.name}</span>
                            <span className="mkt-taluka">{m.taluka}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk & Weather Advisory Alerts */}
            <div className="alerts-card">
              <div className="alerts-header">
                <AppIcon name="shield-check" size={20} color="#1b5e20" />
                <h3>{t('bazaar.calendar.alertsTitle')}</h3>
              </div>
              <div className="alerts-list">
                <div className="alert-item info">
                  <strong>{t('bazaar.calendar.alertPerishableTitle')}:</strong>
                  <p>{t('bazaar.calendar.alertPerishableDesc')}</p>
                </div>
                <div className="alert-item warning">
                  <strong>{t('bazaar.calendar.alertLogisticsTitle')}:</strong>
                  <p>{t('bazaar.calendar.alertLogisticsDesc')}</p>
                </div>
                <div className="alert-item success">
                  <strong>{t('bazaar.calendar.alertTimingTitle')}:</strong>
                  <p>{t('bazaar.calendar.alertTimingDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: VISIT HISTORY & ACTUALS */}
      {activeTab === 'history' && (
        <section className="tab-view-content" aria-label="Visit History & Actuals">
          <BazaarVisitHistorySection
            userId={userId || 'ent_nashik_ramesh_001'}
            onVisitRecorded={loadData}
          />
        </section>
      )}

      {/* TAB 6: SUBMIT NEW MARKET PROPOSAL */}
      {activeTab === 'propose' && (
        <section className="tab-view-content" aria-label="Submit New Market">
          <NewMarketProposalSection
            userId={userId || 'ent_nashik_ramesh_001'}
            onProposalSubmitted={loadData}
          />
        </section>
      )}

      {/* Market Detail Dossier Modal */}
      {selectedMarketForModal && (
        <MarketDetailModal
          market={selectedMarketForModal.market}
          evaluation={selectedMarketForModal.evaluation}
          onClose={() => setSelectedMarketForModal(null)}
        />
      )}
    </div>
  );
}
