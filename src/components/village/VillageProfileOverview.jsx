import React from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { DATA_QUALITY_STATUS } from '../../services/village/villageOpportunityService';

export function VillageProfileOverview({ profile, onSelectTab, onOpenAdminContribution, isAdmin }) {
  const { t, isMarathi } = useLanguage();

  if (!profile) return null;

  const completeness = profile.dataCompleteness ?? 0;
  const breakdown = profile.completenessBreakdown || {};

  const getStatusBadge = (status) => {
    switch (status) {
      case DATA_QUALITY_STATUS.VERIFIED:
        return { label: t('villageDetector.qualityBadges.verified'), class: 'status-verified', icon: 'check' };
      case DATA_QUALITY_STATUS.COMMUNITY_REPORTED:
        return { label: t('villageDetector.qualityBadges.community_reported'), class: 'status-community', icon: 'signal' };
      case DATA_QUALITY_STATUS.ESTIMATED:
        return { label: t('villageDetector.qualityBadges.estimated'), class: 'status-estimated', icon: 'filter' };
      case DATA_QUALITY_STATUS.OUTDATED:
        return { label: t('villageDetector.qualityBadges.outdated'), class: 'status-outdated', icon: 'time' };
      case DATA_QUALITY_STATUS.UNKNOWN:
      default:
        return { label: t('villageDetector.qualityBadges.unknown'), class: 'status-unknown', icon: 'close' };
    }
  };

  const categories = [
    { key: 'agriculture', label: isMarathi ? 'कृषी व दुग्धव्यवसाय' : 'Agriculture & Dairy', tab: 'agriculture', obj: breakdown.agriculture },
    { key: 'rawMaterials', label: isMarathi ? 'कच्चा माल' : 'Raw Materials', tab: 'rawMaterials', obj: breakdown.rawMaterials },
    { key: 'localSkills', label: isMarathi ? 'स्थानिक कौशल्ये' : 'Local Skills', tab: 'localSkills', obj: breakdown.localSkills },
    { key: 'existingBusinesses', label: isMarathi ? 'व्यवसाय सूची' : 'Businesses', tab: 'businesses', obj: breakdown.existingBusinesses },
    { key: 'customerDemand', label: isMarathi ? 'ग्राहक मागणी' : 'Customer Demand', tab: 'demand', obj: breakdown.customerDemand },
    { key: 'infrastructure', label: isMarathi ? 'पायाभूत सुविधा' : 'Infrastructure', tab: 'infrastructure', obj: breakdown.infrastructure }
  ];

  return (
    <div className="village-overview">
      {/* 1. Header Card */}
      <div className="village-header-card">
        <div className="village-header-content">
          <div className="village-title-group">
            <span className="village-lgd-pill">LGD: {profile.villageCode}</span>
            <h2 className="village-name">
              {isMarathi ? (profile.villageName_mr || profile.villageName) : profile.villageName}
            </h2>
            <div className="village-location-trail">
              <span>{isMarathi ? profile.districtName_mr : profile.districtName}</span>
              <span className="trail-divider">/</span>
              <span>{isMarathi ? profile.talukaName_mr : profile.talukaName}</span>
              {profile.pincode && profile.pincode !== 'Unknown' && (
                <>
                  <span className="trail-divider">•</span>
                  <span>{t('villageDetector.pincode')} {profile.pincode}</span>
                </>
              )}
              {profile.populationEstimate && (
                <>
                  <span className="trail-divider">•</span>
                  <span>{t('villageDetector.population')} {profile.populationEstimate.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="admin-contribute-btn"
              onClick={onOpenAdminContribution}
              title={t('villageDetector.adminContribution.btnTitle')}
            >
              <AppIcon name="edit" size={15} />
              <span>{t('villageDetector.adminContribution.btnTitle')}</span>
            </button>
          )}
        </div>

        {/* 2. Data Completeness Meter */}
        <div className="completeness-bar-container">
          <div className="completeness-bar-header">
            <span className="completeness-title">
              <AppIcon name="analysis" size={15} />
              {t('villageDetector.completeness')}: <strong>{completeness}%</strong>
            </span>
            <span className="completeness-last-updated">
              {t('villageDetector.lastUpdated')} {new Date(profile.lastUpdated || Date.now()).toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN')}
            </span>
          </div>

          <div className="completeness-progress-track" role="progressbar" aria-valuenow={completeness} aria-valuemin="0" aria-valuemax="100">
            <div
              className={`completeness-progress-fill ${completeness >= 75 ? 'fill-high' : completeness >= 40 ? 'fill-mid' : 'fill-low'}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="completeness-help-text">
            {t('villageDetector.completenessHelp')}
          </p>
        </div>
      </div>

      {/* 3. 6-Dimension Coverage Grid */}
      <div className="dimension-coverage-grid">
        {categories.map((cat) => {
          const badge = getStatusBadge(cat.obj?.status);
          return (
            <div
              key={cat.key}
              className={`dimension-card ${badge.class}`}
              onClick={() => onSelectTab(cat.tab)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectTab(cat.tab); }}
            >
              <div className="dimension-card-header">
                <span className="dimension-name">{cat.label}</span>
                <span className={`status-pill ${badge.class}`}>
                  <AppIcon name={badge.icon} size={11} />
                  <span>{cat.obj?.status || 'unknown'}</span>
                </span>
              </div>
              <div className="dimension-score-row">
                <span className="dimension-score">Score: {cat.obj?.score ?? 0} pts</span>
                <span className="view-detail-link">
                  {isMarathi ? 'तपशील पहा →' : 'View Details →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Executive Summary Highlights */}
      <div className="village-summary-highlights">
        {/* Agri Snapshot */}
        <div className="highlight-box">
          <div className="highlight-box__header">
            <AppIcon name="farmer" size={16} />
            <h4>{isMarathi ? 'प्रमुख कृषी पिके' : 'Top Crops'}</h4>
          </div>
          {profile.agriculture?.majorCrops?.length > 0 ? (
            <div className="tags-cloud">
              {profile.agriculture.majorCrops.slice(0, 4).map((crop, i) => (
                <span key={i} className="crop-tag">
                  {isMarathi ? crop.name_mr : crop.name} ({crop.season})
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-italic">{isMarathi ? 'अद्याप पिकांची नोंद नाही.' : 'No crops recorded.'}</p>
          )}
        </div>

        {/* Raw Materials Snapshot */}
        <div className="highlight-box">
          <div className="highlight-box__header">
            <AppIcon name="box" size={16} />
            <h4>{isMarathi ? 'स्थानिक कच्चा माल' : 'Key Raw Materials'}</h4>
          </div>
          {profile.rawMaterials?.availableMaterials?.length > 0 ? (
            <div className="tags-cloud">
              {profile.rawMaterials.availableMaterials.slice(0, 3).map((mat, i) => (
                <span key={i} className="material-tag">
                  {isMarathi ? mat.name_mr : mat.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-italic">{isMarathi ? 'स्थानिक कच्च्या मालाची नोंद नाही.' : 'No materials recorded.'}</p>
          )}
        </div>

        {/* Live Customer Demand Signals */}
        <div className="highlight-box">
          <div className="highlight-box__header">
            <AppIcon name="signal" size={16} />
            <h4>{isMarathi ? 'नागरिक मागणी संकेत' : 'Citizen Demand Signals'}</h4>
          </div>
          {profile.customerDemand?.unmetItems?.length > 0 ? (
            <ul className="demand-snapshot-list">
              {profile.customerDemand.unmetItems.slice(0, 3).map((item, i) => (
                <li key={i}>
                  <strong>{item.productOrService}</strong> ({item.reportCount} {isMarathi ? 'नागरिक मागण्या' : 'reports'})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-italic">
              {profile.customerDemand?.expressedNeedsSummary || (isMarathi ? 'मागणी संकेत उपलब्ध नाहीत.' : 'No demand signals recorded.')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VillageProfileOverview;
