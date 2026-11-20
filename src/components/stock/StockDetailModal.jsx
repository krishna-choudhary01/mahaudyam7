import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import {
  STOCK_STATUSES,
  RECOVERY_CHANNELS,
  ENQUIRY_STATUSES,
  PAYMENT_STATUSES,
  TRANSACTION_COMPLETION_STATUSES
} from '../../data/stock/stockConstants.js';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';
import { RecoveryCostCalculator } from './RecoveryCostCalculator.jsx';
import { ChannelRecommendationCard } from './ChannelRecommendationCard.jsx';
import { ChannelComparisonModal } from './ChannelComparisonModal.jsx';
import { BuyerEnquiryModal } from './BuyerEnquiryModal.jsx';
import { BuyerResponseModal } from './BuyerResponseModal.jsx';
import { RecoveryTransactionModal } from './RecoveryTransactionModal.jsx';

export function StockDetailModal({ stock, userId, onClose, onStockUpdated }) {
  const { t, isMarathi } = useLanguage();

  const [activeTab, setActiveTab] = useState('recommendations'); // 'recommendations' | 'enquiries' | 'transactions' | 'variance' | 'calculator' | 'overview' | 'timeline'
  const [selectedStatus, setSelectedStatus] = useState(stock ? stock.status : STOCK_STATUSES.AVAILABLE_FOR_RECOVERY);
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [statusSuccess, setStatusSuccess] = useState(null);

  // Phase 2 Recommendations & Actions State
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recordedActions, setRecordedActions] = useState([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Phase 3 Enquiries, Transactions & Variance State
  const [enquiries, setEnquiries] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [varianceAnalysis, setVarianceAnalysis] = useState(null);

  // Phase 3 Modals
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryTargetBuyer, setEnquiryTargetBuyer] = useState(null);
  const [enquiryTargetChannel, setEnquiryTargetChannel] = useState('weekly_markets');

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedEnquiryForResponse, setSelectedEnquiryForResponse] = useState(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txPrefill, setTxPrefill] = useState(null);

  useEffect(() => {
    if (stock && userId) {
      loadRecommendations();
      loadRecordedActions();
      loadEnquiries();
      loadTransactions();
      loadVariance();
    }
  }, [stock?.id, userId]);

  const loadRecommendations = async (forceRefresh = false) => {
    if (!stock || !userId) return;
    try {
      setLoadingRecs(true);
      const recs = await unsoldStockService.getRecommendationsForStock(userId, stock.id, forceRefresh);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const loadRecordedActions = async () => {
    if (!stock || !userId) return;
    try {
      const actions = await unsoldStockService.getChannelActionsForStock(userId, stock.id);
      setRecordedActions(actions);
    } catch (err) {
      console.error('Failed to load channel actions:', err);
    }
  };

  const loadEnquiries = async () => {
    if (!stock || !userId) return;
    try {
      const list = await unsoldStockService.getEnquiriesForStock(userId, stock.id);
      setEnquiries(list);
    } catch (err) {
      console.error('Failed to load stock enquiries:', err);
    }
  };

  const loadTransactions = async () => {
    if (!stock || !userId) return;
    try {
      const list = await unsoldStockService.getTransactionsForStock(userId, stock.id);
      setTransactions(list);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  const loadVariance = async () => {
    if (!stock || !userId) return;
    try {
      const data = await unsoldStockService.getExpectedVsActualAnalysis(userId, stock.id);
      setVarianceAnalysis(data);
    } catch (err) {
      console.error('Failed to load variance analysis:', err);
    }
  };

  const handleActionRecorded = (newAction) => {
    setRecordedActions((prev) => [newAction, ...prev.filter((a) => a.id !== newAction.id)]);
    unsoldStockService.getStockById(userId, stock.id).then((freshStock) => {
      if (freshStock && onStockUpdated) onStockUpdated(freshStock);
    });
  };

  const handleOpenEnquiryModal = (buyer, channelId) => {
    setEnquiryTargetBuyer(buyer);
    setEnquiryTargetChannel(channelId || 'weekly_markets');
    setShowEnquiryModal(true);
  };

  const handleEnquiryCreated = (newEnquiry) => {
    setEnquiries((prev) => [newEnquiry, ...prev]);
    loadVariance();
    unsoldStockService.getStockById(userId, stock.id).then((freshStock) => {
      if (freshStock && onStockUpdated) onStockUpdated(freshStock);
    });
  };

  const handleOpenResponseModal = (enquiry) => {
    setSelectedEnquiryForResponse(enquiry);
    setShowResponseModal(true);
  };

  const handleResponseRecorded = (updatedEnquiry) => {
    setEnquiries((prev) => prev.map((e) => (e.id === updatedEnquiry.id ? updatedEnquiry : e)));
    loadVariance();
  };

  const handleOpenTransactionFromEnquiry = (enquiry) => {
    // Prefill with agreed / counteroffer price and quantity
    const lastNeg = (enquiry.negotiationHistory || []).slice(-1)[0];
    const agreedPrice = lastNeg?.offeredPrice != null ? lastNeg.offeredPrice : enquiry.proposedPricePerUnit;
    const agreedQty = lastNeg?.offeredQuantity != null ? lastNeg.offeredQuantity : enquiry.enquiryQuantity;

    setTxPrefill({
      buyerName: enquiry.buyerName,
      buyerId: enquiry.buyerId,
      channel: enquiry.recoveryChannel,
      price: agreedPrice,
      quantity: agreedQty,
      enquiryId: enquiry.id
    });
    setShowTransactionModal(true);
  };

  const handleTransactionCompleted = (result) => {
    loadTransactions();
    loadEnquiries();
    loadVariance();
    if (result.updatedStock && onStockUpdated) {
      onStockUpdated(result.updatedStock);
    }
  };

  if (!stock) return null;

  const safety = unsoldStockService.evaluateFoodSafety(stock);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setStatusError(null);
    setStatusSuccess(null);
    setUpdatingStatus(true);

    try {
      const updated = await unsoldStockService.updateStockStatus(
        userId,
        stock.id,
        selectedStatus,
        statusNotes.trim()
      );
      setStatusSuccess(isMarathi ? 'मालाची स्थिती यशस्वीरीत्या बदलली.' : 'Status successfully updated.');
      setStatusNotes('');
      if (onStockUpdated) onStockUpdated(updated);
    } catch (err) {
      setStatusError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleChannel = async (channelId) => {
    const currentChannels = stock.selectedRecoveryChannels || [];
    let nextChannels;
    if (currentChannels.includes(channelId)) {
      nextChannels = currentChannels.filter((c) => c !== channelId);
    } else {
      nextChannels = [...currentChannels, channelId];
    }

    try {
      const updated = await unsoldStockService.updateStock(userId, stock.id, {
        selectedRecoveryChannels: nextChannels
      });
      if (onStockUpdated) onStockUpdated(updated);
    } catch (err) {
      console.warn('Failed to toggle channel:', err);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card stock-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="modal-header">
          <div className="modal-title-row">
            <AppIcon name="box" size={20} color="#2e7d32" />
            <div>
              <h3 className="stock-modal-title">
                {isMarathi ? (stock.productName_mr || stock.productName) : stock.productName}
              </h3>
              <span className="stock-modal-meta">
                {stock.availableQuantity} {stock.unit} • {isMarathi ? stock.villageName_mr : stock.villageName}, {isMarathi ? stock.talukaName_mr : stock.talukaName}
              </span>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {/* FOOD SAFETY & PERISHABILITY BANNER */}
        {!safety.isSafe && (
          <div className="safety-alert-banner danger">
            <div className="safety-alert-title">
              ⚠️ {t('unsoldStock.safety.foodSafetyAlertTitle')}
            </div>
            <p className="safety-alert-text">
              {isMarathi ? safety.safetyWarning_mr : safety.safetyWarning}
            </p>
          </div>
        )}

        {safety.isSafe && safety.urgency === 'urgent_action' && (
          <div className="safety-alert-banner warning">
            <div className="safety-alert-title">
              ⏳ {isMarathi ? 'तातडीची गरज' : 'Urgent Perishable Stock'}
            </div>
            <p className="safety-alert-text">
              {isMarathi ? safety.safetyWarning_mr : safety.safetyWarning}
            </p>
          </div>
        )}

        {/* Sub-Tabs Bar */}
        <div className="detail-modal-tabs">
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <AppIcon name="shield" size={14} />
            <span>{isMarathi ? 'स्मार्ट शिफारसी' : 'Smart Recommendations'}</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'enquiries' ? 'active' : ''}`}
            onClick={() => setActiveTab('enquiries')}
          >
            <AppIcon name="user" size={14} />
            <span>{isMarathi ? 'खरेदीदार चौकशी' : 'Buyer Enquiries'} ({enquiries.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <AppIcon name="shop" size={14} />
            <span>{isMarathi ? 'प्रत्यक्ष व्यवहार' : 'Transactions'} ({transactions.length})</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'variance' ? 'active' : ''}`}
            onClick={() => setActiveTab('variance')}
          >
            <AppIcon name="analysis" size={14} />
            <span>{isMarathi ? 'अपेक्षित वि. प्रत्यक्ष' : 'Expected vs Actual'}</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculator')}
          >
            <AppIcon name="hammer" size={14} />
            <span>{isMarathi ? 'मूल्य गणक' : 'Value Calculator'}</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <AppIcon name="box" size={14} />
            <span>{isMarathi ? 'माहिती व स्थिती' : 'Overview & Status'}</span>
          </button>
          <button
            type="button"
            className={`modal-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <AppIcon name="time" size={14} />
            <span>{isMarathi ? 'बदल इतिहास' : 'History Timeline'}</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & STATUS UPDATE */}
        {activeTab === 'overview' && (
          <div className="modal-tab-body">
            <div className="stock-info-grid">
              <div className="info-cell">
                <span className="info-cell-label">{isMarathi ? 'वर्गवारी:' : 'Category:'}</span>
                <strong>{t(`unsoldStock.categories.${stock.category}`)}</strong>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">{isMarathi ? 'उपलब्ध प्रमाण:' : 'Available Qty:'}</span>
                <strong>{stock.availableQuantity} {stock.unit}</strong>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">{isMarathi ? 'स्थिती:' : 'Condition:'}</span>
                <span className={`condition-pill condition-${stock.condition}`}>
                  {t(`unsoldStock.conditions.${stock.condition}`)}
                </span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">{isMarathi ? 'टिकाऊपणा:' : 'Perishability:'}</span>
                <span>{t(`unsoldStock.perishability.${stock.perishability}`)}</span>
              </div>
              {stock.remainingShelfLifeHours != null && (
                <div className="info-cell">
                  <span className="info-cell-label">{isMarathi ? 'उर्वरित मुदत:' : 'Shelf Life:'}</span>
                  <span className={stock.remainingShelfLifeHours <= 24 ? 'text-danger font-bold' : ''}>
                    {stock.remainingShelfLifeHours} {isMarathi ? 'तास' : 'hours'}
                  </span>
                </div>
              )}
              <div className="info-cell">
                <span className="info-cell-label">{isMarathi ? 'साठवणूक पद्धत:' : 'Storage:'}</span>
                <span>{stock.storageCondition}</span>
              </div>
            </div>

            {/* Storage Advice */}
            {safety.storageGuidance && (
              <div className="storage-advice-card">
                <strong>{t('unsoldStock.safety.storageTipTitle')}</strong> {safety.storageGuidance}
              </div>
            )}

            {/* Status Update Form */}
            <div className="status-updater-box">
              <h4 className="updater-title">
                <AppIcon name="edit" size={16} />
                <span>{isMarathi ? 'मालाची सध्याची स्थिती बदला' : 'Update Stock Status'}</span>
              </h4>

              {statusError && <div className="alert-banner alert-danger">{statusError}</div>}
              {statusSuccess && <div className="alert-banner alert-success">{statusSuccess}</div>}

              <form onSubmit={handleUpdateStatus} className="status-form-row">
                <div className="form-group flex-1">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="form-select"
                  >
                    {Object.values(STOCK_STATUSES).map((stKey) => (
                      <option key={stKey} value={stKey}>
                        {t(`unsoldStock.statuses.${stKey}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-2">
                  <input
                    type="text"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder={isMarathi ? 'कारणाची नोंद (उदा. ५०% माल हॉटेलला दिला)' : 'Reason or action taken (e.g. Sold 50% to hotel)'}
                    className="form-input"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? (isMarathi ? 'अद्यतन...' : 'Updating...') : t('unsoldStock.detailsModal.updateStatusBtn')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: RECOVERY COST CALCULATOR */}
        {activeTab === 'calculator' && (
          <div className="modal-tab-body">
            <RecoveryCostCalculator stock={stock} />
          </div>
        )}

        {/* TAB 3: SMART RECOVERY RECOMMENDATIONS (Phase 2 Matching Engine) */}
        {activeTab === 'recommendations' && (
          <div className="modal-tab-body">
            {/* Recommendations Toolbar */}
            <div className="recs-toolbar">
              <div className="recs-toolbar-info">
                <h4 className="recs-toolbar-title">
                  {t('unsoldStock.matching.recommendationsHeader', 'Intelligent Recovery Recommendations')}
                </h4>
                <p className="recs-toolbar-subtitle">
                  {t(
                    'unsoldStock.matching.recommendationsSubtitle',
                    'Ranked recovery options evaluated against product condition, remaining shelf life, quantity, location proximity, and verified local buyers.'
                  )}
                </p>
              </div>
              <div className="recs-toolbar-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowComparisonModal(true)}
                  disabled={!recommendations || !recommendations.channels || recommendations.channels.length === 0}
                >
                  📊 {t('unsoldStock.matching.compareBtn', 'Compare All Channels')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => loadRecommendations(true)}
                  disabled={loadingRecs}
                >
                  🔄 {loadingRecs ? '...' : t('unsoldStock.matching.refreshBtn', 'Re-evaluate')}
                </button>
              </div>
            </div>

            {/* Recommendations List */}
            {loadingRecs ? (
              <div className="recs-loading-state">
                <p>{isMarathi ? 'पुनर्प्राप्ती पर्याय तपासत आहे...' : 'Evaluating candidate recovery channels...'}</p>
              </div>
            ) : recommendations && recommendations.channels ? (
              <div className="recommendations-stream">
                {recommendations.channels.map((ch) => (
                  <ChannelRecommendationCard
                    key={ch.id}
                    channel={ch}
                    stock={stock}
                    userId={userId}
                    currentLanguage={isMarathi ? 'mr' : 'en'}
                    recordedActions={recordedActions}
                    onActionRecorded={handleActionRecorded}
                    onInitiateEnquiry={handleOpenEnquiryModal}
                  />
                ))}
              </div>
            ) : null}

            {/* Side-by-Side Comparison Modal */}
            <ChannelComparisonModal
              isOpen={showComparisonModal}
              onClose={() => setShowComparisonModal(false)}
              stock={stock}
              channels={recommendations?.channels || []}
              currentLanguage={isMarathi ? 'mr' : 'en'}
            />
          </div>
        )}

        {/* TAB: BUYER ENQUIRIES & NEGOTIATION (Phase 3) */}
        {activeTab === 'enquiries' && (
          <div className="modal-tab-body">
            <div className="recs-toolbar">
              <div>
                <h4 className="recs-toolbar-title">
                  {t('unsoldStock.enquiry.tabTitle', 'Buyer Enquiries & Negotiation')}
                </h4>
                <p className="recs-toolbar-subtitle">
                  {t('unsoldStock.enquiry.manualRecordDisclaimer', 'Track initiated buyer enquiries, log incoming counteroffers, and convert agreed offers into confirmed recovery transactions.')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenEnquiryModal(null, 'weekly_markets')}
              >
                + {t('unsoldStock.enquiry.initiateBtn', 'New Enquiry')}
              </button>
            </div>

            {enquiries.length === 0 ? (
              <div className="empty-subtab-box">
                <span className="empty-subtab-icon">✉️</span>
                <p>{t('unsoldStock.enquiry.noEnquiriesNotice', 'No buyer enquiries initiated yet for this stock item.')}</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleOpenEnquiryModal(null, 'weekly_markets')}
                >
                  {t('unsoldStock.enquiry.initiateBtn', 'Initiate First Enquiry')}
                </button>
              </div>
            ) : (
              <div className="enquiries-stream">
                {enquiries.map((enq) => {
                  const isAccepted = enq.status === ENQUIRY_STATUSES.ACCEPTED;
                  const isPending = enq.status === ENQUIRY_STATUSES.PENDING_SYNC;

                  return (
                    <div key={enq.id} className="enquiry-card">
                      <div className="enquiry-card-header">
                        <div className="enquiry-buyer-info">
                          <strong className="enquiry-buyer-name">{enq.buyerName}</strong>
                          <span className={`buyer-verify-tag ${enq.isVerifiedBuyer ? 'verified' : 'unverified'}`}>
                            {enq.isVerifiedBuyer ? '✓ Verified Directory Buyer' : '⚠️ Unverified External Contact'}
                          </span>
                          <span className="enquiry-channel-pill">{enq.recoveryChannel}</span>
                        </div>
                        <div className="enquiry-meta-right">
                          <span className={`status-pill status-${enq.status}`}>
                            {isPending ? '⏳ Pending Sync (Offline)' : enq.status}
                          </span>
                          <span className="enquiry-date">{new Date(enq.enquiryDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="enquiry-card-terms">
                        <div className="term-item">
                          <span className="term-label">Quantity:</span>
                          <strong>{enq.enquiryQuantity} {enq.unit}</strong>
                        </div>
                        <div className="term-item">
                          <span className="term-label">Proposed Price:</span>
                          <strong>₹{enq.proposedPricePerUnit} /{enq.unit}</strong>
                        </div>
                        <div className="term-item">
                          <span className="term-label">Logistics:</span>
                          <span>{enq.deliveryTerms}</span>
                        </div>
                        {enq.deliveryNotes && (
                          <div className="term-item full-width">
                            <span className="term-label">Notes:</span>
                            <em>"{enq.deliveryNotes}"</em>
                          </div>
                        )}
                      </div>

                      {/* Negotiation History Timeline */}
                      {enq.negotiationHistory && enq.negotiationHistory.length > 0 && (
                        <div className="enquiry-negotiation-box">
                          <h6 className="neg-heading">Negotiation & Counteroffer History:</h6>
                          <div className="neg-trail">
                            {enq.negotiationHistory.map((neg, idx) => (
                              <div key={neg.id || idx} className="neg-item">
                                <div className="neg-item-header">
                                  <span className={`neg-tag neg-${neg.responseType}`}>
                                    {neg.responseType}
                                  </span>
                                  {neg.offeredPrice != null && (
                                    <span className="neg-price">Offer: ₹{neg.offeredPrice}/{enq.unit}</span>
                                  )}
                                  {neg.offeredQuantity != null && (
                                    <span className="neg-qty">Qty: {neg.offeredQuantity} {enq.unit}</span>
                                  )}
                                  <span className="neg-source muted">({neg.recordedBy || 'manual'})</span>
                                </div>
                                {neg.notes && <p className="neg-notes">"{neg.notes}"</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enquiry Actions */}
                      <div className="enquiry-card-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenResponseModal(enq)}
                        >
                          💬 {t('unsoldStock.enquiry.negotiateBtn', 'Log Response / Counteroffer')}
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenTransactionFromEnquiry(enq)}
                          disabled={stock.availableQuantity <= 0}
                        >
                          ✓ {t('unsoldStock.enquiry.acceptOfferBtn', 'Accept & Create Transaction')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: TRANSACTIONS & ACTUALS (Phase 3) */}
        {activeTab === 'transactions' && (
          <div className="modal-tab-body">
            <div className="recs-toolbar">
              <div>
                <h4 className="recs-toolbar-title">
                  {t('unsoldStock.transaction.tabTitle', 'Recovery Transactions & Actual Incurred Expenses')}
                </h4>
                <p className="recs-toolbar-subtitle">
                  {t('unsoldStock.transaction.fullSuccessNotice', 'Confirmed value recovery records with full itemized logistics and processing expenses.')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setTxPrefill(null);
                  setShowTransactionModal(true);
                }}
                disabled={stock.availableQuantity <= 0}
              >
                + {t('unsoldStock.transaction.createTxBtn', 'Record Transaction')}
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-subtab-box">
                <span className="empty-subtab-icon">💰</span>
                <p>{t('unsoldStock.transaction.noTransactionsNotice', 'No recovery transactions recorded yet for this item.')}</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setTxPrefill(null);
                    setShowTransactionModal(true);
                  }}
                  disabled={stock.availableQuantity <= 0}
                >
                  {t('unsoldStock.transaction.createTxBtn', 'Record Completed Recovery')}
                </button>
              </div>
            ) : (
              <div className="transactions-stream">
                {transactions.map((tx) => (
                  <div key={tx.id} className="tx-record-card">
                    <div className="tx-card-header">
                      <div>
                        <strong className="tx-buyer-name">{tx.buyerName}</strong>
                        <span className="tx-channel-pill">{tx.recoveryChannel}</span>
                        <span className="tx-date">{new Date(tx.transactionDate).toLocaleDateString()}</span>
                      </div>
                      <div className="tx-status-group">
                        <span className={`tx-status-badge status-${tx.paymentStatus}`}>
                          {tx.paymentStatus === 'paid' ? '✓ Paid' : tx.paymentStatus}
                        </span>
                        <span className="tx-completion-badge">
                          {tx.recoveryCompletionStatus}
                        </span>
                      </div>
                    </div>

                    <div className="tx-metrics-strip">
                      <div className="tx-metric">
                        <span className="label">Recovered Quantity</span>
                        <strong>{tx.agreedQuantity} {tx.unit}</strong>
                      </div>
                      <div className="tx-metric">
                        <span className="label">Agreed Price</span>
                        <strong>₹{tx.agreedPricePerUnit} /{tx.unit}</strong>
                      </div>
                      <div className="tx-metric">
                        <span className="label">Gross Revenue</span>
                        <strong>₹{tx.grossRecoveryRevenue?.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="tx-metric">
                        <span className="label">Itemized Expenses</span>
                        <span className="text-danger">-₹{tx.expenses?.totalExpenses?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="tx-metric highlight">
                        <span className="label">Actual Net Recovery</span>
                        <strong className="text-success">₹{tx.netRecoveryValue?.toLocaleString('en-IN')}</strong>
                      </div>
                      {tx.attributableInventoryCost != null && (
                        <div className="tx-metric">
                          <span className="label">Net vs Capital</span>
                          <span className={tx.netVsAttributable >= 0 ? 'text-success' : 'text-danger'}>
                            {tx.netVsAttributable >= 0 ? '+' : ''}₹{tx.netVsAttributable?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: EXPECTED VS ACTUAL VARIANCE (Phase 3) */}
        {activeTab === 'variance' && (
          <div className="modal-tab-body">
            {varianceAnalysis ? (
              <div className="variance-container">
                <div className="recs-toolbar">
                  <div>
                    <h4 className="recs-toolbar-title">
                      {t('unsoldStock.analysis.headerTitle', 'Expected vs. Actual Recovery Variance')}
                    </h4>
                    <p className="recs-toolbar-subtitle">
                      Original inventory status: <strong>{varianceAnalysis.costLabel}</strong>
                    </p>
                  </div>
                </div>

                <div className="variance-cards-grid">
                  {/* Estimated (Phase 2) */}
                  <div className="var-col-card estimated">
                    <h5 className="var-card-title">1. Phase 2 Estimated</h5>
                    <div className="var-stat-row">
                      <span>Top Channel:</span>
                      <strong>{varianceAnalysis.estimated.channelTitle_en || '—'}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Est. Gross Revenue:</span>
                      <strong>₹{varianceAnalysis.estimated.grossRevenue?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Est. Additional Expenses:</span>
                      <span className="text-danger">-₹{varianceAnalysis.estimated.totalExpenses?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="var-stat-row highlight">
                      <span>Est. Net Recovery:</span>
                      <strong>₹{varianceAnalysis.estimated.netRecoveryValue?.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Negotiated (Phase 3) */}
                  <div className="var-col-card negotiated">
                    <h5 className="var-card-title">2. Negotiated Offer</h5>
                    <div className="var-stat-row">
                      <span>Offer Status:</span>
                      <strong>{varianceAnalysis.negotiated.hasNegotiatedOffer ? 'Accepted Offer' : 'Pending Negotiation'}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Agreed Unit Price:</span>
                      <strong>{varianceAnalysis.negotiated.agreedPricePerUnit != null ? `₹${varianceAnalysis.negotiated.agreedPricePerUnit}` : '—'}</strong>
                    </div>
                    <div className="var-stat-row highlight">
                      <span>Projected Gross:</span>
                      <strong>{varianceAnalysis.negotiated.potentialGross != null ? `₹${varianceAnalysis.negotiated.potentialGross?.toLocaleString('en-IN')}` : '—'}</strong>
                    </div>
                  </div>

                  {/* Actual (Phase 3 Confirmed) */}
                  <div className="var-col-card actual">
                    <h5 className="var-card-title">3. Confirmed Actuals</h5>
                    <div className="var-stat-row">
                      <span>Completed Transactions:</span>
                      <strong>{varianceAnalysis.actual.transactionsCount}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Volume Recovered:</span>
                      <strong>{varianceAnalysis.actual.quantityRecovered} {varianceAnalysis.unit}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Actual Gross Revenue:</span>
                      <strong>₹{varianceAnalysis.actual.grossRevenue?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="var-stat-row">
                      <span>Actual Expenses Incurred:</span>
                      <span className="text-danger">-₹{varianceAnalysis.actual.itemizedExpenses?.totalExpenses?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="var-stat-row highlight">
                      <span>Actual Net Realized:</span>
                      <strong className="text-success">₹{varianceAnalysis.actual.netRecoveryValue?.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* Variance Overview Banner */}
                <div className="variance-summary-bar">
                  <div className="var-metric">
                    <span className="var-label">Revenue Variance:</span>
                    <strong className={varianceAnalysis.variance.revenueVariance >= 0 ? 'text-success' : 'text-danger'}>
                      {varianceAnalysis.variance.revenueVariance >= 0 ? '+' : ''}₹{varianceAnalysis.variance.revenueVariance?.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="var-metric">
                    <span className="var-label">Expenses Variance:</span>
                    <strong className={varianceAnalysis.variance.expensesVariance <= 0 ? 'text-success' : 'text-danger'}>
                      {varianceAnalysis.variance.expensesVariance >= 0 ? '+' : ''}₹{varianceAnalysis.variance.expensesVariance?.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="var-metric highlight">
                    <span className="var-label">Net Value Variance:</span>
                    <strong className={varianceAnalysis.variance.netRecoveryVariance >= 0 ? 'text-success' : 'text-danger'}>
                      {varianceAnalysis.variance.netRecoveryVariance >= 0 ? '+' : ''}₹{varianceAnalysis.variance.netRecoveryVariance?.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="var-metric">
                    <span className="var-label">Remaining Unrecovered:</span>
                    <strong>{varianceAnalysis.remaining.quantity} {varianceAnalysis.unit}</strong>
                    {varianceAnalysis.remaining.unrecoveredCost != null && (
                      <small>(₹{varianceAnalysis.remaining.unrecoveredCost?.toLocaleString('en-IN')} cost)</small>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p>Loading variance analysis...</p>
            )}
          </div>
        )}

        {/* TAB 4: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="modal-tab-body">
            <h4 className="section-heading mb-3">{t('unsoldStock.detailsModal.statusHistory')}</h4>
            <div className="timeline-trail">
              {(stock.statusHistory || []).map((entry, idx) => (
                <div key={idx} className="timeline-node">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-status-badge">
                        {t(`unsoldStock.statuses.${entry.status}`)}
                      </span>
                      <span className="timeline-time">
                        {new Date(entry.timestamp).toLocaleString(isMarathi ? 'mr-IN' : 'en-IN')}
                      </span>
                    </div>
                    {entry.notes && <p className="timeline-notes">{entry.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3 Modals */}
        <BuyerEnquiryModal
          isOpen={showEnquiryModal}
          onClose={() => setShowEnquiryModal(false)}
          stock={stock}
          userId={userId}
          initialBuyer={enquiryTargetBuyer}
          initialChannel={enquiryTargetChannel}
          onEnquiryCreated={handleEnquiryCreated}
        />

        <BuyerResponseModal
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          enquiry={selectedEnquiryForResponse}
          userId={userId}
          onResponseRecorded={handleResponseRecorded}
        />

        <RecoveryTransactionModal
          isOpen={showTransactionModal}
          onClose={() => setShowTransactionModal(false)}
          stock={stock}
          userId={userId}
          initialBuyerName={txPrefill?.buyerName || ''}
          initialBuyerId={txPrefill?.buyerId || null}
          initialChannel={txPrefill?.channel || 'weekly_markets'}
          initialPrice={txPrefill?.price || null}
          initialQuantity={txPrefill?.quantity || null}
          linkedEnquiryId={txPrefill?.enquiryId || null}
          onTransactionCompleted={handleTransactionCompleted}
        />
      </div>
    </div>
  );
}

export default StockDetailModal;
