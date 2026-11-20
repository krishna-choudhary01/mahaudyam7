import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';
import { locationService } from '../../services/location/locationService.js';
import { STOCK_CATEGORIES, PERISHABILITY_LEVELS } from '../../data/stock/stockConstants.js';

export function BuyerMarketplace({ currentUser, onOfferSubmitted }) {
  const { t, isMarathi } = useLanguage();

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedTaluka, setSelectedTaluka] = useState('all');
  const [selectedPerishability, setSelectedPerishability] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');

  // Location Data
  const districts = locationService.getAllDistricts();
  const [availableTalukas, setAvailableTalukas] = useState([]);

  // Offer Modal State
  const [selectedStockForOffer, setSelectedStockForOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({
    buyerName: currentUser?.name || '',
    buyerPhone: '',
    buyerType: 'mandi_trader',
    offeredQuantity: '',
    offeredPricePerUnit: '',
    deliveryTerms: 'pickup',
    message: ''
  });
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSuccessMessage, setOfferSuccessMessage] = useState(null);
  const [offerError, setOfferError] = useState(null);

  // Update Talukas when District changes
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'all') {
      const dist = districts.find(
        (d) => String(d.code) === String(selectedDistrict) || 
               (d.name && d.name.toLowerCase() === selectedDistrict.toLowerCase()) ||
               (d.name_en && d.name_en.toLowerCase() === selectedDistrict.toLowerCase())
      );
      if (dist) {
        const talukas = locationService.getTalukasForDistrict(dist.code);
        setAvailableTalukas(talukas);
      } else {
        setAvailableTalukas([]);
      }
    } else {
      setAvailableTalukas([]);
      setSelectedTaluka('all');
    }
  }, [selectedDistrict]);

  // Load Marketplace Inventory
  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const filters = {
        category: selectedCategory,
        districtCode: selectedDistrict !== 'all' ? selectedDistrict : undefined,
        talukaCode: selectedTaluka !== 'all' ? selectedTaluka : undefined,
        perishability: selectedPerishability,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        search: searchQuery
      };
      const items = await unsoldStockService.getAvailableMarketplaceStocks(filters);
      setStocks(items);
    } catch (err) {
      console.error('Failed to load marketplace stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, [selectedCategory, selectedDistrict, selectedTaluka, selectedPerishability, maxPrice, searchQuery]);

  // Open Offer Modal
  const handleOpenOfferModal = (stock) => {
    setSelectedStockForOffer(stock);
    setOfferForm({
      buyerName: currentUser?.name || '',
      buyerPhone: '',
      buyerType: 'mandi_trader',
      offeredQuantity: String(stock.availableQuantity),
      offeredPricePerUnit: String(stock.askingPricePerUnit || ''),
      deliveryTerms: 'pickup',
      message: ''
    });
    setOfferSuccessMessage(null);
    setOfferError(null);
  };

  const handleCloseOfferModal = () => {
    setSelectedStockForOffer(null);
    setOfferSuccessMessage(null);
    setOfferError(null);
  };

  // Submit Offer to Seller
  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    if (!selectedStockForOffer) return;

    setOfferError(null);
    setOfferSubmitting(true);

    try {
      const offerQty = Number(offerForm.offeredQuantity);
      const offerPrice = Number(offerForm.offeredPricePerUnit);

      if (!offerQty || offerQty <= 0) {
        throw new Error(isMarathi ? 'कृपया वैध खरेदी प्रमाण टाका.' : 'Please enter a valid quantity.');
      }
      if (offerQty > selectedStockForOffer.availableQuantity) {
        throw new Error(
          isMarathi
            ? `प्रमाण उपलब्ध साठ्यापेक्षा (${selectedStockForOffer.availableQuantity} ${selectedStockForOffer.unit}) जास्त असू शकत नाही.`
            : `Quantity cannot exceed available stock (${selectedStockForOffer.availableQuantity} ${selectedStockForOffer.unit}).`
        );
      }
      if (offerPrice == null || offerPrice < 0) {
        throw new Error(isMarathi ? 'कृपया वैध ऑफर दर टाका.' : 'Please enter a valid offer price.');
      }

      await unsoldStockService.submitBuyerOffer({
        stockId: selectedStockForOffer.id,
        buyerName: offerForm.buyerName,
        buyerPhone: offerForm.buyerPhone,
        buyerType: t(`unsoldStock.marketplace.buyerTypes.${offerForm.buyerType}`, offerForm.buyerType),
        offeredQuantity: offerQty,
        offeredPricePerUnit: offerPrice,
        deliveryTerms: offerForm.deliveryTerms,
        message: offerForm.message,
        userId: currentUser?.userId
      });

      setOfferSuccessMessage(t('unsoldStock.marketplace.offerSuccessBanner'));
      
      // Refresh list
      setTimeout(() => {
        loadMarketplace();
        if (onOfferSubmitted) onOfferSubmitted();
      }, 1500);

    } catch (err) {
      setOfferError(err.message || 'Failed to submit offer.');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const categories = Object.values(STOCK_CATEGORIES);

  return (
    <div className="buyer-marketplace">
      {/* 1. Marketplace Header */}
      <div className="marketplace-header-card">
        <div className="marketplace-header-left">
          <div className="marketplace-badge">
            <AppIcon name="shopping-bag" size={16} />
            <span>{isMarathi ? 'महाराष्ट्र थेट शेतमाल बाजार' : 'Maharashtra Direct Surplus Market'}</span>
          </div>
          <h2 className="marketplace-title">{t('unsoldStock.marketplace.headerTitle')}</h2>
          <p className="marketplace-subtitle">{t('unsoldStock.marketplace.headerSubtitle')}</p>
        </div>
        <div className="marketplace-stats-pill">
          <span className="stats-num">{stocks.length}</span>
          <span className="stats-label">{isMarathi ? 'सक्रिय अतिरिक्त माल उपलब्ध' : 'Available Surplus Lots'}</span>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="marketplace-filter-section">
        {/* Search Input */}
        <div className="marketplace-search-row">
          <div className="marketplace-search-input-wrap">
            <AppIcon name="search" size={18} color="#666" />
            <input
              type="text"
              placeholder={t('unsoldStock.marketplace.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="marketplace-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Max Price Filter */}
          <div className="marketplace-max-price-wrap">
            <label>{t('unsoldStock.marketplace.maxPriceLabel')}</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="marketplace-price-input"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="marketplace-category-pills">
          <button
            type="button"
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            {t('unsoldStock.marketplace.filterAllCategories')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {t(`unsoldStock.categories.${cat}`, cat)}
            </button>
          ))}
        </div>

        {/* Dropdowns row: District, Taluka, Perishability */}
        <div className="marketplace-dropdowns-row">
          <div className="filter-dropdown-group">
            <label><AppIcon name="map-pin" size={14} /> {isMarathi ? 'जिल्हा' : 'District'}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedTaluka('all');
              }}
              className="marketplace-select"
            >
              <option value="all">{t('unsoldStock.marketplace.filterAllDistricts')}</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {isMarathi ? (d.marathiName || d.name_mr) : (d.name || d.name_en)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-group">
            <label><AppIcon name="navigation" size={14} /> {isMarathi ? 'तालुका' : 'Taluka'}</label>
            <select
              value={selectedTaluka}
              onChange={(e) => setSelectedTaluka(e.target.value)}
              disabled={selectedDistrict === 'all' || availableTalukas.length === 0}
              className="marketplace-select"
            >
              <option value="all">{t('unsoldStock.marketplace.filterAllTalukas')}</option>
              {availableTalukas.map((tRec) => (
                <option key={tRec.code} value={tRec.code}>
                  {isMarathi ? (tRec.marathiName || tRec.name_mr) : (tRec.name || tRec.name_en)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-group">
            <label><AppIcon name="clock" size={14} /> {isMarathi ? 'टिकाऊपणा' : 'Perishability'}</label>
            <select
              value={selectedPerishability}
              onChange={(e) => setSelectedPerishability(e.target.value)}
              className="marketplace-select"
            >
              <option value="all">{t('unsoldStock.marketplace.filterAllPerishability')}</option>
              <option value={PERISHABILITY_LEVELS.PERISHABLE}>{t('unsoldStock.perishability.perishable')}</option>
              <option value={PERISHABILITY_LEVELS.SEMI_PERISHABLE}>{t('unsoldStock.perishability.semi_perishable')}</option>
              <option value={PERISHABILITY_LEVELS.NON_PERISHABLE}>{t('unsoldStock.perishability.non_perishable')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Product Cards Grid */}
      {loading ? (
        <div className="marketplace-loading-state">
          <div className="loading-spinner" />
          <p>{isMarathi ? 'अतिरिक्त शेतमाल लोड होत आहे...' : 'Discovering available surplus inventory...'}</p>
        </div>
      ) : stocks.length === 0 ? (
        <div className="marketplace-empty-card">
          <AppIcon name="inbox" size={48} color="#9e9e9e" />
          <h3>{t('unsoldStock.marketplace.emptyMarketplace')}</h3>
          <p>{isMarathi ? 'कृपया तुमचे शोध निकष बदला किंवा सर्व उत्पादन वर्ग तपासा.' : 'Try adjusting your filters or search keywords to view other commodities.'}</p>
          <button
            type="button"
            className="btn-reset-filters"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedDistrict('all');
              setSelectedTaluka('all');
              setSelectedPerishability('all');
              setMaxPrice('');
            }}
          >
            {isMarathi ? 'सर्व निकष पूर्ववत करा' : 'Reset All Filters'}
          </button>
        </div>
      ) : (
        <div className="marketplace-cards-grid">
          {stocks.map((stock) => {
            const displayName = isMarathi && stock.productName_mr ? stock.productName_mr : stock.productName;
            const displayDistrict = isMarathi && stock.districtName_mr ? stock.districtName_mr : stock.districtName;
            const displayTaluka = isMarathi && stock.talukaName_mr ? stock.talukaName_mr : stock.talukaName;
            const displayVillage = isMarathi && stock.villageName_mr ? stock.villageName_mr : stock.villageName;

            return (
              <div key={stock.id} className={`marketplace-card ${stock.isUrgent ? 'card-urgent' : ''}`}>
                {/* Header Row: Category & Badges */}
                <div className="marketplace-card-header">
                  <span className="commodity-category-pill">
                    {t(`unsoldStock.categories.${stock.category}`, stock.category)}
                  </span>
                  <div className="badges-group">
                    {stock.discountPercent != null && stock.discountPercent > 0 && (
                      <span className="discount-tag">
                        {t('unsoldStock.marketplace.discountBadge', { percent: stock.discountPercent })}
                      </span>
                    )}
                    {stock.isUrgent && (
                      <span className="urgency-tag">
                        {t('unsoldStock.marketplace.urgentBadge')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Location */}
                <div className="marketplace-card-body">
                  <h3 className="commodity-title">{displayName}</h3>
                  <div className="commodity-location">
                    <AppIcon name="map-pin" size={14} color="#757575" />
                    <span>
                      {displayVillage ? `${displayVillage}, ` : ''}
                      {displayTaluka ? `${displayTaluka}, ` : ''}
                      {displayDistrict}
                    </span>
                  </div>

                  {/* Pricing Box */}
                  <div className="marketplace-price-box">
                    <div className="price-item asking-price">
                      <span className="price-label">{t('unsoldStock.marketplace.askingPriceLabel')}</span>
                      <div className="price-val">
                        <span className="currency">₹</span>
                        <span className="amount">{stock.askingPricePerUnit}</span>
                        <span className="unit">/{stock.unit}</span>
                      </div>
                    </div>

                    {stock.originalSellingPricePerUnit && (
                      <div className="price-item original-price">
                        <span className="price-label">{t('unsoldStock.marketplace.originalPriceLabel')}</span>
                        <span className="original-val">₹{stock.originalSellingPricePerUnit}/{stock.unit}</span>
                      </div>
                    )}

                    <div className="price-item available-qty">
                      <span className="price-label">{t('unsoldStock.marketplace.availableLabel')}</span>
                      <span className="qty-val">{stock.availableQuantity} {stock.unit}</span>
                    </div>
                  </div>

                  {/* Highlights & Shelf Life */}
                  <div className="marketplace-specs">
                    {stock.condition && (
                      <span className="spec-badge">
                        ✨ {t(`unsoldStock.conditions.${stock.condition}`, stock.condition)}
                      </span>
                    )}
                    {stock.packagingCondition && (
                      <span className="spec-badge">
                        📦 {stock.packagingCondition.replace(/_/g, ' ')}
                      </span>
                    )}
                    {stock.remainingShelfLifeHours != null && (
                      <span className={`spec-badge ${stock.remainingShelfLifeHours <= 24 ? 'spec-shelf-urgent' : ''}`}>
                        ⏳ {stock.remainingShelfLifeHours}h {isMarathi ? 'शिल्लक' : 'left'}
                      </span>
                    )}
                  </div>

                  {/* Seller Notes snippet */}
                  {stock.notes && (
                    <p className="marketplace-card-notes">
                      "{stock.notes.length > 80 ? stock.notes.substring(0, 80) + '...' : stock.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="marketplace-card-footer">
                  <button
                    type="button"
                    className="btn-make-offer"
                    onClick={() => handleOpenOfferModal(stock)}
                  >
                    <AppIcon name="send" size={16} />
                    <span>{t('unsoldStock.marketplace.makeOfferBtn')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Make an Offer Modal */}
      {selectedStockForOffer && (
        <div className="modal-backdrop">
          <div className="marketplace-offer-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div className="modal-header-info">
                <h3>{t('unsoldStock.marketplace.offerModalTitle')}</h3>
                <span className="modal-subtitle">
                  {isMarathi && selectedStockForOffer.productName_mr
                    ? selectedStockForOffer.productName_mr
                    : selectedStockForOffer.productName}{' '}
                  • {selectedStockForOffer.villageName || selectedStockForOffer.districtName}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseOfferModal}
                disabled={offerSubmitting}
              >
                ✕
              </button>
            </div>

            {offerSuccessMessage ? (
              <div className="offer-success-view">
                <div className="success-icon-wrap">
                  <AppIcon name="check-circle" size={48} color="#2e7d32" />
                </div>
                <h4>{isMarathi ? 'ऑफर यशस्वीरित्या पाठवली!' : 'Offer Submitted Successfully!'}</h4>
                <p>{offerSuccessMessage}</p>
                <div className="offer-summary-badge">
                  <span>{offerForm.offeredQuantity} {selectedStockForOffer.unit} @ ₹{offerForm.offeredPricePerUnit}/{selectedStockForOffer.unit}</span>
                  <strong>₹{Number(offerForm.offeredQuantity) * Number(offerForm.offeredPricePerUnit)}</strong>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCloseOfferModal}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  {isMarathi ? 'बाजारपेठेत परत जा' : 'Return to Marketplace'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitOffer} className="offer-form">
                {/* Stock Quick Info Card */}
                <div className="offer-stock-summary">
                  <div className="summary-col">
                    <span className="summary-lbl">{t('unsoldStock.marketplace.availableLabel')}</span>
                    <strong className="summary-val">{selectedStockForOffer.availableQuantity} {selectedStockForOffer.unit}</strong>
                  </div>
                  <div className="summary-col">
                    <span className="summary-lbl">{t('unsoldStock.marketplace.askingPriceLabel')}</span>
                    <strong className="summary-val">₹{selectedStockForOffer.askingPricePerUnit} / {selectedStockForOffer.unit}</strong>
                  </div>
                  <div className="summary-col">
                    <span className="summary-lbl">{isMarathi ? 'स्थान' : 'Location'}</span>
                    <strong className="summary-val">{selectedStockForOffer.talukaName || selectedStockForOffer.districtName}</strong>
                  </div>
                </div>

                {offerError && (
                  <div className="form-error-alert">
                    <AppIcon name="alert-triangle" size={16} color="#d32f2f" />
                    <span>{offerError}</span>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="form-grid-two">
                  <div className="form-field">
                    <label>{t('unsoldStock.marketplace.buyerNameLabel')}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Traders / Hotel Sai"
                      value={offerForm.buyerName}
                      onChange={(e) => setOfferForm({ ...offerForm, buyerName: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>{t('unsoldStock.marketplace.phoneLabel')}</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9822012345"
                      value={offerForm.buyerPhone}
                      onChange={(e) => setOfferForm({ ...offerForm, buyerPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>{t('unsoldStock.marketplace.buyerTypeLabel')}</label>
                  <select
                    value={offerForm.buyerType}
                    onChange={(e) => setOfferForm({ ...offerForm, buyerType: e.target.value })}
                  >
                    <option value="mandi_trader">{t('unsoldStock.marketplace.buyerTypes.mandi_trader')}</option>
                    <option value="food_processor">{t('unsoldStock.marketplace.buyerTypes.food_processor')}</option>
                    <option value="kirana_merchant">{t('unsoldStock.marketplace.buyerTypes.kirana_merchant')}</option>
                    <option value="hotel_caterer">{t('unsoldStock.marketplace.buyerTypes.hotel_caterer')}</option>
                    <option value="fpo">{t('unsoldStock.marketplace.buyerTypes.fpo')}</option>
                    <option value="consumer">{t('unsoldStock.marketplace.buyerTypes.consumer')}</option>
                  </select>
                </div>

                <div className="form-grid-two">
                  <div className="form-field">
                    <label>
                      {t('unsoldStock.marketplace.offerQtyLabel')}{' '}
                      <span className="unit-hint">({selectedStockForOffer.unit})</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={selectedStockForOffer.availableQuantity}
                      step="any"
                      value={offerForm.offeredQuantity}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredQuantity: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>{t('unsoldStock.marketplace.offerPriceLabel')}</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder={`Asking: ₹${selectedStockForOffer.askingPricePerUnit}`}
                      value={offerForm.offeredPricePerUnit}
                      onChange={(e) => setOfferForm({ ...offerForm, offeredPricePerUnit: e.target.value })}
                    />
                  </div>
                </div>

                {/* Calculated Deal Total */}
                {Number(offerForm.offeredQuantity) > 0 && Number(offerForm.offeredPricePerUnit) > 0 && (
                  <div className="total-calculation-box">
                    <span>{isMarathi ? 'एकूण ऑफर मूल्य:' : 'Total Proposed Value:'}</span>
                    <span className="total-value">
                      ₹{(Number(offerForm.offeredQuantity) * Number(offerForm.offeredPricePerUnit)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Delivery Terms */}
                <div className="form-field">
                  <label>{t('unsoldStock.marketplace.termsLabel')}</label>
                  <select
                    value={offerForm.deliveryTerms}
                    onChange={(e) => setOfferForm({ ...offerForm, deliveryTerms: e.target.value })}
                  >
                    <option value="pickup">{t('unsoldStock.marketplace.pickupOption')}</option>
                    <option value="seller_delivery">{t('unsoldStock.marketplace.deliveryOption')}</option>
                    <option value="mutual_handover">{t('unsoldStock.marketplace.mutualOption')}</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="form-field">
                  <label>{t('unsoldStock.marketplace.notesLabel')}</label>
                  <textarea
                    rows={2}
                    placeholder={isMarathi ? 'विक्रेत्यासाठी काही सूचना किंवा भेटीची वेळ...' : 'e.g. Can collect today evening with our tempo.'}
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseOfferModal}
                    disabled={offerSubmitting}
                  >
                    {isMarathi ? 'रद्द करा' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={offerSubmitting}
                  >
                    {offerSubmitting ? (
                      <span className="spinner-text">
                        <span className="btn-spinner" /> {isMarathi ? 'पाठवत आहे...' : 'Sending Offer...'}
                      </span>
                    ) : (
                      <>
                        <AppIcon name="send" size={16} />
                        <span>{t('unsoldStock.marketplace.submitOfferBtn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
