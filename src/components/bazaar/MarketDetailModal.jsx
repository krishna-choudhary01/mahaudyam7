import React from 'react';
import { AppIcon } from '../common/Icons';
import { Button } from '../common/Button';
import { useLanguage } from '../../i18n';
import './MarketDetailModal.css';

export function MarketDetailModal({ market, evaluation, onClose }) {
  const { t, isMarathi } = useLanguage();
  if (!market) return null;

  const {
    profitMetrics,
    scenarios,
    travelCalc,
    score,
    opportunityLabel,
    opportunityLabelMr,
    reasons = [],
    cautionFactors = []
  } = evaluation || {};

  return (
    <div className="modal-backdrop" role="presentation">
      <div 
        className="market-modal" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="market-modal-title"
      >
        <div className="market-modal__header">
          <div>
            <span className="modal-tag">{t('bazaar.dossier.modalTitle')}</span>
            <h2 id="market-modal-title" className="market-modal__title">
              {isMarathi ? (market.name_mr || market.name) : market.name}
            </h2>
            <span className="market-modal__subtitle">
              {isMarathi ? market.name : (market.name_mr || '')} • {market.taluka}, {market.district}
            </span>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        <div className="market-modal__body">
          {/* Top Verification & Net Opportunity Pill */}
          <div className="modal-banner">
            <div className="modal-opp-header">
              <div className="score-circle">
                <span className="score-circle-num">{score || 85}</span>
                <span className="score-circle-lbl">{isMarathi ? 'संधी गुण' : 'Score'}</span>
              </div>
              <div className="opp-meta">
                <strong className="opp-meta-title">
                  {isMarathi ? (opportunityLabelMr || 'चांगली नफा संधी') : (opportunityLabel || 'Viable Opportunity')}
                </strong>
                <p className="opp-meta-desc">
                  {isMarathi
                    ? `वाहतूक खर्च (₹${travelCalc?.travelCost || 0}), शेतमाल सुसंगतता आणि नफा क्षमता यावर आधारित संधी निर्देशांक.`
                    : `Evaluated on net profit potential, travel cost (₹${travelCalc?.travelCost || 0}), and product compatibility.`}
                </p>
              </div>
            </div>

            {market.verificationStatus === 'verified' ? (
              <div className="banner-status banner-verified">
                <AppIcon name="shield-check" size={18} color="#1b5e20" />
                <div>
                  <strong>{t('bazaar.marketCard.officialVerified')}</strong>
                  <p>{t('bazaar.dossier.verifiedSource')}</p>
                </div>
              </div>
            ) : (
              <div className="banner-status banner-sample">
                <AppIcon name="info" size={18} color="#b76e00" />
                <div>
                  <strong>{t('bazaar.marketCard.prototypeHaat')}</strong>
                  <p>{t('bazaar.dossier.sampleSource')}</p>
                </div>
              </div>
            )}
          </div>

          {/* 1. Complete Financial Profit Breakdown */}
          {profitMetrics && (
            <div className="modal-section financial-dossier">
              <h3 className="section-title">{t('bazaar.profit.title')}</h3>
              <div className="fin-summary-card">
                <div className="fin-main-metric">
                  <span className="fin-main-lbl">{t('bazaar.marketCard.netProfit')}</span>
                  <span className={`fin-main-val ${profitMetrics.netProfit >= 0 ? 'text-green' : 'text-red'}`}>
                    {profitMetrics.netProfit >= 0 ? '+' : ''}₹{profitMetrics.netProfit.toLocaleString('en-IN')}
                  </span>
                  <span className="fin-margin">{t('bazaar.profit.profitMargin')}: {profitMetrics.profitMargin}% • {t('bazaar.profit.roi')}: {profitMetrics.returnOnInvestment}%</span>
                </div>

                <div className="fin-breakdown-list">
                  <div className="fin-row">
                    <span>{t('bazaar.profit.grossRevenue')}:</span>
                    <strong>₹{profitMetrics.grossRevenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="fin-row text-muted">
                    <span>{t('bazaar.profit.productCost')}:</span>
                    <span>- ₹{profitMetrics.productCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="fin-row text-muted">
                    <span>{t('bazaar.profit.travelExpenses')}:</span>
                    <span>- ₹{profitMetrics.travelCost.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="fin-row text-muted">
                    <span>{t('bazaar.profit.marketFee')}:</span>
                    <span>- ₹{profitMetrics.stallFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="fin-row text-muted">
                    <span>{isMarathi ? 'पॅकेजिंग व इतर खर्च:' : 'Packaging & Handling:'}</span>
                    <span>- ₹{(profitMetrics.packagingCost + profitMetrics.otherExpenses).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="fin-row total-cost-row">
                    <span>{t('bazaar.profit.totalCost')}:</span>
                    <strong>₹{profitMetrics.totalCost.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              {/* Break-even & Risk Row */}
              <div className="break-even-grid">
                <div className="be-card">
                  <span className="be-lbl">{t('bazaar.profit.breakEvenHeading')}:</span>
                  <strong className="be-val">{profitMetrics.breakEvenQuantity} {t('common.units.kg')}</strong>
                  <small className="be-sub">{t('bazaar.profit.breakEvenDesc')}</small>
                </div>
                <div className="be-card">
                  <span className="be-lbl">{t('bazaar.profit.minSafePrice')}:</span>
                  <strong className="be-val">₹{profitMetrics.minSellingPrice} / {t('common.units.kg')}</strong>
                  <small className="be-sub">{t('bazaar.profit.minSafePriceDesc')}</small>
                </div>
                <div className="be-card">
                  <span className="be-lbl">{t('bazaar.profit.unsoldRiskHeading')}:</span>
                  <strong className="be-val text-warning">₹{profitMetrics.unsoldStockRiskValue.toLocaleString('en-IN')}</strong>
                  <small className="be-sub">{profitMetrics.unsoldQuantity} {t('common.units.kg')} {isMarathi ? 'शिल्लक माल' : 'unsold'}</small>
                </div>
              </div>
            </div>
          )}

          {/* 2. Three Scenarios Comparison */}
          {scenarios && (
            <div className="modal-section">
              <h3 className="section-title">{t('bazaar.profit.scenariosTitle')}</h3>
              <div className="scenarios-table-wrap">
                <table className="scenarios-table">
                  <thead>
                    <tr>
                      <th>{t('bazaar.profit.colScenario')}</th>
                      <th>{t('bazaar.profit.colSellThrough')}</th>
                      <th>{t('bazaar.profit.colRealizedPrice')}</th>
                      <th>{t('bazaar.profit.colTotalCost')}</th>
                      <th>{t('bazaar.profit.colNetProfit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="scenario-conservative">
                      <td>
                        <strong>{isMarathi ? scenarios.conservative.label_mr : scenarios.conservative.label_en}</strong>
                        <small className="scenario-sub">{isMarathi ? 'दुपारनंतरचे दर' : 'Lower afternoon price'}</small>
                      </td>
                      <td>65%</td>
                      <td>-10%</td>
                      <td>₹{scenarios.conservative.totalCost}</td>
                      <td className={scenarios.conservative.netProfit >= 0 ? 'text-green' : 'text-red'}>
                        ₹{scenarios.conservative.netProfit.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="scenario-expected">
                      <td>
                        <strong>{isMarathi ? scenarios.expected.label_mr : scenarios.expected.label_en}</strong>
                        <small className="scenario-sub">{isMarathi ? 'अपेक्षित बाजार' : 'Normal market day'}</small>
                      </td>
                      <td>85%</td>
                      <td>{isMarathi ? 'ठरलेला दर' : 'Standard'}</td>
                      <td>₹{scenarios.expected.totalCost}</td>
                      <td className="text-green font-bold">
                        ₹{scenarios.expected.netProfit.toLocaleString('en-IN')}
                      </td>
                    </tr>
                    <tr className="scenario-optimistic">
                      <td>
                        <strong>{isMarathi ? scenarios.optimistic.label_mr : scenarios.optimistic.label_en}</strong>
                        <small className="scenario-sub">{isMarathi ? 'ताजा दर्जेदार माल' : 'Freshness premium'}</small>
                      </td>
                      <td>100%</td>
                      <td>+10%</td>
                      <td>₹{scenarios.optimistic.totalCost}</td>
                      <td className="text-green font-bold">
                        +₹{scenarios.optimistic.netProfit.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Travel Intelligence Dossier */}
          {travelCalc && (
            <div className="modal-section">
              <h3 className="section-title">{t('bazaar.travel.title')}</h3>
              <div className="modal-grid">
                <div className="grid-item">
                  <span className="item-label">{t('bazaar.travel.colMode')}:</span>
                  <span className="item-val highlight">{isMarathi ? (travelCalc.mode?.name_mr || 'वाहतूक') : (travelCalc.mode?.name_en || 'Transit')}</span>
                </div>
                <div className="grid-item">
                  <span className="item-label">{t('bazaar.travel.roundTripRoad')}:</span>
                  <span className="item-val">{travelCalc.roundTripKm} km ({travelCalc.oneWayKm} km {isMarathi ? 'एका बाजूचे' : 'one-way'})</span>
                </div>
                <div className="grid-item">
                  <span className="item-label">{t('bazaar.travel.transitTime')}:</span>
                  <span className="item-val">~{travelCalc.estimatedTimeMinutes} {t('common.units.min')}</span>
                </div>
                <div className="grid-item">
                  <span className="item-label">{t('bazaar.travel.colRoundTripCost')}:</span>
                  <span className="item-val highlight">₹{travelCalc.travelCost}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Schedule & Official Location */}
          <div className="modal-section">
            <h3 className="section-title">{isMarathi ? 'स्थान व वेळापत्रक' : 'Location & Schedule'}</h3>
            <div className="modal-grid">
              <div className="grid-item">
                <span className="item-label">{t('home.selectDistrict')}:</span>
                <span className="item-val">{market.district} (LGD: {market.districtCode})</span>
              </div>
              <div className="grid-item">
                <span className="item-label">{t('home.selectTaluka')}:</span>
                <span className="item-val">{market.taluka} (LGD: {market.talukaCode})</span>
              </div>
              <div className="grid-item">
                <span className="item-label">{isMarathi ? 'वार:' : 'Operating Day:'}</span>
                <span className="item-val highlight">{isMarathi && t(`bazaar.calendar.days.${market.operatingDay}`) ? t(`bazaar.calendar.days.${market.operatingDay}`) : market.operatingDay}</span>
              </div>
              <div className="grid-item">
                <span className="item-label">{isMarathi ? 'वेळ:' : 'Timings:'}</span>
                <span className="item-val">{market.timings || '07:00 AM - 02:00 PM'}</span>
              </div>
            </div>
          </div>

          {/* Product Categories */}
          <div className="modal-section">
            <h3 className="section-title">{isMarathi ? 'स्वीकारला जाणारा शेतमाल व वस्तू' : 'Accepted Product Categories'}</h3>
            <div className="tags-container">
              {market.productCategories?.map((cat) => (
                <span key={cat} className="modal-category-tag">{cat}</span>
              ))}
            </div>
          </div>

          {/* Public APMC Benchmarks */}
          {market.priceIndicators && market.priceIndicators.length > 0 && (
            <div className="modal-section">
              <h3 className="section-title">{t('bazaar.dossier.commoditiesTitle')}</h3>
              <div className="price-table-wrapper">
                <table className="price-table">
                  <thead>
                    <tr>
                      <th>{isMarathi ? 'शेतमाल' : 'Commodity'}</th>
                      <th>{isMarathi ? 'बाजार दर' : 'Modal Price'}</th>
                      <th>{isMarathi ? 'कल' : 'Trend'}</th>
                      <th>{isMarathi ? 'दिनांक' : 'Reported Date'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {market.priceIndicators.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.commodity}</strong></td>
                        <td>₹{p.modalPrice} <small>{p.unit}</small></td>
                        <td>
                          <span className={`trend-badge ${p.trend}`}>
                            {p.trend === 'rising' ? (isMarathi ? '↗ वाढता दर' : '↗ Rising') : (isMarathi ? '→ स्थिर दर' : '→ Stable')}
                          </span>
                        </td>
                        <td>{p.lastReported}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommendation Reasons and Cautions */}
          <div className="modal-section">
            <h3 className="section-title">{isMarathi ? 'पारदर्शक विश्लेषण (Transparent Analysis)' : 'Recommendation Analysis'}</h3>
            <div className="reasons-dossier-box">
              <div className="reasons-col">
                <strong>{isMarathi ? 'अनुकूल कारणे:' : 'Positive Factors:'}</strong>
                <ul>
                  {reasons.map((r, i) => (
                    <li key={i} className="text-green">✓ {r}</li>
                  ))}
                </ul>
              </div>
              {cautionFactors.length > 0 && (
                <div className="reasons-col">
                  <strong>{isMarathi ? 'सावधगिरीच्या नोंदी:' : 'Cautionary Notes:'}</strong>
                  <ul>
                    {cautionFactors.map((c, i) => (
                      <li key={i} className="text-red">⚠ {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="market-modal__footer">
          <Button variant="primary" onClick={onClose} className="modal-action-btn">
            {t('bazaar.dossier.closeBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
