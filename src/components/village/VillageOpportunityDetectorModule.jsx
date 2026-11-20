import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { locationService } from '../../services/location/locationService';
import { adminAuthService } from '../../services/auth/adminAuthService';
import { villageOpportunityService } from '../../services/village/villageOpportunityService';
import { VillageProfileOverview } from './VillageProfileOverview';
import { AgriculturalIntelligenceCard } from './AgriculturalIntelligenceCard';
import { RawMaterialsSkillsCard } from './RawMaterialsSkillsCard';
import { InfrastructureAccessibilityCard } from './InfrastructureAccessibilityCard';
import { AdminVillageContributionModal } from './AdminVillageContributionModal';
import { VillageOpportunitiesSection } from './VillageOpportunitiesSection';
import { PersonalDecisionSupportSection } from './PersonalDecisionSupportSection';
import './VillageDetector.css';

export function VillageOpportunityDetectorModule({ onBack, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();
  const isAdmin = adminAuthService.isAdminAuthenticated();

  // Location Selector state
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(490); // Default: Nashik (490)
  const [talukas, setTalukas] = useState([]);
  const [selectedTaluka, setSelectedTaluka] = useState(4154); // Default: Sinnar (4154)
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(551322); // Default: Baragaon Pimpri (551322)
  const [villageSearch, setVillageSearch] = useState('');

  // Profile & Tab state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOpportunityForPlan, setSelectedOpportunityForPlan] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Quick village pills for rapid inspection
  const QUICK_VILLAGES = [
    { code: 551322, dCode: 490, tCode: 4154, name: 'Baragaon Pimpri', name_mr: 'बारागाव पिंप्री' },
    { code: 551352, dCode: 490, tCode: 4154, name: 'Wavi', name_mr: 'वावी' },
    { code: 557623, dCode: 494, tCode: 4212, name: 'Pohegaon', name_mr: 'पोहेगाव' },
    { code: 551001, dCode: 490, tCode: 4145, name: 'Dindori Rural', name_mr: 'दिंडोरी ग्रामीण' },
    { code: 551205, dCode: 490, tCode: 4149, name: 'Pimpalgaon Mor (Partial)', name_mr: 'पिंपळगाव मोर (अपूर्ण)' }
  ];

  // 1. Load Districts on Mount
  useEffect(() => {
    const dList = locationService.getAllDistricts();
    setDistricts(dList);
    const tList = locationService.getTalukasForDistrict(selectedDistrict);
    setTalukas(tList);
    loadVillages(selectedDistrict, selectedTaluka);
  }, []);

  // 2. Load Villages for taluka with safe array guards
  const loadVillages = async (dCode, tCode) => {
    try {
      const res = await locationService.getVillagesForTaluka(dCode, tCode);
      const list = Array.isArray(res) ? res : (res?.villages || []);
      setVillages(list);
    } catch (e) {
      console.warn('Failed to load villages in VillageOpportunityDetectorModule:', e);
      setVillages([]);
    }
  };

  // 3. Load Village Intelligence Profile
  const loadProfile = async (dCode, tCode, vCode) => {
    if (!vCode) return;
    setLoading(true);
    try {
      const data = await villageOpportunityService.getVillageProfile(dCode, tCode, vCode);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load village profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVillage) {
      loadProfile(selectedDistrict, selectedTaluka, selectedVillage);
    }
  }, [selectedVillage, selectedDistrict, selectedTaluka]);

  // Handlers
  const handleDistrictChange = (e) => {
    const dCode = Number(e.target.value);
    setSelectedDistrict(dCode);
    const tList = locationService.getTalukasForDistrict(dCode);
    setTalukas(tList);
    const firstTaluka = tList[0]?.code || '';
    setSelectedTaluka(firstTaluka);
    loadVillages(dCode, firstTaluka);
  };

  const handleTalukaChange = (e) => {
    const tCode = Number(e.target.value);
    setSelectedTaluka(tCode);
    loadVillages(selectedDistrict, tCode);
  };

  const handleSelectQuickVillage = (item) => {
    setSelectedDistrict(item.dCode);
    const tList = locationService.getTalukasForDistrict(item.dCode);
    setTalukas(tList);
    setSelectedTaluka(item.tCode);
    loadVillages(item.dCode, item.tCode);
    setSelectedVillage(item.code);
    setActiveTab('overview');
  };

  const safeVillages = Array.isArray(villages) ? villages : [];
  const filteredVillages = villageSearch.trim()
    ? safeVillages.filter((v) => {
        const query = villageSearch.toLowerCase();
        return (
          (v.name_en || v.n || '').toLowerCase().includes(query) ||
          (v.name_mr || v.m || '').toLowerCase().includes(query) ||
          String(v.code || v.c).includes(query)
        );
      })
    : safeVillages;

  return (
    <div className="village-detector-module">
      {/* 1. Header Navigation Bar */}
      <div className="module-top-header">
        <div className="module-top-header__left">
          <button type="button" className="module-back-btn" onClick={onBack}>
            <AppIcon name="arrow-left" size={16} />
            <span>{isMarathi ? 'मुख्य पृष्ठ' : 'Home'}</span>
          </button>
          <div className="module-title-wrap">
            <div className="title-row">
              <h1 className="module-title">{t('villageDetector.moduleTitle')}</h1>
              <span className="phase-badge">{t('villageDetector.phase1Badge')}</span>
            </div>
            <p className="module-subtitle">{t('villageDetector.moduleSubtitle')}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="admin-status-indicator">
            <AppIcon name="shield" size={14} color="#2e7d32" />
            <span>{isMarathi ? 'प्रशासक मोड सक्रिय' : 'Admin Mode Active'}</span>
          </div>
        )}
      </div>

      {/* 2. Location Hierarchy Selector */}
      <div className="village-selector-panel">
        <div className="selector-title-row">
          <AppIcon name="location" size={16} />
          <span>{t('villageDetector.selectVillagePrompt')}</span>
        </div>

        <div className="selectors-form-row">
          {/* District */}
          <div className="selector-group">
            <label>{isMarathi ? '१. जिल्हा:' : '1. District:'}</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="form-select-touch"
            >
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {isMarathi ? d.marathiName : d.name} (LGD {d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Taluka */}
          <div className="selector-group">
            <label>{isMarathi ? '२. तालुका:' : '2. Taluka:'}</label>
            <select
              value={selectedTaluka}
              onChange={handleTalukaChange}
              className="form-select-touch"
            >
              {talukas.map((t) => (
                <option key={t.code} value={t.code}>
                  {isMarathi ? t.marathiName : t.name} (LGD {t.code})
                </option>
              ))}
            </select>
          </div>

          {/* Village */}
          <div className="selector-group selector-group--grow">
            <label>{isMarathi ? '३. गाव निवडा:' : '3. Village:'}</label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(Number(e.target.value))}
              className="form-select-touch"
            >
              <option value="">{isMarathi ? '-- गाव निवडा --' : '-- Select Village --'}</option>
              {filteredVillages.map((v) => (
                <option key={v.code || v.c} value={v.code || v.c}>
                  {isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n)} [LGD {v.code || v.c}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Demo Village Shortcuts */}
        <div className="quick-villages-row">
          <span className="quick-label">{isMarathi ? 'नमुना गावे (तपासा):' : 'Representative Profiles:'}</span>
          <div className="quick-pills-list">
            {QUICK_VILLAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`quick-pill ${selectedVillage === item.code ? 'active' : ''}`}
                onClick={() => handleSelectQuickVillage(item)}
              >
                {isMarathi ? item.name_mr : item.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      {profile && (
        <div className="village-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <AppIcon name="analysis" size={14} />
            <span>{t('villageDetector.tabs.overview')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'agriculture'}
            className={`tab-btn ${activeTab === 'agriculture' ? 'active' : ''}`}
            onClick={() => setActiveTab('agriculture')}
          >
            <AppIcon name="farmer" size={14} />
            <span>{t('villageDetector.tabs.agriculture')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rawMaterials'}
            className={`tab-btn ${activeTab === 'rawMaterials' ? 'active' : ''}`}
            onClick={() => setActiveTab('rawMaterials')}
          >
            <AppIcon name="box" size={14} />
            <span>{t('villageDetector.tabs.rawMaterials')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'businesses'}
            className={`tab-btn ${activeTab === 'businesses' ? 'active' : ''}`}
            onClick={() => setActiveTab('businesses')}
          >
            <AppIcon name="shop" size={14} />
            <span>{t('villageDetector.tabs.businesses')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'demand'}
            className={`tab-btn ${activeTab === 'demand' ? 'active' : ''}`}
            onClick={() => setActiveTab('demand')}
          >
            <AppIcon name="signal" size={14} />
            <span>{t('villageDetector.tabs.demand')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'infrastructure'}
            className={`tab-btn ${activeTab === 'infrastructure' ? 'active' : ''}`}
            onClick={() => setActiveTab('infrastructure')}
          >
            <AppIcon name="location" size={14} />
            <span>{t('villageDetector.tabs.infrastructure')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'opportunities'}
            className={`tab-btn highlight-tab ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            <AppIcon name="target" size={14} />
            <span>🎯 {isMarathi ? 'व्यवसाय संधी (टप्पा २)' : 'Opportunities (Phase 2)'}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'decisionSupport'}
            className={`tab-btn highlight-tab ${activeTab === 'decisionSupport' ? 'active' : ''}`}
            onClick={() => setActiveTab('decisionSupport')}
          >
            <AppIcon name="compass" size={14} />
            <span>🧭 {isMarathi ? 'निर्णय सहाय्य (टप्पा ३)' : 'Decision Support (Phase 3)'}</span>
          </button>
        </div>
      )}

      {/* 4. Tab Content Area */}
      <div className="village-tab-content">
        {loading ? (
          <div className="loading-state-card">
            <div className="spinner-icon">🔄</div>
            <p>{isMarathi ? 'ग्राम माहिती लोड होत आहे...' : 'Loading village intelligence profile...'}</p>
          </div>
        ) : profile ? (
          <>
            {activeTab === 'overview' && (
              <VillageProfileOverview
                profile={profile}
                onSelectTab={(tabKey) => setActiveTab(tabKey)}
                onOpenAdminContribution={() => setShowAdminModal(true)}
                isAdmin={isAdmin}
              />
            )}

            {activeTab === 'agriculture' && (
              <AgriculturalIntelligenceCard profile={profile} />
            )}

            {activeTab === 'rawMaterials' && (
              <RawMaterialsSkillsCard profile={profile} />
            )}

            {activeTab === 'businesses' && (
              <div className="intelligence-detail-card">
                <div className="card-top-bar">
                  <div className="card-top-bar__title">
                    <AppIcon name="shop" size={20} />
                    <h3>{t('villageDetector.businessEcosystemCard.title')}</h3>
                  </div>
                  <span className={`status-badge status-${profile.existingBusinesses?.status || 'unknown'}`}>
                    {t(`villageDetector.qualityBadges.${profile.existingBusinesses?.status || 'unknown'}`)}
                  </span>
                </div>

                <div className="info-banner-tip">
                  {t('villageDetector.businessEcosystemCard.notice')}
                </div>

                <div className="intelligence-section">
                  {profile.existingBusinesses?.knownEnterprises?.length > 0 ? (
                    <div className="table-responsive-wrapper">
                      <table className="village-data-table">
                        <thead>
                          <tr>
                            <th>{t('villageDetector.businessEcosystemCard.businessName')}</th>
                            <th>{t('villageDetector.businessEcosystemCard.category')}</th>
                            <th>{t('villageDetector.businessEcosystemCard.productsServices')}</th>
                            <th>{t('villageDetector.businessEcosystemCard.verificationStatus')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.existingBusinesses.knownEnterprises.map((b, idx) => (
                            <tr key={idx}>
                              <td><strong>{b.name}</strong></td>
                              <td><span className="category-pill">{isMarathi ? b.category_mr : b.category}</span></td>
                              <td>{b.productsServices}</td>
                              <td>
                                <span className={`status-pill status-${b.verificationStatus || 'verified'}`}>
                                  {b.verificationStatus || 'Verified'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-section-notice">
                      {t('villageDetector.businessEcosystemCard.emptyNotice')}
                    </p>
                  )}
                </div>

                {profile.existingBusinesses?.source && (
                  <div className="data-source-footer">
                    <AppIcon name="shield" size={13} />
                    <span>
                      {t('villageDetector.agricultureCard.sourceAttribution')} {profile.existingBusinesses.source.name} • {profile.existingBusinesses.source.ref}
                      {profile.existingBusinesses.source.retrievalDate && ` (${profile.existingBusinesses.source.retrievalDate})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'demand' && (
              <div className="intelligence-detail-card">
                <div className="card-top-bar">
                  <div className="card-top-bar__title">
                    <AppIcon name="signal" size={20} />
                    <h3>{t('villageDetector.demandCard.title')}</h3>
                  </div>
                  <span className={`status-badge status-${profile.customerDemand?.status || 'unknown'}`}>
                    {t(`villageDetector.qualityBadges.${profile.customerDemand?.status || 'unknown'}`)}
                  </span>
                </div>

                <div className="info-banner-tip">
                  {t('villageDetector.demandCard.notice')}
                </div>

                <div className="intelligence-section">
                  {profile.customerDemand?.unmetItems?.length > 0 ? (
                    <div>
                      <h4 className="section-heading mb-3">
                        {t('villageDetector.demandCard.unmetNeedsList')}
                      </h4>
                      <div className="demand-signals-grid">
                        {profile.customerDemand.unmetItems.map((item, idx) => (
                          <div key={idx} className="demand-signal-chip-card">
                            <div className="demand-chip-top">
                              <span className="demand-product">{item.productOrService}</span>
                              <span className="demand-count-badge">
                                {item.reportCount} {isMarathi ? 'मागण्या' : 'reports'}
                              </span>
                            </div>
                            <div className="demand-chip-cat">{item.category}</div>
                          </div>
                        ))}
                      </div>

                      {onNavigateModule && (
                        <div className="cross-module-link-bar mt-4">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => onNavigateModule('demand-collector')}
                          >
                            <AppIcon name="signal" size={14} />
                            <span>{isMarathi ? 'मागणी संकलन (Demand Signal Collector) उघडा →' : 'Explore Citizen Demand Signals Module →'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="empty-section-notice">
                      {profile.customerDemand?.expressedNeedsSummary || t('villageDetector.demandCard.emptyNotice')}
                    </p>
                  )}
                </div>

                {profile.customerDemand?.source && (
                  <div className="data-source-footer">
                    <AppIcon name="shield" size={13} />
                    <span>
                      {t('villageDetector.agricultureCard.sourceAttribution')} {profile.customerDemand.source.name} • {profile.customerDemand.source.ref}
                      {profile.customerDemand.source.retrievalDate && ` (${profile.customerDemand.source.retrievalDate})`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'infrastructure' && (
              <InfrastructureAccessibilityCard profile={profile} />
            )}

            {activeTab === 'opportunities' && (
              <VillageOpportunitiesSection
                villageCode={selectedVillage}
                onNavigateModule={onNavigateModule}
                onSelectForChecklist={(opp) => {
                  setSelectedOpportunityForPlan(opp);
                  setActiveTab('decisionSupport');
                }}
              />
            )}

            {activeTab === 'decisionSupport' && (
              <PersonalDecisionSupportSection
                villageCode={selectedVillage}
                selectedOpportunity={selectedOpportunityForPlan}
                onNavigateModule={onNavigateModule}
              />
            )}
          </>
        ) : (
          <div className="empty-state-card">
            <AppIcon name="location" size={32} />
            <p>{t('villageDetector.selectVillagePrompt')}</p>
          </div>
        )}
      </div>

      {/* 5. Admin Contribution Modal */}
      {showAdminModal && profile && (
        <AdminVillageContributionModal
          profile={profile}
          onClose={() => setShowAdminModal(false)}
          onContributionSuccess={() => {
            setShowAdminModal(false);
            loadProfile(selectedDistrict, selectedTaluka, selectedVillage);
          }}
        />
      )}
    </div>
  );
}

export default VillageOpportunityDetectorModule;
