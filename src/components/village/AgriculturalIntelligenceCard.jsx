import React from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';

export function AgriculturalIntelligenceCard({ profile }) {
  const { t, isMarathi } = useLanguage();

  if (!profile) return null;

  const agri = profile.agriculture || {};
  const majorCrops = agri.majorCrops || [];
  const horticulture = agri.horticulture || [];
  const dairy = agri.dairyLivestock || {};
  const byProducts = agri.byProducts || [];
  const possibilities = agri.processingPossibilities || [];

  return (
    <div className="intelligence-detail-card">
      <div className="card-top-bar">
        <div className="card-top-bar__title">
          <AppIcon name="farmer" size={20} />
          <h3>{t('villageDetector.agricultureCard.title')}</h3>
        </div>
        <span className={`status-badge status-${agri.status || 'unknown'}`}>
          {t(`villageDetector.qualityBadges.${agri.status || 'unknown'}`)}
        </span>
      </div>

      {/* 1. Major Crops Table */}
      <div className="intelligence-section">
        <h4 className="section-heading">
          {t('villageDetector.agricultureCard.majorCrops')} ({majorCrops.length})
        </h4>

        {majorCrops.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="village-data-table">
              <thead>
                <tr>
                  <th>{t('villageDetector.agricultureCard.cropName')}</th>
                  <th>{t('villageDetector.agricultureCard.season')}</th>
                  <th>{t('villageDetector.agricultureCard.acreage')}</th>
                  <th>{t('villageDetector.agricultureCard.yield')}</th>
                  <th>{t('villageDetector.agricultureCard.category')}</th>
                </tr>
              </thead>
              <tbody>
                {majorCrops.map((crop, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{isMarathi ? crop.name_mr : crop.name}</strong>
                    </td>
                    <td><span className="season-pill">{crop.season}</span></td>
                    <td>{crop.estimatedHectares ? `${crop.estimatedHectares} Ha` : '—'}</td>
                    <td>{crop.yieldPerHectare || '—'}</td>
                    <td>{crop.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-section-notice">
            {isMarathi ? 'या गावात पिकांची अधिकृत सांख्यिकी उपलब्ध नाही.' : 'No crop statistics available for this village.'}
          </p>
        )}
      </div>

      {/* 2. Horticulture Section */}
      {horticulture.length > 0 && (
        <div className="intelligence-section">
          <h4 className="section-heading">{t('villageDetector.agricultureCard.horticulture')}</h4>
          <div className="horticulture-grid">
            {horticulture.map((item, idx) => (
              <div key={idx} className="horticulture-item-card">
                <div className="hort-name">{isMarathi ? item.crop_mr : item.crop}</div>
                <div className="hort-details">
                  <div><strong>{isMarathi ? 'वाण:' : 'Varieties:'}</strong> {item.varieties}</div>
                  <div><strong>{isMarathi ? 'क्षेत्र:' : 'Acreage:'}</strong> {item.acreage}</div>
                  {item.exportPotential && (
                    <div className="export-pill">
                      {isMarathi ? 'निर्यात क्षमता:' : 'Export Potential:'} {item.exportPotential}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Dairy & Livestock Activities */}
      <div className="intelligence-section">
        <h4 className="section-heading">{t('villageDetector.agricultureCard.dairyLivestock')}</h4>
        <div className="dairy-metrics-grid">
          <div className="metric-cell">
            <span className="metric-label">{t('villageDetector.agricultureCard.cows')}</span>
            <span className="metric-val">{dairy.cowsCount != null ? dairy.cowsCount.toLocaleString() : 'Unknown'}</span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">{t('villageDetector.agricultureCard.buffaloes')}</span>
            <span className="metric-val">{dairy.buffaloCount != null ? dairy.buffaloCount.toLocaleString() : 'Unknown'}</span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">{t('villageDetector.agricultureCard.goats')}</span>
            <span className="metric-val">{dairy.goatCount != null ? dairy.goatCount.toLocaleString() : 'Unknown'}</span>
          </div>
          <div className="metric-cell metric-cell--highlight">
            <span className="metric-label">{t('villageDetector.agricultureCard.dailyMilk')}</span>
            <span className="metric-val">
              {dairy.dailyMilkCollectionLpd != null ? `${dairy.dailyMilkCollectionLpd.toLocaleString()} LPD` : 'Unknown'}
            </span>
          </div>
          <div className="metric-cell">
            <span className="metric-label">{t('villageDetector.agricultureCard.chillingCenter')}</span>
            <span className="metric-val">
              {dairy.chillingCenterAvailable ? (isMarathi ? '✓ उपलब्ध' : '✓ Yes') : (isMarathi ? '✗ नाही' : '✗ No')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Agricultural By-Products & Waste Biomass */}
      {byProducts.length > 0 && (
        <div className="intelligence-section">
          <h4 className="section-heading">{t('villageDetector.agricultureCard.byProducts')}</h4>
          <div className="byproducts-list">
            {byProducts.map((bp, idx) => (
              <div key={idx} className="byproduct-card">
                <div className="byproduct-name">{isMarathi ? bp.name_mr : bp.name}</div>
                <div className="byproduct-vol">{bp.estimatedVolume}</div>
                <div className="byproduct-uses">
                  <strong>{isMarathi ? 'उपयोग:' : 'Potential Uses:'}</strong> {bp.potentialUses}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Processing Opportunities */}
      {possibilities.length > 0 && (
        <div className="intelligence-section">
          <h4 className="section-heading">{t('villageDetector.agricultureCard.processingOpportunities')}</h4>
          <div className="possibilities-grid">
            {possibilities.map((pos, idx) => (
              <div key={idx} className="possibility-card">
                <div className="possibility-header">
                  <span className="possibility-title">{isMarathi ? pos.title_mr : pos.title}</span>
                  <span className="possibility-stage">{pos.viabilityStage}</span>
                </div>
                <span className="possibility-type">{pos.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Citation */}
      {agri.source && (
        <div className="data-source-footer">
          <AppIcon name="shield" size={13} />
          <span>
            {t('villageDetector.agricultureCard.sourceAttribution')} {agri.source.name} • {agri.source.ref}
            {agri.source.retrievalDate && ` (${agri.source.retrievalDate})`}
          </span>
        </div>
      )}
    </div>
  );
}

export default AgriculturalIntelligenceCard;
