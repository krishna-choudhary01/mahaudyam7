import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { sharedResourceService } from '../../services/resources/sharedResourceService';
import { RESOURCE_CATEGORIES } from '../../data/resources/initialSharedResources';
import { locationService } from '../../services/location/locationService';
import { authService } from '../../services/auth/authService';
import './SharedResourceMatcher.css';

export function SharedResourceMatcherModule({ onBack, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.userId || 'guest_user';

  // Active tab: 'catalog' | 'matcher' | 'bookings'
  const [activeTab, setActiveTab] = useState('catalog');

  // Filters State (Catalog)
  const [resources, setResources] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Matcher State (Phase 2)
  const [userDistrictCode, setUserDistrictCode] = useState(490); // Nashik
  const [userTalukaCode, setUserTalukaCode] = useState(4154); // Sinnar
  const [productQuery, setProductQuery] = useState('');
  const [durationUnits, setDurationUnits] = useState(2);
  const [matchedResults, setMatchedResults] = useState([]);
  const [isMatching, setIsMatching] = useState(false);

  // Booking State (Phase 3)
  const [bookings, setBookings] = useState([]);
  const [selectedResourceForBooking, setSelectedResourceForBooking] = useState(null);
  const [bookingStartDate, setBookingStartDate] = useState('');
  const [bookingEndDate, setBookingEndDate] = useState('');
  const [bookingDuration, setBookingDuration] = useState(1);
  const [plannedUse, setPlannedUse] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Return & Settlement Modal
  const [returnModalBooking, setReturnModalBooking] = useState(null);
  const [equipmentCondition, setEquipmentCondition] = useState('good');
  const [actualRentalCost, setActualRentalCost] = useState('');
  const [actualOperatorExpense, setActualOperatorExpense] = useState('');
  const [actualFuelExpense, setActualFuelExpense] = useState('');
  const [depositDeductions, setDepositDeductions] = useState(0);
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const dList = locationService.getAllDistricts();
    setDistricts(dList);
    loadCatalog();
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory, searchQuery, selectedDistrict, availabilityFilter]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const list = await sharedResourceService.getAllResources({
        category: selectedCategory,
        search: searchQuery,
        districtCode: selectedDistrict || undefined,
        availabilityStatus: availabilityFilter
      });
      setResources(list);
    } catch (e) {
      console.error('Failed to load shared resources:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const list = await sharedResourceService.getUserBookings(userId);
      setBookings(list);
    } catch (e) {
      console.error('Failed to load user bookings:', e);
    }
  };

  const handleRunMatcher = async () => {
    setIsMatching(true);
    try {
      const userLocation = {
        districtCode: userDistrictCode,
        talukaCode: userTalukaCode,
        coordinates: { lat: 19.8500, lng: 74.0000 }
      };

      const results = await sharedResourceService.matchSharedResources({
        userLocation,
        category: selectedCategory,
        productQuery,
        durationUnits: Number(durationUnits) || 1
      });
      setMatchedResults(results);
    } catch (e) {
      console.error('Error matching shared resources:', e);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!selectedResourceForBooking) return;
    try {
      await sharedResourceService.createBookingRequest(userId, {
        resourceId: selectedResourceForBooking.id,
        startDate: bookingStartDate,
        endDate: bookingEndDate,
        durationUnits: Number(bookingDuration) || selectedResourceForBooking.minRentalDuration,
        plannedUse,
        notes: bookingNotes
      });
      showToast(isMarathi ? 'साधन आरक्षणाची विनंती पाठवली!' : 'Resource booking request submitted!');
      setSelectedResourceForBooking(null);
      setPlannedUse('');
      setBookingNotes('');
      loadBookings();
      setActiveTab('bookings');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      await sharedResourceService.confirmBooking(userId, bookingId);
      showToast(isMarathi ? 'आरक्षण निश्चित करण्यात आले!' : 'Booking confirmed!');
      loadBookings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartUse = async (bookingId) => {
    try {
      await sharedResourceService.startResourceUse(userId, bookingId);
      showToast(isMarathi ? 'साधन वापरात असल्याचे नोंदवले!' : 'Resource marked as in-use!');
      loadBookings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRecordReturn = async (e) => {
    e.preventDefault();
    if (!returnModalBooking) return;
    try {
      await sharedResourceService.recordReturnAndSettlement(userId, returnModalBooking.id, {
        equipmentCondition,
        actualRentalCost: Number(actualRentalCost),
        actualOperatorExpense: Number(actualOperatorExpense || 0),
        actualFuelExpense: Number(actualFuelExpense || 0),
        depositDeductions: Number(depositDeductions || 0),
        notes: reconciliationNotes
      });
      showToast(isMarathi ? 'साधन परत जमा आणि अंतिम हिशोब पूर्ण!' : 'Asset return and settlement recorded!');
      setReturnModalBooking(null);
      loadBookings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getCategoryTitle = (catKey) => {
    switch (catKey) {
      case 'farm_machinery': return isMarathi ? 'शेती अवजारे व ट्रॅक्टर' : 'Farm Machinery';
      case 'processing_equipment': return isMarathi ? 'प्रक्रिया यंत्रसामग्री' : 'Processing Equipment';
      case 'storage_facility': return isMarathi ? 'शीतगृह व साठवणूक' : 'Storage Facility';
      case 'packaging_grading': return isMarathi ? 'पॅकिंग व प्रतवारी' : 'Packaging & Grading';
      case 'harvest_post_harvest': return isMarathi ? 'कापणी व मळणी यंत्रे' : 'Harvest Implements';
      default: return catKey;
    }
  };

  return (
    <div className="shared-resource-module">
      {/* Topbar Header */}
      <div className="module-topbar">
        <button type="button" className="btn-back" onClick={onBack}>
          <AppIcon name="arrow-left" size={18} />
          <span>{isMarathi ? 'मुख्य पृष्ठ' : 'Home'}</span>
        </button>
        <div className="module-title-wrap">
          <span className="module-badge">
            <AppIcon name="share" size={16} />
            {isMarathi ? 'सामायिक यंत्रे व सुविधा' : 'Shared Equipment & Storage'}
          </span>
          <h1 className="module-heading">
            {isMarathi ? 'सामायिक साधनसंपत्ती भागीदार' : 'Shared Resource Matcher'}
          </h1>
        </div>
      </div>

      {notification && (
        <div className={`toast-alert toast-${notification.type}`}>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="resource-tabs" role="tablist">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          🚜 {isMarathi ? 'उपलब्ध साधने सूची (Phase 1)' : 'Available Assets (Phase 1)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'matcher' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('matcher');
            if (matchedResults.length === 0) handleRunMatcher();
          }}
        >
          🎯 {isMarathi ? 'साधन सुसंगतता व भाडे (Phase 2)' : 'Match & Rental Estimator (Phase 2)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 {isMarathi ? 'माझे आरक्षण व हिशोब (Phase 3)' : 'Bookings & Returns (Phase 3)'}
          {bookings.length > 0 && <span className="tab-pill">{bookings.length}</span>}
        </button>
      </div>

      {/* TAB 1: Asset Directory */}
      {activeTab === 'catalog' && (
        <div className="catalog-view">
          <div className="filter-card">
            <div className="search-bar-row">
              <input
                type="text"
                placeholder={isMarathi ? 'साधन किंवा यंत्र शोधा...' : 'Search assets or machinery...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">{isMarathi ? 'सर्व प्रकार (All Categories)' : 'All Categories'}</option>
                {Object.values(RESOURCE_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{getCategoryTitle(cat)}</option>
                ))}
              </select>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="filter-select"
              >
                <option value="">{isMarathi ? 'सर्व जिल्हे (All Districts)' : 'All Districts'}</option>
                {districts.map((d) => (
                  <option key={d.code} value={d.code}>
                    {isMarathi ? d.name_mr : d.name}
                  </option>
                ))}
              </select>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">{isMarathi ? 'सर्व स्थिती' : 'All Status'}</option>
                <option value="available">{isMarathi ? 'उपलब्ध (Available)' : 'Available'}</option>
                <option value="rented">{isMarathi ? 'भाड्याने गेलेले (Rented)' : 'Rented'}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <AppIcon name="sync" size={24} className="spin" />
              <p>{isMarathi ? 'साधनसंपत्ती सूची लोड होत आहे...' : 'Loading shared resources...'}</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="empty-state">
              <p>{isMarathi ? 'कोणतेही सामायिक साधन सापडले नाही.' : 'No shared resources found matching criteria.'}</p>
            </div>
          ) : (
            <div className="resources-grid">
              {resources.map((res) => (
                <div key={res.id} className="resource-card">
                  <div className="res-card-header">
                    <span className="res-category-pill">{getCategoryTitle(res.category)}</span>
                    <span className={`res-avail-badge avail-${res.availabilityStatus}`}>
                      {res.availabilityStatus === 'available'
                        ? (isMarathi ? '● उपलब्ध' : '● Available')
                        : (isMarathi ? '○ आरक्षित' : '○ In Use')}
                    </span>
                  </div>

                  <h3 className="res-title">{isMarathi ? res.resourceName_mr : res.resourceName}</h3>
                  <p className="res-specs">{res.specifications}</p>

                  <div className="res-metrics">
                    <div className="metric-box">
                      <span className="metric-lbl">{isMarathi ? 'भाडे दर' : 'Rental Rate'}</span>
                      <span className="metric-val">₹{res.rentalRate} <small>/{res.rateUnit}</small></span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-lbl">{isMarathi ? 'ठेव अनामत' : 'Deposit'}</span>
                      <span className="metric-val">₹{res.depositAmount}</span>
                    </div>
                  </div>

                  {res.suitableProducts && res.suitableProducts.length > 0 && (
                    <div className="suitable-tags">
                      <span className="tags-label">{isMarathi ? 'योग्य पिके/उत्पादने:' : 'Suitable for:'}</span>
                      <div className="tag-chips">
                        {(isMarathi ? res.suitableProducts_mr : res.suitableProducts).map((prod, i) => (
                          <span key={i} className="chip">{prod}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="res-owner-box">
                    <div className="owner-title">🏢 {isMarathi ? res.ownerName_mr : res.ownerName}</div>
                    <div className="owner-loc">📍 {res.village}, {res.taluka}, {res.district}</div>
                    <div className="owner-source">🛡️ <small>{res.verificationSource}</small></div>
                  </div>

                  <div className="res-actions">
                    <button
                      type="button"
                      className="btn-book"
                      onClick={() => {
                        setSelectedResourceForBooking(res);
                        setBookingDuration(res.minRentalDuration);
                      }}
                    >
                      📅 {isMarathi ? 'आरक्षण विनंती करा' : 'Book Asset'}
                    </button>
                    <button
                      type="button"
                      className="btn-compat"
                      onClick={() => {
                        setSelectedCategory(res.category);
                        setActiveTab('matcher');
                        handleRunMatcher();
                      }}
                    >
                      🎯 {isMarathi ? 'सुसंगतता तपासा' : 'Check Suitability'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Matcher & Feasibility Estimator */}
      {activeTab === 'matcher' && (
        <div className="matcher-view">
          <div className="matcher-controls-card">
            <h3 className="matcher-title">
              🎯 {isMarathi ? 'उद्योजक आवश्यकता व साधन जुळवणी' : 'Requirement & Asset Matching'}
            </h3>
            <p className="matcher-subtext">
              {isMarathi
                ? 'तुमच्या पिकासाठी किंवा उत्पादनासाठी योग्य यंत्रे, प्रवास अंतर व एकूण अंदाजे भाडे खर्च तपासा.'
                : 'Match verified farm machinery or processing units based on your product, location & duration.'}
            </p>

            <div className="matcher-form-grid">
              <div className="form-group">
                <label>{isMarathi ? 'जिल्हा' : 'District'}</label>
                <select
                  value={userDistrictCode}
                  onChange={(e) => setUserDistrictCode(Number(e.target.value))}
                  className="form-control"
                >
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {isMarathi ? d.name_mr : d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'पीक / उत्पादन (उदा. टोमॅटो, तूर, कांदा)' : 'Crop / Product (e.g. Tomato, Tur)'}</label>
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder={isMarathi ? 'उदा. टोमॅटो वाळवणे किंवा तूर डाळ' : 'e.g. Tomato drying or Tur dal'}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'कालावधी (दिवस किंवा तास)' : 'Duration (Days / Hours)'}</label>
                <input
                  type="number"
                  min="1"
                  value={durationUnits}
                  onChange={(e) => setDurationUnits(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group btn-col">
                <button
                  type="button"
                  className="btn-calculate"
                  onClick={handleRunMatcher}
                  disabled={isMatching}
                >
                  {isMatching
                    ? (isMarathi ? 'तपासणी चालू आहे...' : 'Matching...')
                    : (isMarathi ? '⚡ साधन जुळवणी करा' : '⚡ Match Shared Assets')}
                </button>
              </div>
            </div>
          </div>

          <div className="matcher-results-section">
            <h4 className="results-heading">
              {isMarathi ? 'शिफारस केलेली साधने (सुसंगततेनुसार क्रमवारी)' : 'Recommended Assets (Ranked by Suitability & Feasibility)'}
            </h4>

            {isMatching ? (
              <div className="loading-state">
                <AppIcon name="sync" size={24} className="spin" />
                <p>{isMarathi ? 'साधनांची उपलब्धता व अंतर तपासत आहे...' : 'Analyzing asset compatibility and road distances...'}</p>
              </div>
            ) : matchedResults.length === 0 ? (
              <div className="empty-state">
                <p>{isMarathi ? 'साधन जुळवणी पाहण्यासाठी वरील बटणावर क्लिक करा.' : 'Click Match Shared Assets to evaluate options.'}</p>
              </div>
            ) : (
              <div className="ranked-sources-list">
                {matchedResults.map((res, idx) => (
                  <div key={res.resource.id} className="source-ranked-card">
                    <div className="source-rank-badge">#{idx + 1}</div>

                    <div className="source-main-info">
                      <div className="source-header-row">
                        <h4 className="source-name">
                          {isMarathi ? res.resource.resourceName_mr : res.resource.resourceName}
                        </h4>
                        <span className="source-score-pill">
                          ⭐ {res.score}/100 {isMarathi ? 'सुसंगतता' : 'Match'}
                        </span>
                      </div>

                      <div className="source-supplier-name">
                        🏢 {isMarathi ? res.resource.ownerName_mr : res.resource.ownerName} • {res.resource.village}, {res.resource.taluka}
                      </div>

                      <div className="route-metrics-bar">
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'रस्त्याचे अंतर' : 'Road Distance'}</span>
                          <span className="r-val">{res.estimatedRoadKm ? `${res.estimatedRoadKm} km` : 'N/A'}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'भाडे शुल्क' : 'Rental Fee'}</span>
                          <span className="r-val">₹{res.grossRentalFee} <small>({res.durationApplied} {res.resource.rateUnit})</small></span>
                        </div>
                        {res.operatorFee > 0 && (
                          <div className="route-metric">
                            <span className="r-label">{isMarathi ? 'चालक खर्च' : 'Operator Fee'}</span>
                            <span className="r-val">₹{res.operatorFee}</span>
                          </div>
                        )}
                        <div className="route-metric highlight">
                          <span className="r-label">{isMarathi ? 'एकूण अंदाजे भाडे खर्च' : 'Total Est. Expense'}</span>
                          <span className="r-val">₹{res.totalEstimatedRentalExpense}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'परतावा अनामत' : 'Refundable Deposit'}</span>
                          <span className="r-val">₹{res.refundableDeposit}</span>
                        </div>
                      </div>

                      <div className={`moq-alert-banner ${res.isProductCompatible ? 'moq-ok' : 'moq-warn'}`}>
                        <span>{res.isProductCompatible ? '✅' : 'ℹ️'} {isMarathi ? res.compReason_mr : res.compReason_en}</span>
                      </div>
                    </div>

                    <div className="source-actions">
                      <button
                        type="button"
                        className="btn-order-now"
                        onClick={() => {
                          setSelectedResourceForBooking(res.resource);
                          setBookingDuration(res.durationApplied);
                        }}
                      >
                        📅 {isMarathi ? 'आरक्षण करा' : 'Book Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Bookings & Returns Ledger */}
      {activeTab === 'bookings' && (
        <div className="bookings-view">
          <div className="procurement-header">
            <div>
              <h3 className="procurement-title">
                📋 {isMarathi ? 'माझी साधन आरक्षणाची नोंदवही' : 'My Resource Bookings & Return Ledger'}
              </h3>
              <p className="procurement-sub">
                {isMarathi
                  ? 'भाड्याने घेतलेली अवजारे, प्रक्रिया यंत्रे आणि अनामत परताव्याचा अचूक हिशोब.'
                  : 'Track asset bookings, active usage, equipment returns, deposit refunds, and net rental expenses.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-sync-enquiries"
              onClick={async () => {
                const res = await sharedResourceService.syncPendingBookings(userId);
                showToast(isMarathi ? `${res.synchronizedCount} आरक्षणे समक्रमित झाली.` : `Synchronized ${res.synchronizedCount} bookings.`);
                loadBookings();
              }}
            >
              <AppIcon name="sync" size={16} />
              {isMarathi ? 'ऑफलाइन डेटा समक्रमित करा' : 'Sync Offline Bookings'}
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="empty-state">
              <p>{isMarathi ? 'अद्याप कोणतेही साधन आरक्षित केलेले नाही. उपलब्ध साधनांमधून आरक्षण विनंती करा.' : 'No resource bookings recorded yet. Select an asset from the catalog.'}</p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setActiveTab('catalog')}
              >
                🚜 {isMarathi ? 'साधन सूची उघडा' : 'Browse Shared Assets'}
              </button>
            </div>
          ) : (
            <div className="enquiries-list">
              {bookings.map((bk) => (
                <div key={bk.id} className="enquiry-card">
                  <div className="enquiry-card-top">
                    <div>
                      <span className="enquiry-id">#{bk.id}</span>
                      <h4 className="enquiry-mat-name">
                        {isMarathi ? bk.resourceName_mr : bk.resourceName}
                      </h4>
                      <div className="enquiry-sup-name">
                        🏢 {isMarathi ? bk.ownerName_mr : bk.ownerName} • 📞 {bk.ownerPhone}
                      </div>
                    </div>
                    <div className="status-badge-wrap">
                      <span className={`status-pill status-${bk.bookingStatus}`}>
                        {bk.bookingStatus === 'booking_requested' && (isMarathi ? 'आरक्षण विनंती पाठवली' : 'Booking Requested')}
                        {bk.bookingStatus === 'confirmed' && (isMarathi ? 'आरक्षण निश्चित' : 'Booking Confirmed')}
                        {bk.bookingStatus === 'in_use' && (isMarathi ? 'साधन वापरात आहे' : 'In Use')}
                        {bk.bookingStatus === 'returned' && (isMarathi ? 'परत जमा (Returned)' : 'Returned & Settled')}
                      </span>
                      <span className="sync-badge">
                        {bk.syncStatus === 'synced' ? '☁️ Synced' : '💾 Offline (Pending Sync)'}
                      </span>
                    </div>
                  </div>

                  <div className="enquiry-details-grid">
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'कालावधी' : 'Duration'}</span>
                      <span className="val">{bk.durationUnits} {bk.rateUnit}</span>
                    </div>
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'भाडे दर' : 'Rate'}</span>
                      <span className="val">₹{bk.ratePerUnit} /{bk.rateUnit}</span>
                    </div>
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'अनामत रक्कम' : 'Deposit'}</span>
                      <span className="val">₹{bk.depositAmount}</span>
                    </div>
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'अंदाजे एकूण खर्च' : 'Est. Total'}</span>
                      <span className="val highlight">₹{bk.estimatedTotalCost}</span>
                    </div>
                  </div>

                  {bk.plannedUse && (
                    <div className="planned-use-note">
                      <strong>🌾 {isMarathi ? 'नियोजित वापर:' : 'Planned Use:'}</strong> {bk.plannedUse}
                    </div>
                  )}

                  {/* Return Settlement Details if completed */}
                  {bk.returnDetails && (
                    <div className="po-panel">
                      <div className="panel-title">
                        🏆 {isMarathi ? 'साधन परतावा व अंतिम हिशोब पावती' : 'Return Settlement & Final Expense Ledger'}
                      </div>
                      <div className="po-metrics-grid">
                        <div>
                          <span className="lbl">{isMarathi ? 'साधन स्थिती' : 'Condition'}</span>
                          <span className="val">{bk.returnDetails.equipmentCondition.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'प्रत्यक्ष भाडे' : 'Actual Rental'}</span>
                          <span className="val">₹{bk.returnDetails.actualRentalCost}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'चालक व इंधन' : 'Operator & Fuel'}</span>
                          <span className="val">₹{bk.returnDetails.actualOperatorExpense + bk.returnDetails.actualFuelExpense}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'अनामत परतावा' : 'Deposit Refunded'}</span>
                          <span className="val bold">₹{bk.returnDetails.depositRefunded}</span>
                        </div>
                        <div className="total-expense-col">
                          <span className="lbl">{isMarathi ? 'निव्वळ प्रत्यक्ष खर्च' : 'Net Total Expense'}</span>
                          <span className="val highlight">₹{bk.returnDetails.totalNetExpense}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Booking Workflow Actions */}
                  <div className="enquiry-actions-bar">
                    {bk.bookingStatus === 'booking_requested' && (
                      <button
                        type="button"
                        className="btn-confirm-po"
                        onClick={() => handleConfirmBooking(bk.id)}
                      >
                        ✅ {isMarathi ? 'आरक्षण निश्चित करा (Confirm Booking)' : 'Confirm Booking'}
                      </button>
                    )}

                    {bk.bookingStatus === 'confirmed' && (
                      <button
                        type="button"
                        className="btn-record-quote"
                        onClick={() => handleStartUse(bk.id)}
                      >
                        🚜 {isMarathi ? 'साधन वापरणे सुरू करा' : 'Start Resource Use'}
                      </button>
                    )}

                    {bk.bookingStatus === 'in_use' && (
                      <button
                        type="button"
                        className="btn-confirm-po"
                        onClick={() => {
                          setReturnModalBooking(bk);
                          setActualRentalCost(bk.grossRentalFee);
                          setActualOperatorExpense(bk.operatorFee);
                          setActualFuelExpense(0);
                          setDepositDeductions(0);
                        }}
                      >
                        🔄 {isMarathi ? 'साधन परत जमा व अंतिम हिशोब' : 'Record Return & Settlement'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Booking */}
      {selectedResourceForBooking && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📅 {isMarathi ? 'साधन आरक्षण विनंती' : 'Book Shared Resource'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedResourceForBooking(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                <p className="enquiry-summary">
                  <strong>{isMarathi ? selectedResourceForBooking.resourceName_mr : selectedResourceForBooking.resourceName}</strong>
                  <br />
                  <small>🏢 {isMarathi ? selectedResourceForBooking.ownerName_mr : selectedResourceForBooking.ownerName} • ₹{selectedResourceForBooking.rentalRate}/{selectedResourceForBooking.rateUnit}</small>
                </p>

                <div className="form-group">
                  <label>{isMarathi ? 'कालावधी (Duration Units)' : 'Duration Units'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bookingDuration}
                    onChange={(e) => setBookingDuration(e.target.value)}
                    className="form-control"
                  />
                  <small className="hint">
                    {isMarathi ? `किमान कालावधी: ${selectedResourceForBooking.minRentalDuration} ${selectedResourceForBooking.rateUnit}` : `Min duration: ${selectedResourceForBooking.minRentalDuration} ${selectedResourceForBooking.rateUnit}`}
                  </small>
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'आरक्षण सुरू तारीख' : 'Start Date'}</label>
                  <input
                    type="date"
                    required
                    value={bookingStartDate}
                    onChange={(e) => setBookingStartDate(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'नियोजित वापर (पीक किंवा प्रक्रिया)' : 'Planned Use (Crop / Process)'}</label>
                  <input
                    type="text"
                    required
                    value={plannedUse}
                    onChange={(e) => setPlannedUse(e.target.value)}
                    placeholder={isMarathi ? 'उदा. ५०० किलो टोमॅटो डिहायड्रेशन' : 'e.g. 500 kg tomato dehydration'}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'टीप किंवा विशेष आवश्यकता' : 'Notes / Special Requests'}</label>
                  <textarea
                    rows="2"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="form-control"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setSelectedResourceForBooking(null)}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit">
                  {isMarathi ? 'आरक्षण विनंती पाठवा' : 'Request Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Return & Settlement */}
      {returnModalBooking && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>🔄 {isMarathi ? 'साधन परतावा व हिशोब' : 'Asset Return & Settlement'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setReturnModalBooking(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordReturn}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{isMarathi ? 'साधनाची परत करताना स्थिती' : 'Equipment Return Condition'}</label>
                  <select
                    value={equipmentCondition}
                    onChange={(e) => setEquipmentCondition(e.target.value)}
                    className="form-control"
                  >
                    <option value="good">{isMarathi ? 'उत्कृष्ट / सुरक्षित (Good)' : 'Good Condition'}</option>
                    <option value="minor_wear">{isMarathi ? 'सामान्य वापर झीज (Minor Wear)' : 'Minor Normal Wear'}</option>
                    <option value="damaged">{isMarathi ? 'नुकसान / दुरुस्ती आवश्यक (Damaged)' : 'Damaged / Repairs Needed'}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'प्रत्यक्ष भाडे खर्च (₹)' : 'Actual Rental Fee (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={actualRentalCost}
                    onChange={(e) => setActualRentalCost(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'चालक खर्च (₹)' : 'Operator Expense (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={actualOperatorExpense}
                    onChange={(e) => setActualOperatorExpense(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'इंधन खर्च (₹)' : 'Fuel Expense (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={actualFuelExpense}
                    onChange={(e) => setActualFuelExpense(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'अनामत कपात / नुकसान भरपाई (₹)' : 'Deposit Deductions (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={depositDeductions}
                    onChange={(e) => setDepositDeductions(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setReturnModalBooking(null)}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit">
                  {isMarathi ? 'हिशोब पूर्ण करा' : 'Complete Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
