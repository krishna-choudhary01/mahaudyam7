import React from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';

export function InfrastructureAccessibilityCard({ profile }) {
  const { t, isMarathi } = useLanguage();

  if (!profile) return null;

  const infra = profile.infrastructure || {};
  const road = infra.roadConnectivity || {};
  const power = infra.powerSupply || {};
  const water = infra.waterResources || {};
  const storage = infra.storageFacilities || {};
  const telecom = infra.internetConnectivity || {};
  const markets = infra.nearestHaatsAndMandis || [];

  return (
    <div className="intelligence-detail-card">
      <div className="card-top-bar">
        <div className="card-top-bar__title">
          <AppIcon name="location" size={20} />
          <h3>{t('villageDetector.infrastructureCard.title')}</h3>
        </div>
        <span className={`status-badge status-${infra.status || 'unknown'}`}>
          {t(`villageDetector.qualityBadges.${infra.status || 'unknown'}`)}
        </span>
      </div>

      <div className="infra-grid-container">
        {/* 1. Road Connectivity */}
        <div className="infra-block">
          <div className="infra-block__header">
            <AppIcon name="car" size={17} />
            <h4>{t('villageDetector.infrastructureCard.roadConnectivity')}</h4>
          </div>
          <div className="infra-block__body">
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.roadType')}:</span>
              <strong>{isMarathi ? (road.roadType_mr || road.roadType) : road.roadType}</strong>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.allWeather')}:</span>
              <span className={road.allWeatherPassable ? 'text-success' : 'text-danger'}>
                {road.allWeatherPassable ? (isMarathi ? '✓ होय (बारमाही)' : '✓ Yes (All-weather)') : (isMarathi ? '✗ कच्चा / पावसाळ्यात अडचण' : '✗ Kutcha / Seasonal disruption')}
              </span>
            </div>
            {road.distanceToHighwayKm != null && (
              <div className="infra-metric-row">
                <span className="infra-label">{t('villageDetector.infrastructureCard.highwayDistance')}:</span>
                <span>{road.distanceToHighwayKm} km</span>
              </div>
            )}
            {road.publicBusFrequency && (
              <div className="infra-metric-row">
                <span className="infra-label">{t('villageDetector.infrastructureCard.busFrequency')}:</span>
                <span>{road.publicBusFrequency}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Electricity & Grid */}
        <div className="infra-block">
          <div className="infra-block__header">
            <AppIcon name="time" size={17} />
            <h4>{t('villageDetector.infrastructureCard.powerSupply')}</h4>
          </div>
          <div className="infra-block__body">
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.threePhaseAgri')}:</span>
              <strong>{power.threePhaseAgriHours != null ? `${power.threePhaseAgriHours} hrs/day` : 'Unknown'}</strong>
            </div>
            {power.agriPowerSchedule && (
              <div className="infra-subtext">{power.agriPowerSchedule}</div>
            )}
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.singlePhaseDomestic')}:</span>
              <span>{power.singlePhaseDomesticHours != null ? `${power.singlePhaseDomesticHours} hrs/day` : 'Unknown'}</span>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.gridReliability')}:</span>
              <span className="reliability-tag">{power.gridReliability || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* 3. Water Resources & Summer Security */}
        <div className="infra-block">
          <div className="infra-block__header">
            <AppIcon name="shop" size={17} />
            <h4>{t('villageDetector.infrastructureCard.waterResources')}</h4>
          </div>
          <div className="infra-block__body">
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.primaryWater')}:</span>
              <span>
                {Array.isArray(water.primarySources) && water.primarySources.length > 0
                  ? (isMarathi && water.primarySources_mr ? water.primarySources_mr.join(', ') : water.primarySources.join(', '))
                  : (isMarathi ? 'माहिती उपलब्ध नाही' : 'Unrecorded')}
              </span>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.tankerDependency')}:</span>
              <span className={water.tankerDependencySummer ? 'text-warning' : 'text-success'}>
                {water.tankerDependencySummer ? (isMarathi ? '⚠️ उन्हाळ्यात टँकर लागतो' : '⚠️ Tanker dependent in summer') : (isMarathi ? '✓ सुरक्षित पाणीसाठा' : '✓ Secure water reserve')}
              </span>
            </div>
            {water.groundwaterStatus && (
              <div className="infra-subtext">
                {isMarathi ? 'भूजल स्थिती:' : 'Groundwater:'} {water.groundwaterStatus}
              </div>
            )}
          </div>
        </div>

        {/* 4. Storage & Cold Chain Facilities */}
        <div className="infra-block">
          <div className="infra-block__header">
            <AppIcon name="box" size={17} />
            <h4>{t('villageDetector.infrastructureCard.storageFacilities')}</h4>
          </div>
          <div className="infra-block__body">
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.coldStorageAvailable')}:</span>
              <span className={storage.coldStorageAvailable ? 'text-success' : 'text-muted'}>
                {storage.coldStorageAvailable ? (isMarathi ? '✓ उपलब्ध' : '✓ Available in Village') : (isMarathi ? '✗ गावात नाही' : '✗ None in Village')}
              </span>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.godownCapacity')}:</span>
              <span>{storage.godownsAvailable ? `${storage.godownCapacityMT || 200} MT` : (isMarathi ? 'नाही' : 'None')}</span>
            </div>
            {storage.distanceToNearestColdChainKm != null && (
              <div className="infra-metric-row">
                <span className="infra-label">{t('villageDetector.infrastructureCard.nearestColdChain')}:</span>
                <strong>{storage.distanceToNearestColdChainKm} km</strong>
              </div>
            )}
          </div>
        </div>

        {/* 5. Telecom & Broadband */}
        <div className="infra-block">
          <div className="infra-block__header">
            <AppIcon name="signal" size={17} />
            <h4>{t('villageDetector.infrastructureCard.telecom')}</h4>
          </div>
          <div className="infra-block__body">
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.mobileNetworks')}:</span>
              <span>{(telecom.mobile4G5G || []).join(', ') || (isMarathi ? 'अज्ञात' : 'Unknown')}</span>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.broadband')}:</span>
              <span className={telecom.broadbandAvailable ? 'text-success' : 'text-muted'}>
                {telecom.broadbandAvailable ? (isMarathi ? '✓ फायबर उपलब्ध' : '✓ Fiber Available') : (isMarathi ? '✗ उपलब्ध नाही' : '✗ Unavailable')}
              </span>
            </div>
            <div className="infra-metric-row">
              <span className="infra-label">{t('villageDetector.infrastructureCard.cscCenter')}:</span>
              <span>{telecom.cscCenterAvailable ? (isMarathi ? '✓ कार्यरत' : '✓ Active') : (isMarathi ? '✗ नाही' : '✗ None')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Nearest Weekly Haats & APMC Mandis */}
      <div className="intelligence-section mt-4">
        <h4 className="section-heading">{t('villageDetector.infrastructureCard.marketsList')}</h4>
        {markets.length > 0 ? (
          <div className="markets-link-grid">
            {markets.map((m, idx) => (
              <div key={idx} className="market-link-card">
                <div className="market-link-header">
                  <span className="market-link-name">{isMarathi ? (m.name_mr || m.name) : m.name}</span>
                  <span className="market-link-type-pill">{m.type}</span>
                </div>
                <div className="market-link-meta">
                  <span><strong>{isMarathi ? 'अंतर:' : 'Distance:'}</strong> {m.distanceKm} km</span>
                  <span className="meta-sep">•</span>
                  <span><strong>{isMarathi ? 'बाजार वार:' : 'Day:'}</strong> {m.marketDay}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-section-notice">
            {isMarathi ? 'जवळच्या बाजारांची नोंद उपलब्ध नाही.' : 'No nearby market links recorded.'}
          </p>
        )}
      </div>

      {/* Source Citation */}
      {infra.source && (
        <div className="data-source-footer">
          <AppIcon name="shield" size={13} />
          <span>
            {t('villageDetector.agricultureCard.sourceAttribution')} {infra.source.name} • {infra.source.ref}
            {infra.source.retrievalDate && ` (${infra.source.retrievalDate})`}
          </span>
        </div>
      )}
    </div>
  );
}

export default InfrastructureAccessibilityCard;
