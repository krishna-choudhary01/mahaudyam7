import React, { useState } from 'react';
import { AppIcon } from '../common/Icons';
import { Button } from '../common/Button';
import { useLanguage } from '../../i18n';
import './MarketCard.css';

export function MarketCard({
  evaluation,
  isFavorite,
  onToggleFavorite,
  onViewDetails
}) {
  const { t, isMarathi } = useLanguage();
  const [showExplanation, setShowExplanation] = useState(false);
  const {
    market,
    score,
    opportunityLabel,
    opportunityLabelMr,
    reasons = [],
    cautionFactors = [],
    daysUntil,
    distanceText,
    travelCalc,
    profitMetrics
  } = evaluation;

  // Operating day timing tag
  let timingBadgeText = null;
  let timingBadgeClass = '';
  if (daysUntil === 0) {
    timingBadgeText = t('bazaar.marketCard.openToday');
    timingBadgeClass = 'timing-badge--today';
  } else if (daysUntil === 1) {
    timingBadgeText = t('bazaar.marketCard.openTomorrow');
    timingBadgeClass = 'timing-badge--tomorrow';
  } else if (daysUntil != null) {
    timingBadgeText = t('bazaar.marketCard.daysRemaining', { days: daysUntil });
    timingBadgeClass = 'timing-badge--days';
  }

  // Score color helper
  let scoreClass = 'score-high';
  if (score < 50) scoreClass = 'score-low';
  else if (score < 75) scoreClass = 'score-medium';

  // Profit color helper
  const netProfit = profitMetrics?.netProfit || 0;
  const isProfitable = netProfit > 0;

  return (
    <article className="bazaar-card" aria-label={`Market: ${market.name}`}>
      {/* Top Banner: Verification & Schedule Timing */}
      <div className="bazaar-card__top">
        <div className="top-badges">
          {market.verificationStatus === 'verified' ? (
            <span className="badge-verified" title="Verified against official MSAMB / APMC directories">
              <AppIcon name="shield-check" size={13} color="#1b5e20" />
              <span>{t('bazaar.marketCard.officialVerified')}</span>
            </span>
          ) : (
            <span className="badge-sample" title="Community reported weekly haat record">
              📍 {t('bazaar.marketCard.prototypeHaat')}
            </span>
          )}

          {timingBadgeText && (
            <span className={`timing-badge ${timingBadgeClass}`}>
              {timingBadgeText}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          className={`favorite-btn ${isFavorite ? 'favorite-btn--active' : ''}`}
          onClick={() => onToggleFavorite(market.id)}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          title={isFavorite ? 'Remove from personal favorites' : 'Save to personal favorites'}
        >
          <AppIcon
            name={isFavorite ? 'heart-fill' : 'heart'}
            size={20}
            color={isFavorite ? '#c62828' : '#757575'}
          />
        </button>
      </div>

      {/* Title & Location Row */}
      <div className="bazaar-card__header">
        <h3 className="bazaar-title-mr">
          {isMarathi ? (market.name_mr || market.name) : market.name}
        </h3>
        <span className="bazaar-title-en">
          {isMarathi ? market.name : (market.name_mr || '')}
        </span>
        
        <div className="location-row">
          <AppIcon name="map-pin" size={15} color="#2b5329" />
          <span className="location-text">
            {market.taluka}, {market.district} • <strong className="distance-highlight">{distanceText}</strong>
          </span>
        </div>
      </div>

      {/* Net Opportunity Score & Profit Intelligence Strip */}
      <div className="opportunity-strip">
        <div className="opp-left">
          <span className="opp-label">{t('bazaar.marketCard.netOpportunityScore')}:</span>
          <div className="opp-title-row">
            <span className={`score-badge ${scoreClass}`}>
              <span className="score-num">{score}</span>
              <span className="score-max">/100</span>
            </span>
            <span className="opp-verdict">{isMarathi ? (opportunityLabelMr || opportunityLabel) : opportunityLabel}</span>
          </div>
        </div>

        {profitMetrics && (
          <div className={`profit-badge-pill ${isProfitable ? 'profit--positive' : 'profit--negative'}`}>
            <span className="profit-lbl">{t('bazaar.marketCard.netProfit')}</span>
            <strong className="profit-amount">
              {isProfitable ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
            </strong>
            <small className="margin-tag">{t('bazaar.profit.profitMargin')}: {profitMetrics.profitMargin}%</small>
          </div>
        )}
      </div>

      {/* Financial & Travel Summary Grid */}
      <div className="fin-metrics-grid">
        <div className="fin-metric">
          <span className="fin-lbl">{t('bazaar.marketCard.travelCost')}</span>
          <strong className="fin-val">₹{travelCalc?.travelCost || 0}</strong>
          <small className="fin-sub">{isMarathi ? (travelCalc?.mode?.name_mr || 'वाहतूक') : (travelCalc?.mode?.name_en || 'Transit')}</small>
        </div>
        <div className="fin-metric">
          <span className="fin-lbl">{t('bazaar.profit.grossRevenue')}</span>
          <strong className="fin-val">₹{(profitMetrics?.grossRevenue || 0).toLocaleString('en-IN')}</strong>
          <small className="fin-sub">{profitMetrics?.sellThroughPct}% {isMarathi ? 'विक्री अंदाज' : 'sales est.'}</small>
        </div>
        <div className="fin-metric">
          <span className="fin-lbl">{t('bazaar.marketCard.breakEven')}</span>
          <strong className="fin-val">{profitMetrics?.breakEvenQuantity || 0} {t('common.units.kg')}</strong>
          <small className="fin-sub">{isMarathi ? 'किमान सुरक्षित मर्यादा' : 'Safe threshold'}</small>
        </div>
        <div className="fin-metric">
          <span className="fin-lbl">{t('bazaar.profit.unsoldRiskHeading')}</span>
          <strong className="fin-val text-warning">₹{(profitMetrics?.unsoldStockRiskValue || 0).toLocaleString('en-IN')}</strong>
          <small className="fin-sub">{profitMetrics?.unsoldQuantity || 0} {t('common.units.kg')} {isMarathi ? 'शिल्लक' : 'unsold'}</small>
        </div>
      </div>

      {/* Schedule, Day & Timings */}
      <div className="schedule-bar">
        <div className="schedule-item">
          <AppIcon name="calendar" size={16} color="#4b5563" />
          <span>{isMarathi ? 'वार:' : 'Day:'} <strong>{isMarathi && t(`bazaar.calendar.days.${market.operatingDay}`) ? t(`bazaar.calendar.days.${market.operatingDay}`) : market.operatingDay}</strong></span>
        </div>
        <div className="schedule-item">
          <AppIcon name="clock" size={16} color="#4b5563" />
          <span>{isMarathi ? 'वेळ:' : 'Time:'} {market.timings || '07:00 AM - 02:00 PM'}</span>
        </div>
        <div className="schedule-item">
          <span>{isMarathi ? 'गाळा फी:' : 'Stall Fee:'} ₹{market.stallFee || 50}</span>
        </div>
      </div>

      {/* Public APMC Price Benchmarks (if available) */}
      {market.priceIndicators && market.priceIndicators.length > 0 && (
        <div className="price-benchmark-box">
          <div className="price-benchmark-header">
            <AppIcon name="trending-up" size={14} color="#1b5e20" />
            <span>{isMarathi ? 'सार्वजनिक दर निर्देशांक:' : 'Public APMC Price Indicators:'}</span>
          </div>
          <div className="prices-grid">
            {market.priceIndicators.map((p, idx) => (
              <div key={idx} className="price-pill">
                <span className="price-commodity">{p.commodity}:</span>
                <strong className="price-amount">₹{p.modalPrice}</strong>
                <span className="price-unit">{p.unit}</span>
                {p.trend === 'rising' && <span className="trend-arrow up" title="Rising trend">↗</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transparent Explanation Accordion */}
      <div className="explanation-section">
        <button
          type="button"
          className="explanation-toggle-btn"
          onClick={() => setShowExplanation(!showExplanation)}
          aria-expanded={showExplanation}
        >
          <AppIcon name="info" size={16} color="#2b5329" />
          <span>
            {showExplanation
              ? (isMarathi ? 'शिफारस विश्लेषण लपवा' : 'Hide Recommendation Analysis')
              : (isMarathi ? 'का शिफारस केली? (पारदर्शक विश्लेषण)' : 'Why Recommended? (Transparent Analysis)')}
          </span>
          <span className="toggle-symbol">{showExplanation ? '▲' : '▼'}</span>
        </button>

        {showExplanation && (
          <div className="explanation-content">
            <div className="reasons-list">
              <strong className="reasons-heading">{isMarathi ? 'अनुकूल घटक (Positive Factors):' : 'Positive Factors:'}</strong>
              <ul>
                {reasons.map((r, i) => (
                  <li key={i} className="reason-item positive">
                    <span className="bullet">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>

            {cautionFactors.length > 0 && (
              <div className="reasons-list caution">
                <strong className="reasons-heading">{isMarathi ? 'लक्षात घेण्यासारखे घटक (Cautionary Factors):' : 'Cautionary Factors:'}</strong>
                <ul>
                  {cautionFactors.map((c, i) => (
                    <li key={i} className="reason-item negative">
                      <span className="bullet">⚠</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="metadata-strip">
              <span>{isMarathi ? 'माहिती स्रोत:' : 'Source:'} <strong>{market.dataSource || 'MSAMB'}</strong></span>
              <span>{isMarathi ? 'अंतिम अद्यतन:' : 'Updated:'} {market.lastUpdated ? new Date(market.lastUpdated).toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN') : t('common.na')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        <Button
          variant="primary"
          className="card-detail-btn"
          onClick={() => onViewDetails(market)}
        >
          {t('bazaar.marketCard.viewDossier')}
        </Button>
      </div>
    </article>
  );
}
