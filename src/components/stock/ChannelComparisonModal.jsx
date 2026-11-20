/**
 * MahaUdyam — Unsold Stock Rescue
 * ChannelComparisonModal.jsx
 * 
 * Side-by-side comparison modal for candidate recovery channels.
 * Compares:
 * - Suitability Score & Disqualification Status
 * - Potential Gross Revenue
 * - Itemized Additional Expenses
 * - Net Recovery Value
 * - Value Recovery Rate (%)
 * - Turnaround Timeframe & Operational Effort
 * - Verified Buyers Count in Directory
 */

import React from 'react';
import { useLanguage } from '../../i18n';

export function ChannelComparisonModal({ isOpen, onClose, stock, channels = [], currentLanguage }) {
  const { t } = useLanguage();
  if (!isOpen || !stock) return null;

  const isMr = currentLanguage === 'mr';
  const prodName = isMr && stock.productName_mr ? stock.productName_mr : stock.productName;

  // Find max net recovery to highlight top performer
  const maxNetRecovery = Math.max(
    0,
    ...channels
      .filter((c) => !c.isDisqualified)
      .map((c) => c.estimatedEconomics?.netRecoveryValue || 0)
  );

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container modal-wide comparison-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              📊 {t('unsoldStock.comparison.modalTitle', 'Side-by-Side Channel Comparison Matrix')}
            </h3>
            <p className="modal-subtitle">
              {prodName} • {stock.availableQuantity} {stock.unit}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>{t('unsoldStock.comparison.colChannel', 'Recovery Channel')}</th>
                  <th>{t('unsoldStock.comparison.colScore', 'Suitability')}</th>
                  <th>{t('unsoldStock.comparison.colGross', 'Gross Revenue')}</th>
                  <th>{t('unsoldStock.comparison.colExpenses', 'Expenses')}</th>
                  <th>{t('unsoldStock.comparison.colNet', 'Net Recovery')}</th>
                  <th>{t('unsoldStock.comparison.colRate', 'Recovery Rate')}</th>
                  <th>{t('unsoldStock.comparison.colTime', 'Turnaround')}</th>
                  <th>{t('unsoldStock.comparison.colEffort', 'Effort')}</th>
                  <th>{t('unsoldStock.comparison.colBuyers', 'Verified Buyers')}</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const econ = ch.estimatedEconomics || {};
                  const isTopNet = !ch.isDisqualified && econ.netRecoveryValue === maxNetRecovery && maxNetRecovery > 0;
                  const title = isMr ? ch.title_mr : ch.title_en;
                  const timeframe = isMr ? econ.timeframe_mr : econ.timeframe_en;

                  return (
                    <tr
                      key={ch.id}
                      className={`${ch.isDisqualified ? 'row-disqualified' : ''} ${isTopNet ? 'row-highlight' : ''}`}
                    >
                      <td className="cell-channel">
                        <div className="channel-id-cell">
                          <span className="channel-icon" aria-hidden="true">
                            {ch.id === 'weekly_markets' && '🎪'}
                            {ch.id === 'local_retailers' && '🏪'}
                            {ch.id === 'bulk_buyers' && '📦'}
                            {ch.id === 'food_processors' && '⚙️'}
                            {ch.id === 'cooperatives' && '🤝'}
                            {ch.id === 'alternative_markets' && '📍'}
                            {ch.id === 'storage_preservation' && '❄️'}
                            {ch.id === 'value_addition' && '🌾'}
                          </span>
                          <div>
                            <strong>{title}</strong>
                            {isTopNet && <span className="top-net-badge">★ Highest Net Value</span>}
                          </div>
                        </div>
                      </td>

                      <td className="cell-score">
                        {ch.isDisqualified ? (
                          <span className="badge-disqualified">
                            {t('unsoldStock.comparison.disqualifiedRow', 'Disqualified')}
                          </span>
                        ) : (
                          <div className="score-meter-mini">
                            <span className="score-num">{ch.suitabilityScore}</span>
                            <small>/100</small>
                          </div>
                        )}
                      </td>

                      <td className="cell-gross">
                        {ch.isDisqualified ? '—' : `₹${econ.potentialGrossRevenue?.toLocaleString('en-IN')}`}
                      </td>

                      <td className="cell-expenses">
                        {ch.isDisqualified ? '—' : (
                          <span className="expense-text">
                            ₹{econ.estimatedExpenses?.totalExpenses?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="cell-net">
                        {ch.isDisqualified ? '—' : (
                          <strong className="net-text">
                            ₹{econ.netRecoveryValue?.toLocaleString('en-IN')}
                          </strong>
                        )}
                      </td>

                      <td className="cell-rate">
                        {ch.isDisqualified ? '—' : `${econ.recoveryRatePercent}%`}
                      </td>

                      <td className="cell-time">{timeframe || '—'}</td>

                      <td className="cell-effort">
                        <span className={`effort-tag effort-${econ.effortLevel}`}>
                          {econ.effortLevel === 'low' && t('unsoldStock.comparison.lowEffort', 'Low')}
                          {econ.effortLevel === 'moderate' && t('unsoldStock.comparison.moderateEffort', 'Moderate')}
                          {econ.effortLevel === 'high' && t('unsoldStock.comparison.highEffort', 'High')}
                        </span>
                      </td>

                      <td className="cell-buyers">
                        {ch.matchedBuyers && ch.matchedBuyers.length > 0 ? (
                          <span className="buyer-count-tag">
                            ✓ {ch.matchedBuyers.length} Verified
                          </span>
                        ) : (
                          <span className="buyer-empty-tag">0 Listed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="comparison-guidance-box">
            <p>
              💡 <strong>{t('unsoldStock.matching.limitationsRisks', 'Guidance Note')}:</strong>{' '}
              {t(
                'unsoldStock.comparison.modalSubtitle',
                'Higher net value options may require longer turnaround times or greater operational effort. Always verify buyer readiness before transporting perishable inventory.'
              )}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('unsoldStock.comparison.closeModal', 'Close Comparison')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChannelComparisonModal;
