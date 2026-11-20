import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { rawMaterialService } from '../../services/materials/rawMaterialService';
import { RAW_MATERIAL_CATEGORIES } from '../../data/materials/initialRawMaterials';
import { locationService } from '../../services/location/locationService';
import { authService } from '../../services/auth/authService';
import { TRANSPORT_MODES } from '../../services/bazaar/travelCostService';
import './RawMaterialRouteFinder.css';

export function RawMaterialRouteFinderModule({ onBack, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.userId || 'guest_user';

  // Tabs: 'directory' | 'matcher' | 'procurement'
  const [activeTab, setActiveTab] = useState('directory');

  // Filters state (Directory)
  const [materials, setMaterials] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Matcher State (Phase 2)
  const [userDistrictCode, setUserDistrictCode] = useState(490); // Default: Nashik
  const [userTalukaCode, setUserTalukaCode] = useState(4154); // Sinnar
  const [quantityNeeded, setQuantityNeeded] = useState(100);
  const [transportMode, setTransportMode] = useState('mini_truck');
  const [matchedResults, setMatchedResults] = useState([]);
  const [isMatching, setIsMatching] = useState(false);

  // Procurement State (Phase 3)
  const [enquiries, setEnquiries] = useState([]);
  const [selectedMaterialForEnquiry, setSelectedMaterialForEnquiry] = useState(null);
  const [enquiryQty, setEnquiryQty] = useState(100);
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Quotation recording modal
  const [quotationModalEnquiry, setQuotationModalEnquiry] = useState(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteFreight, setQuoteFreight] = useState('');
  const [quoteLeadDays, setQuoteLeadDays] = useState(3);
  const [quoteTerms, setQuoteTerms] = useState('Payment upon delivery');

  // Order confirmation modal
  const [orderModalEnquiry, setOrderModalEnquiry] = useState(null);
  const [agreedQty, setAgreedQty] = useState('');
  const [agreedPrice, setAgreedPrice] = useState('');
  const [agreedTransport, setAgreedTransport] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending_payment');

  const [notification, setNotification] = useState(null);

  // Load districts and initial catalog
  useEffect(() => {
    const dList = locationService.getAllDistricts();
    setDistricts(dList);
    loadCatalog();
  }, []);

  // Reload catalog when filters change
  useEffect(() => {
    loadCatalog();
  }, [selectedCategory, searchQuery, selectedDistrict]);

  // Load user enquiries when tab switches to procurement
  useEffect(() => {
    if (activeTab === 'procurement') {
      loadEnquiries();
    }
  }, [activeTab]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const list = await rawMaterialService.getAllMaterials({
        category: selectedCategory,
        search: searchQuery,
        districtCode: selectedDistrict || undefined
      });
      setMaterials(list);
    } catch (e) {
      console.error('Failed to load raw materials:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadEnquiries = async () => {
    try {
      const list = await rawMaterialService.getEnquiryHistory(userId);
      setEnquiries(list);
    } catch (e) {
      console.error('Failed to load enquiries:', e);
    }
  };

  const handleRunMatcher = async () => {
    setIsMatching(true);
    try {
      // Baragaon Pimpri Sinnar coordinates as baseline reference
      const userLocation = {
        districtCode: userDistrictCode,
        talukaCode: userTalukaCode,
        coordinates: { lat: 19.8500, lng: 74.0000 }
      };

      const results = await rawMaterialService.matchRawMaterialSources({
        userLocation,
        category: selectedCategory,
        searchQuery,
        quantityNeeded: Number(quantityNeeded) || 1,
        transportModeId: transportMode
      });
      setMatchedResults(results);
    } catch (e) {
      console.error('Error running raw material matcher:', e);
    } finally {
      setIsMatching(false);
    }
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    if (!selectedMaterialForEnquiry) return;
    try {
      await rawMaterialService.createProcurementEnquiry(userId, {
        materialId: selectedMaterialForEnquiry.id,
        quantityNeeded: Number(enquiryQty) || selectedMaterialForEnquiry.minOrderQuantity,
        expectedDeliveryDate: expectedDate,
        deliveryLocation: deliveryLocation || `${selectedMaterialForEnquiry.village}, ${selectedMaterialForEnquiry.taluka}`,
        notes: enquiryNotes
      });
      showToast(isMarathi ? 'खरेदी चौकशी यशस्वीरीत्या पाठवली!' : 'Procurement enquiry sent successfully!');
      setSelectedMaterialForEnquiry(null);
      setEnquiryNotes('');
      setExpectedDate('');
      loadEnquiries();
      setActiveTab('procurement');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    if (!quotationModalEnquiry) return;
    try {
      await rawMaterialService.recordSupplierQuotation(userId, quotationModalEnquiry.id, {
        quotedPricePerUnit: Number(quotePrice),
        freightCharges: Number(quoteFreight || 0),
        deliveryLeadDays: Number(quoteLeadDays || 3),
        paymentTerms: quoteTerms
      });
      showToast(isMarathi ? 'दरपत्रक (Quotation) नोंदवले गेले!' : 'Supplier quotation recorded!');
      setQuotationModalEnquiry(null);
      loadEnquiries();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    if (!orderModalEnquiry) return;
    try {
      await rawMaterialService.confirmPurchaseOrder(userId, orderModalEnquiry.id, {
        agreedQuantity: Number(agreedQty),
        agreedPricePerUnit: Number(agreedPrice),
        actualTransportExpense: Number(agreedTransport || 0),
        paymentStatus
      });
      showToast(isMarathi ? 'खरेदी आदेश (PO) निश्चित करण्यात आला!' : 'Purchase Order confirmed successfully!');
      setOrderModalEnquiry(null);
      loadEnquiries();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getCategoryTitle = (catKey) => {
    switch (catKey) {
      case 'packaging_materials': return isMarathi ? 'पॅकेजिंग साहित्य' : 'Packaging Materials';
      case 'agri_produce': return isMarathi ? 'शेतमाल व धान्य' : 'Agri Produce';
      case 'food_ingredients': return isMarathi ? 'अन्न घटक व मसाले' : 'Food Ingredients';
      case 'farm_inputs': return isMarathi ? 'शेती निविष्ठा व खते' : 'Farm Inputs';
      case 'textiles_yarn': return isMarathi ? 'धागे व वस्त्र' : 'Textiles & Yarn';
      case 'equipment_spares': return isMarathi ? 'यंत्रसामग्री व सुटे भाग' : 'Equipment Spares';
      case 'construction_hardware': return isMarathi ? 'बांधकाम व हार्डवेअर' : 'Construction Hardware';
      default: return catKey;
    }
  };

  return (
    <div className="raw-material-module">
      {/* Module Navigation Header */}
      <div className="module-topbar">
        <button type="button" className="btn-back" onClick={onBack}>
          <AppIcon name="arrow-left" size={18} />
          <span>{isMarathi ? 'मुख्य पृष्ठ' : 'Home'}</span>
        </button>
        <div className="module-title-wrap">
          <span className="module-badge">
            <AppIcon name="route" size={16} />
            {isMarathi ? 'कच्चा माल व पुरवठा मार्ग' : 'Raw Material & Supply Routes'}
          </span>
          <h1 className="module-heading">
            {isMarathi ? 'कच्चा माल व वाहतूक मार्ग शोधक' : 'Raw-Material Source and Route Finder'}
          </h1>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`toast-alert toast-${notification.type}`}>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Multi-Tab Navigation */}
      <div className="material-tabs" role="tablist">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          📂 {isMarathi ? 'पुरवठादार सूची (Phase 1)' : 'Verified Suppliers (Phase 1)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'matcher' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('matcher');
            if (matchedResults.length === 0) handleRunMatcher();
          }}
        >
          🗺️ {isMarathi ? 'मार्ग व खर्च विश्लेषक (Phase 2)' : 'Route & Landed Cost (Phase 2)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'procurement' ? 'active' : ''}`}
          onClick={() => setActiveTab('procurement')}
        >
          📝 {isMarathi ? 'खरेदी आदेश व नोंदवही (Phase 3)' : 'Procurement & Orders (Phase 3)'}
          {enquiries.length > 0 && <span className="tab-pill">{enquiries.length}</span>}
        </button>
      </div>

      {/* TAB 1: Verified Directory & Catalog */}
      {activeTab === 'directory' && (
        <div className="directory-view">
          <div className="filter-card">
            <div className="search-bar-row">
              <input
                type="text"
                placeholder={isMarathi ? 'कच्चा माल किंवा पुरवठादाराचे नाव शोधा...' : 'Search raw material or supplier name...'}
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
                {Object.values(RAW_MATERIAL_CATEGORIES).map((cat) => (
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
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <AppIcon name="sync" size={24} className="spin" />
              <p>{isMarathi ? 'कच्च्या मालाची माहिती लोड होत आहे...' : 'Loading raw material catalog...'}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="empty-state">
              <p>{isMarathi ? 'निवडलेल्या निकषांनुसार कोणताही कच्चा माल उपलब्ध नाही.' : 'No raw materials matched your search.'}</p>
            </div>
          ) : (
            <div className="materials-grid">
              {materials.map((mat) => (
                <div key={mat.id} className="material-card">
                  <div className="mat-card-header">
                    <span className="mat-category-pill">{getCategoryTitle(mat.category)}</span>
                    <span className="mat-verify-badge">
                      <AppIcon name="check" size={14} />
                      {mat.verificationStatus === 'verified'
                        ? (isMarathi ? 'अधिकृत पुरवठादार' : 'Verified Supplier')
                        : mat.verificationStatus}
                    </span>
                  </div>

                  <h3 className="mat-title">{isMarathi ? mat.materialName_mr : mat.materialName}</h3>
                  <p className="mat-specs">{mat.specifications}</p>

                  <div className="mat-metrics">
                    <div className="metric-box">
                      <span className="metric-lbl">{isMarathi ? 'दर / प्रति नग' : 'Rate / Unit'}</span>
                      <span className="metric-val">₹{mat.pricePerUnit} <small>/{mat.unit}</small></span>
                    </div>
                    <div className="metric-box">
                      <span className="metric-lbl">{isMarathi ? 'किमान खरेदी' : 'Min Order (MOQ)'}</span>
                      <span className="metric-val">{mat.minOrderQuantity} <small>{mat.unit}</small></span>
                    </div>
                  </div>

                  <div className="mat-supplier-info">
                    <div className="supplier-row">
                      <strong>🏢 {isMarathi ? mat.supplierName_mr : mat.supplierName}</strong>
                    </div>
                    <div className="supplier-location">
                      📍 {mat.village}, {mat.taluka}, {mat.district}
                    </div>
                    {mat.verificationSource && (
                      <div className="supplier-source">
                        🛡️ <small>{mat.verificationSource}</small>
                      </div>
                    )}
                  </div>

                  <div className="mat-card-actions">
                    <button
                      type="button"
                      className="btn-enquire"
                      onClick={() => {
                        setSelectedMaterialForEnquiry(mat);
                        setEnquiryQty(mat.minOrderQuantity);
                      }}
                    >
                      ✉️ {isMarathi ? 'चौकशी पाठवा' : 'Send Enquiry'}
                    </button>
                    <button
                      type="button"
                      className="btn-route-calc"
                      onClick={() => {
                        setSelectedCategory(mat.category);
                        setActiveTab('matcher');
                        handleRunMatcher();
                      }}
                    >
                      🛣️ {isMarathi ? 'मार्ग व खर्च तपासा' : 'Check Route & Cost'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Route & Landed Cost Matcher Engine */}
      {activeTab === 'matcher' && (
        <div className="matcher-view">
          <div className="matcher-controls-card">
            <h3 className="matcher-title">
              🎯 {isMarathi ? 'उद्योजक स्थान व खरेदी निकष' : 'Entrepreneur Location & Requirements'}
            </h3>
            <p className="matcher-subtext">
              {isMarathi
                ? 'तुमच्या स्थानापासून रस्त्याचे अचूक अंतर, वाहतूक खर्च व अंतिम पोहोच खर्च (Landed Cost) तपासा.'
                : 'Calculate realistic road distance, freight expenses, and total landed cost to your doorstep.'}
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
                <label>{isMarathi ? 'हवे असलेले प्रमाण (Quantity Needed)' : 'Quantity Needed'}</label>
                <input
                  type="number"
                  min="1"
                  value={quantityNeeded}
                  onChange={(e) => setQuantityNeeded(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'वाहतूक प्रकार (Transport Vehicle)' : 'Transport Vehicle'}</label>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value)}
                  className="form-control"
                >
                  {TRANSPORT_MODES.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {isMarathi ? tm.name_mr : tm.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group btn-col">
                <button
                  type="button"
                  className="btn-calculate"
                  onClick={handleRunMatcher}
                  disabled={isMatching}
                >
                  {isMatching
                    ? (isMarathi ? 'गणना चालू आहे...' : 'Calculating...')
                    : (isMarathi ? '⚡ खर्च व मार्ग विश्लेषित करा' : '⚡ Analyze Routes & Landed Cost')}
                </button>
              </div>
            </div>
          </div>

          <div className="matcher-results-section">
            <h4 className="results-heading">
              {isMarathi ? 'शिफारस केलेले पुरवठादार (अचूक रस्त्यानुसार क्रमवारी)' : 'Recommended Suppliers (Ranked by Landed Cost & Distance)'}
            </h4>

            {isMatching ? (
              <div className="loading-state">
                <AppIcon name="sync" size={24} className="spin" />
                <p>{isMarathi ? 'रस्त्याचे अंतर व भाडे तपासत आहे...' : 'Calculating rural road circuits and freight...'}</p>
              </div>
            ) : matchedResults.length === 0 ? (
              <div className="empty-state">
                <p>{isMarathi ? 'पुरवठादार शोधण्यासाठी वरील बटणावर क्लिक करा.' : 'Click Analyze to find matching sources.'}</p>
              </div>
            ) : (
              <div className="ranked-sources-list">
                {matchedResults.map((res, idx) => (
                  <div key={res.material.id} className="source-ranked-card">
                    <div className="source-rank-badge">#{idx + 1}</div>
                    
                    <div className="source-main-info">
                      <div className="source-header-row">
                        <h4 className="source-name">
                          {isMarathi ? res.material.materialName_mr : res.material.materialName}
                        </h4>
                        <span className="source-score-pill">
                          ⭐ {res.score}/100 {isMarathi ? 'सुसंगतता' : 'Match'}
                        </span>
                      </div>

                      <div className="source-supplier-name">
                        🏢 {isMarathi ? res.material.supplierName_mr : res.material.supplierName} • {res.material.village}, {res.material.taluka}
                      </div>

                      {/* Distance & Route Metrics */}
                      <div className="route-metrics-bar">
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'रस्त्याचे अंतर (१.२५ वळण)' : 'Road Distance (1.25 Circuity)'}</span>
                          <span className="r-val">{res.estimatedRoadKm ? `${res.estimatedRoadKm} km` : 'N/A'}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'अंदाजे मालवाहतूक खर्च' : 'Est. Round-Trip Freight'}</span>
                          <span className="r-val">₹{res.estFreightCost}</span>
                        </div>
                        <div className="route-metric highlight">
                          <span className="r-label">{isMarathi ? 'एकूण पोहोच खर्च (Landed Cost)' : 'Total Landed Cost'}</span>
                          <span className="r-val">₹{res.totalLandedCost}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'प्रति नग अंतिम खर्च' : 'Landed Cost / Unit'}</span>
                          <span className="r-val">₹{res.landedCostPerUnit} <small>/{res.material.unit}</small></span>
                        </div>
                      </div>

                      {/* Minimum Order Quantity alert */}
                      <div className={`moq-alert-banner ${res.isMoqMet ? 'moq-ok' : 'moq-warn'}`}>
                        <span>{res.isMoqMet ? '✅' : '⚠️'} {isMarathi ? res.moqNotice_mr : res.moqNotice_en}</span>
                      </div>
                    </div>

                    <div className="source-actions">
                      <button
                        type="button"
                        className="btn-order-now"
                        onClick={() => {
                          setSelectedMaterialForEnquiry(res.material);
                          setEnquiryQty(res.orderVolume);
                        }}
                      >
                        ✉️ {isMarathi ? 'चौकशी पाठवा' : 'Send Enquiry'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Procurement Enquiries & Purchase Orders */}
      {activeTab === 'procurement' && (
        <div className="procurement-view">
          <div className="procurement-header">
            <div>
              <h3 className="procurement-title">
                📋 {isMarathi ? 'माझे खरेदी आदेश व चौकशी नोंदवही' : 'My Procurement Enquiries & Purchase Orders'}
              </h3>
              <p className="procurement-sub">
                {isMarathi
                  ? 'पुरवठादारांना पाठवलेल्या चौकशी, आलेले दरपत्रक आणि अधिकृत खरेदी आदेशांची सुरक्षित नोंद.'
                  : 'Track formal enquiries, recorded vendor quotations, and final purchase orders with full cost breakdown.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-sync-enquiries"
              onClick={async () => {
                const res = await rawMaterialService.syncPendingEnquiries(userId);
                showToast(isMarathi ? `${res.synchronizedCount} चौकशी समक्रमित झाल्या.` : `Synchronized ${res.synchronizedCount} records.`);
                loadEnquiries();
              }}
            >
              <AppIcon name="sync" size={16} />
              {isMarathi ? 'ऑफलाइन डेटा समक्रमित करा' : 'Sync Offline Records'}
            </button>
          </div>

          {enquiries.length === 0 ? (
            <div className="empty-state">
              <p>{isMarathi ? 'अद्याप कोणत्याही कच्च्या मालाची चौकशी नोंदवलेली नाही. पुरवठादार सूचीमधून चौकशी पाठवा.' : 'No procurement enquiries recorded yet. Send an enquiry from the Directory.'}</p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setActiveTab('directory')}
              >
                📂 {isMarathi ? 'पुरवठादार सूची उघडा' : 'Browse Supplier Catalog'}
              </button>
            </div>
          ) : (
            <div className="enquiries-list">
              {enquiries.map((enq) => (
                <div key={enq.id} className="enquiry-card">
                  <div className="enquiry-card-top">
                    <div>
                      <span className="enquiry-id">#{enq.id}</span>
                      <h4 className="enquiry-mat-name">
                        {isMarathi ? enq.materialName_mr : enq.materialName}
                      </h4>
                      <div className="enquiry-sup-name">
                        🏢 {isMarathi ? enq.supplierName_mr : enq.supplierName} • {enq.deliveryLocation}
                      </div>
                    </div>
                    <div className="status-badge-wrap">
                      <span className={`status-pill status-${enq.status}`}>
                        {enq.status === 'enquiry_sent' && (isMarathi ? 'चौकशी पाठवली' : 'Enquiry Sent')}
                        {enq.status === 'quotation_received' && (isMarathi ? 'दरपत्रक प्राप्त' : 'Quotation Received')}
                        {enq.status === 'order_confirmed' && (isMarathi ? 'खरेदी आदेश निश्चित (PO)' : 'Order Confirmed')}
                      </span>
                      <span className="sync-badge">
                        {enq.syncStatus === 'synced' ? '☁️ Synced' : '💾 Offline (Pending Sync)'}
                      </span>
                    </div>
                  </div>

                  <div className="enquiry-details-grid">
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'हवे असलेले प्रमाण' : 'Requested Quantity'}</span>
                      <span className="val">{enq.quantityNeeded} {enq.unit}</span>
                    </div>
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'कॅटलॉग दर' : 'Catalog Rate'}</span>
                      <span className="val">₹{enq.catalogPrice} /{enq.unit}</span>
                    </div>
                    <div className="enq-col">
                      <span className="lbl">{isMarathi ? 'चौकशी तारीख' : 'Enquiry Date'}</span>
                      <span className="val">{new Date(enq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Supplier Quotation Details if present */}
                  {enq.quotation && (
                    <div className="quotation-panel">
                      <div className="panel-title">
                        📑 {isMarathi ? 'पुरवठादाराचे दरपत्रक (Supplier Quotation)' : 'Recorded Supplier Quotation'}
                      </div>
                      <div className="quotation-grid">
                        <div>
                          <span className="lbl">{isMarathi ? 'निश्चित दर' : 'Quoted Unit Rate'}</span>
                          <span className="val">₹{enq.quotation.quotedPricePerUnit} /{enq.unit}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'वाहतूक खर्च' : 'Freight Charges'}</span>
                          <span className="val">₹{enq.quotation.freightCharges}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'एकूण कोटेशन' : 'Total Quotation'}</span>
                          <span className="val bold">₹{enq.quotation.totalQuotationAmount}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'पोहोच दिवस' : 'Lead Time'}</span>
                          <span className="val">{enq.quotation.deliveryLeadDays} days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Final Purchase Order Details if present */}
                  {enq.purchaseConfirmation && (
                    <div className="po-panel">
                      <div className="panel-title">
                        🏆 {isMarathi ? `अधिकृत खरेदी पावती (${enq.purchaseConfirmation.poNumber})` : `Confirmed Purchase Order (${enq.purchaseConfirmation.poNumber})`}
                      </div>
                      <div className="po-metrics-grid">
                        <div>
                          <span className="lbl">{isMarathi ? 'खरेदी प्रमाण' : 'Final Qty'}</span>
                          <span className="val">{enq.purchaseConfirmation.agreedQuantity} {enq.unit}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'मालाची मूळ किंमत' : 'Material Cost'}</span>
                          <span className="val">₹{enq.purchaseConfirmation.grossPurchaseCost}</span>
                        </div>
                        <div>
                          <span className="lbl">{isMarathi ? 'प्रत्यक्ष वाहतूक' : 'Actual Freight'}</span>
                          <span className="val">₹{enq.purchaseConfirmation.actualTransportExpense}</span>
                        </div>
                        <div className="total-expense-col">
                          <span className="lbl">{isMarathi ? 'एकूण खरेदी खर्च' : 'Total Landed Expense'}</span>
                          <span className="val highlight">₹{enq.purchaseConfirmation.totalProcurementExpense}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Workflow Action Buttons */}
                  <div className="enquiry-actions-bar">
                    {enq.status === 'enquiry_sent' && (
                      <button
                        type="button"
                        className="btn-record-quote"
                        onClick={() => {
                          setQuotationModalEnquiry(enq);
                          setQuotePrice(enq.catalogPrice);
                          setQuoteFreight(0);
                        }}
                      >
                        📝 {isMarathi ? 'पुरवठादाराचे दरपत्रक नोंदवा' : 'Record Supplier Quotation'}
                      </button>
                    )}

                    {enq.status === 'quotation_received' && (
                      <button
                        type="button"
                        className="btn-confirm-po"
                        onClick={() => {
                          setOrderModalEnquiry(enq);
                          setAgreedQty(enq.quantityNeeded);
                          setAgreedPrice(enq.quotation.quotedPricePerUnit);
                          setAgreedTransport(enq.quotation.freightCharges);
                        }}
                      >
                        ✅ {isMarathi ? 'खरेदी आदेश निश्चित करा (Confirm PO)' : 'Confirm Purchase Order (PO)'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create Enquiry */}
      {selectedMaterialForEnquiry && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✉️ {isMarathi ? 'खरेदी चौकशी पाठवा' : 'Send Procurement Enquiry'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedMaterialForEnquiry(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateEnquiry}>
              <div className="modal-body">
                <p className="enquiry-summary">
                  <strong>{isMarathi ? selectedMaterialForEnquiry.materialName_mr : selectedMaterialForEnquiry.materialName}</strong>
                  <br />
                  <small>🏢 {isMarathi ? selectedMaterialForEnquiry.supplierName_mr : selectedMaterialForEnquiry.supplierName}</small>
                </p>

                <div className="form-group">
                  <label>{isMarathi ? 'हवे असलेले प्रमाण (Quantity)' : 'Quantity'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={enquiryQty}
                    onChange={(e) => setEnquiryQty(e.target.value)}
                    className="form-control"
                  />
                  <small className="hint">
                    {isMarathi ? `किमान खरेदी मर्यादा: ${selectedMaterialForEnquiry.minOrderQuantity} ${selectedMaterialForEnquiry.unit}` : `Supplier MOQ: ${selectedMaterialForEnquiry.minOrderQuantity} ${selectedMaterialForEnquiry.unit}`}
                  </small>
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'अपेक्षित पोहोच तारीख' : 'Expected Delivery Date'}</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'पोहोच पत्ता / गाव' : 'Delivery Destination / Village'}</label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder={isMarathi ? 'उदा. बारागाव पिंप्री, सिन्नर' : 'e.g. Baragaon Pimpri, Sinnar'}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'अतिरिक्त सूचना / टीप' : 'Notes / Special Instructions'}</label>
                  <textarea
                    rows="3"
                    value={enquiryNotes}
                    onChange={(e) => setEnquiryNotes(e.target.value)}
                    placeholder={isMarathi ? 'उदा. गुणवत्ता प्रमाणपत्र हवे आहे...' : 'e.g. Quality test certificate needed...'}
                    className="form-control"
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setSelectedMaterialForEnquiry(null)}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit">
                  {isMarathi ? 'चौकशी पाठवा' : 'Send Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Supplier Quotation */}
      {quotationModalEnquiry && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📝 {isMarathi ? 'पुरवठादार दरपत्रक नोंदवा' : 'Record Supplier Quotation'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setQuotationModalEnquiry(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveQuotation}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{isMarathi ? 'निश्चित केलेला प्रति नग दर (₹)' : 'Quoted Price Per Unit (₹)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'वाहतूक खर्च (Freight Charges ₹)' : 'Freight Charges (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={quoteFreight}
                    onChange={(e) => setQuoteFreight(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'पोहोच कालावधी (दिवस)' : 'Delivery Lead Time (Days)'}</label>
                  <input
                    type="number"
                    min="1"
                    value={quoteLeadDays}
                    onChange={(e) => setQuoteLeadDays(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'पेमेंट अटी' : 'Payment Terms'}</label>
                  <input
                    type="text"
                    value={quoteTerms}
                    onChange={(e) => setQuoteTerms(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setQuotationModalEnquiry(null)}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit">
                  {isMarathi ? 'दरपत्रक जतन करा' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirm Purchase Order */}
      {orderModalEnquiry && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✅ {isMarathi ? 'अधिकृत खरेदी आदेश निश्चित करा' : 'Confirm Purchase Order'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setOrderModalEnquiry(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmOrder}>
              <div className="modal-body">
                <div className="form-group">
                  <label>{isMarathi ? 'निश्चित प्रमाण (Agreed Quantity)' : 'Agreed Quantity'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={agreedQty}
                    onChange={(e) => setAgreedQty(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'निश्चित दर प्रति नग (₹)' : 'Agreed Price Per Unit (₹)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'प्रत्यक्ष वाहतूक खर्च (₹)' : 'Actual Transport Expense (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={agreedTransport}
                    onChange={(e) => setAgreedTransport(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>{isMarathi ? 'पेमेंट स्थिती' : 'Payment Status'}</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="form-control"
                  >
                    <option value="pending_payment">{isMarathi ? 'पेमेंट बाकी (Pending)' : 'Pending Payment'}</option>
                    <option value="partially_paid">{isMarathi ? 'अंशतः दिले (Partial)' : 'Partially Paid'}</option>
                    <option value="fully_paid">{isMarathi ? 'पूर्ण दिले (Paid in Full)' : 'Paid in Full'}</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setOrderModalEnquiry(null)}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button type="submit" className="btn-submit">
                  {isMarathi ? 'खरेदी आदेश पूर्ण करा' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
