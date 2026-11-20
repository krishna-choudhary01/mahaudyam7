/**
 * MahaUdyam — Unsold Stock Rescue
 * ChannelRecommendationCard.jsx
 * 
 * Displays an individual recovery channel recommendation card with:
 * - Suitability Score Meter (0-100) & Confidence Level
 * - Hard Food Safety Disqualification Warning (if expired/damaged food)
 * - Tailored Reasons ("Why Recommended") & Limitations
 * - Financial Projection (Gross Revenue, Expenses, Net Recovery, Recovery Rate %)
 * - Verified Directory Buyers (NO fake buyers — clear notice when empty)
 * - Private Entrepreneur Action Recording (explored, contacted, deal_agreed, completed, dismissed)
 */

import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';

export function ChannelRecommendationCard({
  channel,
  stock,
  userId,
  currentLanguage,
  recordedActions = [],
  onActionRecorded,
  onInitiateEnquiry
}) {
  const { t } = useLanguage();
  const isMr = currentLanguage === 'mr';

  const [selectedAction, setSelectedAction] = useState('explored');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const title = isMr ? channel.title_mr : channel.title_en;
  const desc = isMr ? channel.desc_mr : channel.desc_en;
  const whyReasons = isMr ? channel.whyRecommended_mr : channel.whyRecommended_en;
  const limitations = isMr ? channel.limitations_mr : channel.limitations_en;
  const disqReason = isMr ? channel.disqualificationReason_mr : channel.disqualificationReason_en;
  const buyerNotice = isMr ? channel.buyerNotice_mr : channel.buyerNotice_en;

  const score = channel.suitabilityScore;
  const isDisqualified = channel.isDisqualified;
  const econ = channel.estimatedEconomics || {};

  // Score Color Mapping
  let scoreBadgeClass = 'score-low';
  if (score >= 75) scoreBadgeClass = 'score-high';
  else if (score >= 50) scoreBadgeClass = 'score-medium';
  if (isDisqualified) scoreBadgeClass = 'score-disqualified';

  // Confidence Pill Mapping
  const confidenceLabels = {
    high: t('unsoldStock.matching.confidenceHigh', 'High (Verified Data)'),
    moderate: t('unsoldStock.matching.confidenceModerate', 'Moderate (Regional Match)'),
    low: t('unsoldStock.matching.confidenceLow', 'Low (Advisory Match)')
  };

  // Find latest recorded action for this channel
  const latestAction = recordedActions.find((a) => a.channelId === channel.id);

  const handleRecordAction = async (e) => {
    e.preventDefault();
    if (!userId || !stock) return;

    try {
      setIsSubmittingAction(true);
      const actionResult = await unsoldStockService.recordChannelAction(
        userId,
        stock.id,
        channel.id,
        selectedAction,
        actionNotes
      );

      setActionSuccessMessage(t('unsoldStock.matching.actionLogged', 'Action recorded successfully!'));
      setActionNotes('');
      setShowActionForm(false);
      if (onActionRecorded) {
        onActionRecorded(actionResult);
      }
      setTimeout(() => setActionSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to record channel action:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className={`channel-rec-card ${isDisqualified ? 'card-disqualified' : ''}`}>
      {/* Header: Title, Icon, Score, Confidence */}
      <div className="channel-rec-header">
        <div className="channel-rec-title-wrap">
          <span className="channel-icon" aria-hidden="true">
            {channel.id === 'weekly_markets' && '🎪'}
            {channel.id === 'local_retailers' && '🏪'}
            {channel.id === 'bulk_buyers' && '📦'}
            {channel.id === 'food_processors' && '⚙️'}
            {channel.id === 'cooperatives' && '🤝'}
            {channel.id === 'alternative_markets' && '📍'}
            {channel.id === 'storage_preservation' && '❄️'}
            {channel.id === 'value_addition' && '🌾'}
          </span>
          <div>
            <h4 className="channel-title">{title}</h4>
            <p className="channel-desc">{desc}</p>
          </div>
        </div>

        <div className="channel-metrics">
          <div className={`score-badge ${scoreBadgeClass}`}>
            <span className="score-val">{score}</span>
            <span className="score-denom">/100</span>
          </div>
          <span className={`confidence-pill confidence-${channel.confidence}`}>
            {confidenceLabels[channel.confidence] || channel.confidence}
          </span>
        </div>
      </div>

      {/* Disqualification Banner */}
      {isDisqualified && (
        <div className="disqualification-alert" role="alert">
          <span className="alert-icon" aria-hidden="true">🚫</span>
          <div>
            <strong>{t('unsoldStock.matching.disqualifiedBadge', 'Safety Disqualified')}</strong>
            <p>{disqReason}</p>
          </div>
        </div>
      )}

      {/* Financials / Economics Preview */}
      {!isDisqualified && econ.potentialGrossRevenue > 0 && (
        <div className="channel-economics-strip">
          <div className="econ-stat">
            <span className="econ-label">{t('unsoldStock.calculator.expectedPricePerUnit', 'Est. Price / Unit')}</span>
            <span className="econ-value">₹{econ.expectedSellingPricePerUnit} <small>/{stock.unit}</small></span>
          </div>
          <div className="econ-stat">
            <span className="econ-label">{t('unsoldStock.calculator.potentialRevenue', 'Gross Revenue')}</span>
            <span className="econ-value">₹{econ.potentialGrossRevenue?.toLocaleString('en-IN')}</span>
          </div>
          <div className="econ-stat">
            <span className="econ-label">{t('unsoldStock.calculator.totalExpenses', 'Est. Expenses')}</span>
            <span className="econ-value expense-val">-₹{econ.estimatedExpenses?.totalExpenses?.toLocaleString('en-IN')}</span>
          </div>
          <div className="econ-stat highlight">
            <span className="econ-label">{t('unsoldStock.calculator.netRecoveryValue', 'Net Recovery')}</span>
            <span className="econ-value net-val">₹{econ.netRecoveryValue?.toLocaleString('en-IN')}</span>
          </div>
          <div className="econ-stat">
            <span className="econ-label">{t('unsoldStock.comparison.colRate', 'Recovery Rate')}</span>
            <span className="econ-value">{econ.recoveryRatePercent}%</span>
          </div>
          <div className="econ-stat">
            <span className="econ-label">{t('unsoldStock.matching.timeframeLabel', 'Turnaround')}</span>
            <span className="econ-value time-val">{isMr ? econ.timeframe_mr : econ.timeframe_en}</span>
          </div>
        </div>
      )}

      {/* Why Recommended & Tradeoffs */}
      <div className="channel-details-grid">
        {whyReasons && whyReasons.length > 0 && (
          <div className="channel-box reasons-box">
            <h5 className="box-title">✅ {t('unsoldStock.matching.whyRecommended', 'Why This Channel Fits')}</h5>
            <ul>
              {whyReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {limitations && limitations.length > 0 && (
          <div className="channel-box limitations-box">
            <h5 className="box-title">⚠️ {t('unsoldStock.matching.limitationsRisks', 'Key Considerations & Tradeoffs')}</h5>
            <ul>
              {limitations.map((limit, idx) => (
                <li key={idx}>{limit}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Verified Buyers & Mandis Section */}
      <div className="channel-buyers-section">
        <h5 className="buyers-title">
          🏢 {t('unsoldStock.matching.buyersHeader', 'Verified Buyers & Mandis in Directory')}
        </h5>

        {channel.matchedBuyers && channel.matchedBuyers.length > 0 ? (
          <div className="matched-buyers-list">
            {channel.matchedBuyers.map((buyer, idx) => (
              <div key={buyer.id || idx} className="buyer-item">
                <div className="buyer-main">
                  <strong>{isMr && buyer.name_mr ? buyer.name_mr : buyer.name}</strong>
                  <span className="buyer-type">{buyer.type}</span>
                  {buyer.operatingDay && (
                    <span className="buyer-schedule">📅 {buyer.operatingDay} • {buyer.timings}</span>
                  )}
                  {buyer.verificationSource && (
                    <span className="buyer-source">🛡️ {buyer.verificationSource}</span>
                  )}
                </div>
                <div className="buyer-meta">
                  <span className="buyer-loc">📍 {buyer.taluka}</span>
                  {buyer.distanceKm != null && (
                    <span className="buyer-dist">~{buyer.distanceKm} km</span>
                  )}
                  {buyer.stallFee != null && (
                    <span className="buyer-fee">Stall Fee: ₹{buyer.stallFee}</span>
                  )}
                  <span className="verified-badge">✓ Verified</span>

                  {onInitiateEnquiry && !isDisqualified && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm buyer-enquiry-btn"
                      onClick={() => onInitiateEnquiry(buyer, channel.id)}
                    >
                      ✉️ {t('unsoldStock.enquiry.initiateBtn', 'Initiate Enquiry')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-buyers-notice-wrap">
            <div className="no-buyers-notice">
              <span aria-hidden="true">ℹ️</span>
              <span>{buyerNotice || t('unsoldStock.matching.noBuyersNotice', 'No verified buyer currently available in the directory for this taluka. Recommendations are rule-based advisory.')}</span>
            </div>
            {onInitiateEnquiry && !isDisqualified && (
              <button
                type="button"
                className="btn btn-outline btn-sm manual-contact-btn"
                onClick={() => onInitiateEnquiry(null, channel.id)}
              >
                📝 {t('unsoldStock.enquiry.unverifiedContactModalTitle', 'Record External Unverified Contact')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Latest Recorded Action / Action Record Button */}
      <div className="channel-action-footer">
        {latestAction && (
          <div className="latest-action-badge">
            <span className="action-tag">
              📌 {t(`unsoldStock.matching.actions.${latestAction.actionType}`, latestAction.actionType)}
            </span>
            <span className="action-time">
              {new Date(latestAction.timestamp).toLocaleDateString()}
            </span>
            {latestAction.notes && <span className="action-notes">"{latestAction.notes}"</span>}
          </div>
        )}

        {actionSuccessMessage && (
          <div className="action-success-msg" role="status">
            ✓ {actionSuccessMessage}
          </div>
        )}

        {!showActionForm ? (
          <button
            type="button"
            className="btn btn-outline btn-sm action-toggle-btn"
            onClick={() => setShowActionForm(true)}
          >
            ✏️ {t('unsoldStock.matching.recordActionBtn', 'Record Action')}
          </button>
        ) : (
          <form className="channel-action-form" onSubmit={handleRecordAction}>
            <div className="form-row">
              <label htmlFor={`action-select-${channel.id}`}>
                {t('unsoldStock.matching.actionHeader', 'Action')}
              </label>
              <select
                id={`action-select-${channel.id}`}
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="action-select"
              >
                <option value="explored">{t('unsoldStock.matching.actions.explored', 'Explored Details')}</option>
                <option value="contacted">{t('unsoldStock.matching.actions.contacted', 'Contacted Buyer/Market')}</option>
                <option value="deal_agreed">{t('unsoldStock.matching.actions.deal_agreed', 'Deal Agreed')}</option>
                <option value="completed">{t('unsoldStock.matching.actions.completed', 'Recovery Completed')}</option>
                <option value="dismissed">{t('unsoldStock.matching.actions.dismissed', 'Dismissed / Not Pursuing')}</option>
              </select>
            </div>

            <div className="form-row">
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t('unsoldStock.matching.actionNotesPlaceholder', 'Optional notes (e.g. called mandi trader, agreed ₹14/kg)...')}
                className="action-input"
              />
            </div>

            <div className="action-btn-group">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isSubmittingAction}
              >
                {isSubmittingAction ? 'Saving...' : t('unsoldStock.matching.recordActionBtn', 'Save Action')}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowActionForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ChannelRecommendationCard;
