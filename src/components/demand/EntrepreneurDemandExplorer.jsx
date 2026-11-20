import React, { useState, useEffect } from 'react';
import { demandSignalService } from '../../services/demand/demandSignalService.js';
import { locationService } from '../../services/location/locationService.js';
import {
  DEMAND_CATEGORIES,
  AVAILABILITY_OPTIONS,
  FREQUENCY_OPTIONS,
  MODERATION_STATUSES
} from '../../data/demand/initialDemandSignals.js';
import { useLanguage } from '../../i18n/index.js';
import { authService } from '../../services/auth/authService.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';

/**
 * Coordinate mapping helper for Maharashtra demonstration villages & talukas
 */
function getCoordinatesForVillage(vCode, tCode) {
  const known = {
    524444: { lat: 19.8124, lng: 74.0541 }, // Baragaon Pimpri (Sinnar)
    524450: { lat: 19.8650, lng: 74.1520 }, // Wavi (Sinnar)
    524440: { lat: 19.8465, lng: 73.9965 }, // Sinnar Town
    524510: { lat: 20.3120, lng: 73.8820 }, // Vani (Dindori)
    525120: { lat: 19.1215, lng: 73.9780 }, // Narayangaon (Junnar)
    525040: { lat: 18.5793, lng: 73.9808 }, // Wagholi (Haveli)
    523820: { lat: 19.6200, lng: 74.3100 }, // Ashwi (Sangamner)
    523710: { lat: 19.8200, lng: 74.4500 }, // Pohegaon (Kopargaon)
    524150: { lat: 19.5100, lng: 75.4800 }, // Pachod (Paithan)
    525880: { lat: 17.6100, lng: 75.9800 }  // Boramani (Solapur)
  };
  if (vCode && known[vCode]) return known[vCode];
  if (tCode === 4154) return { lat: 19.8465, lng: 73.9965 }; // Sinnar center
  if (tCode === 4342) return { lat: 20.2015, lng: 73.8340 }; // Dindori center
  if (tCode === 4384) return { lat: 19.2000, lng: 73.8800 }; // Junnar center
  return { lat: 19.8124, lng: 74.0541 }; // Default Baragaon Pimpri
}

export function EntrepreneurDemandExplorer({
  onNavigateModule,
  defaultDistrictCode = 490, // Default Nashik
  defaultTalukaCode = 4154,  // Default Sinnar
  defaultVillageCode = 524444 // Default Baragaon Pimpri
}) {
  const { t, isMarathi } = useLanguage();
  const currentUserId = authService.getUserId();

  // Location Reference State
  const [districtCode, setDistrictCode] = useState(defaultDistrictCode);
  const [talukaCode, setTalukaCode] = useState(defaultTalukaCode);
  const [villageCode, setVillageCode] = useState(defaultVillageCode);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Proximity & Scope Filter State
  // scope: 'same_village' | 'radius' | 'taluka' | 'district'
  const [scope, setScope] = useState('same_village');
  const [radiusKm, setRadiusKm] = useState(15);

  // Phase 3: Emerging Demand Alerts & Confirmation Tracking
  const [emergingAlerts, setEmergingAlerts] = useState([]);
  const [confirmingSignalId, setConfirmingSignalId] = useState(null);

  // Category & Property Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedFrequency, setSelectedFrequency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Location Selector Options
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  // Data & Results
  const [demandSignals, setDemandSignals] = useState([]);
  const [stats, setStats] = useState({ totalReports: 0, uniqueNeeds: 0, verifiedPatterns: 0, criticalShortages: 0 });
  const [savedDemandIds, setSavedDemandIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load locations on mount
  useEffect(() => {
    const distList = locationService.getAllDistricts();
    setDistricts(distList);

    if (districtCode) {
      const tList = locationService.getTalukasForDistrict(districtCode);
      setTalukas(tList);
    }

    if (districtCode && talukaCode) {
      locationService.getVillagesForTaluka(districtCode, talukaCode).then((res) => {
        setVillages(Array.isArray(res) ? res : (res?.villages || []));
      });
    }
  }, []);

  // Update talukas when district changes
  const handleDistrictChange = (e) => {
    const d = e.target.value ? Number(e.target.value) : '';
    setDistrictCode(d);
    setTalukaCode('');
    setVillageCode('');
    setVillages([]);
    if (d) {
      setTalukas(locationService.getTalukasForDistrict(d));
    } else {
      setTalukas([]);
    }
  };

  // Update villages when taluka changes
  const handleTalukaChange = async (e) => {
    const t = e.target.value ? Number(e.target.value) : '';
    setTalukaCode(t);
    setVillageCode('');
    if (districtCode && t) {
      try {
        const res = await locationService.getVillagesForTaluka(districtCode, t);
        setVillages(Array.isArray(res) ? res : (res?.villages || []));
      } catch (err) {
        setVillages([]);
      }
    } else {
      setVillages([]);
    }
  };

  // Load demand signals and saved IDs with proximity filtering
  const loadData = async () => {
    setLoading(true);
    try {
      const refCoords = getCoordinatesForVillage(villageCode, talukaCode);

      const filters = {
        districtCode: scope === 'district' || scope === 'all' ? districtCode : undefined,
        talukaCode: scope === 'taluka' ? talukaCode : undefined,
        referenceVillageCode: villageCode || undefined,
        referenceCoordinates: refCoords,
        scope: scope,
        radiusKm: scope === 'radius' ? radiusKm : (scope === 'same_village' ? 0 : null),
        category: selectedCategory,
        availability: selectedAvailability,
        frequency: selectedFrequency,
        searchQuery: searchQuery
      };

      const [list, statistics, savedIds, alerts] = await Promise.all([
        demandSignalService.getAggregatedDemand(filters),
        demandSignalService.getDemandStatistics(filters),
        currentUserId ? demandSignalService.getSavedOpportunityIdsForUser(currentUserId) : [],
        demandSignalService.getEntrepreneurEmergingDemandAlerts({
          userVillageCode: villageCode,
          userTalukaCode: talukaCode,
          userDistrictCode: districtCode
        })
      ]);

      setDemandSignals(list);
      setStats(statistics);
      setSavedDemandIds(new Set(savedIds));
      setEmergingAlerts(alerts);
    } catch (err) {
      console.warn('Error loading demand insights', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3: Community Confirmation Handler ("I also need this")
  const handleConfirmDemand = async (demandId) => {
    setConfirmingSignalId(demandId);
    try {
      await demandSignalService.confirmCommunityDemand(demandId);
      await loadData();
    } catch (e) {
      console.warn('Could not confirm demand', e);
    } finally {
      setConfirmingSignalId(null);
    }
  };

  // Phase 3: Update resolution status
  const handleUpdateResolution = async (demandId, status) => {
    try {
      await demandSignalService.updateDemandResolutionStatus(demandId, status, '', currentUserId);
      await loadData();
    } catch (e) {
      console.warn('Could not update resolution status', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    districtCode,
    talukaCode,
    villageCode,
    scope,
    radiusKm,
    selectedCategory,
    selectedAvailability,
    selectedFrequency,
    searchQuery
  ]);

  // Handle Save / Unsave Opportunity (User Data Isolation)
  const handleToggleSave = async (demandId) => {
    if (!currentUserId) {
      alert(isMarathi ? 'संधी जतन करण्यासाठी कृपया उद्योजक खात्यात प्रवेश करा.' : 'Please log in with your entrepreneur account to save opportunities.');
      return;
    }

    const isSaved = savedDemandIds.has(demandId);
    if (isSaved) {
      await demandSignalService.removeSavedOpportunityForUser(currentUserId, demandId);
      const updated = new Set(savedDemandIds);
      updated.delete(demandId);
      setSavedDemandIds(updated);
    } else {
      await demandSignalService.saveOpportunityForUser(currentUserId, demandId);
      const updated = new Set(savedDemandIds);
      updated.add(demandId);
      setSavedDemandIds(updated);
    }
  };

  // Category & meta helpers
  const getCategoryMeta = (catId) => {
    return DEMAND_CATEGORIES.find((c) => c.id === catId) || { name: catId, name_mr: catId, icon: '📦' };
  };

  const getAvailabilityLabel = (key) => {
    const found = AVAILABILITY_OPTIONS.find((a) => a.value === key);
    return isMarathi ? (found?.label_mr || key) : (found?.label || key);
  };

  const getFrequencyLabel = (key) => {
    const found = FREQUENCY_OPTIONS.find((f) => f.value === key);
    return isMarathi ? (found?.label_mr || key) : (found?.label || key);
  };

  // Resolve current village/taluka labels
  const currentDistObj = locationService.getDistrictByCode(districtCode);
  const currentTalObj = locationService.getTalukaByCode(talukaCode);
  const currentVillObj = villages.find((v) => (v.code || v.c) === Number(villageCode));
  const currentVillageName = currentVillObj
    ? (isMarathi ? (currentVillObj.name_mr || currentVillObj.m) : (currentVillObj.name_en || currentVillObj.n))
    : (villageCode === 524444 ? (isMarathi ? 'बारेगाव पिंप्री' : 'Baragaon Pimpri') : (isMarathi ? 'निवडलेले गाव' : 'Selected Village'));

  return (
    <div className="entrepreneur-demand-explorer">
      {/* Module Title & Subtitle */}
      <div className="explorer-header">
        <h2 className="explorer-title">{t('demand.entrepreneur.title')}</h2>
        <p className="explorer-subtitle">{t('demand.entrepreneur.subtitle')}</p>
      </div>

      {/* Mandatory Statutory Disclaimer: No Guaranteed Revenue / Not Confirmed Buyers */}
      <div className="demand-disclaimer-card" role="note">
        <div className="disclaimer-icon-wrap">
          <AppIcon name="shield" size={20} color="#b78103" />
        </div>
        <div className="disclaimer-content">
          <strong className="disclaimer-heading">{t('demand.entrepreneur.disclaimerTitle')}</strong>
          <p className="disclaimer-text">{t('demand.entrepreneur.disclaimerBody')}</p>
        </div>
      </div>

      {/* Reference Base Location Bar & Radius Scope Controls */}
      <Card className="location-scope-card">
        <div className="scope-top-row">
          <div className="base-location-pill">
            <span className="base-label">{isMarathi ? 'माझे व्यवसाय केंद्र / संदर्भ गाव:' : 'My Enterprise Base Location:'}</span>
            <strong className="base-name">
              📍 {currentVillageName}, {currentTalObj ? (isMarathi ? currentTalObj.marathiName : currentTalObj.name) : 'Sinnar'}, {currentDistObj ? (isMarathi ? currentDistObj.marathiName : currentDistObj.name) : 'Nashik'}
            </strong>
          </div>
          <button
            type="button"
            className="change-location-btn"
            onClick={() => setShowLocationPicker(!showLocationPicker)}
          >
            {showLocationPicker ? (isMarathi ? 'बंद करा ✕' : 'Close ✕') : (isMarathi ? 'गाव बदला ⚙️' : 'Change Village ⚙️')}
          </button>
        </div>

        {/* Collapsible Location Selector Dropdowns */}
        {showLocationPicker && (
          <div className="location-picker-drawer">
            <div className="location-picker-grid">
              <div className="picker-col">
                <label className="filter-label">{t('demand.form.districtLabel')}</label>
                <select className="filter-select" value={districtCode} onChange={handleDistrictChange}>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {isMarathi ? d.marathiName : d.name} (LGD {d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker-col">
                <label className="filter-label">{t('demand.form.talukaLabel')}</label>
                <select className="filter-select" value={talukaCode} onChange={handleTalukaChange} disabled={!districtCode}>
                  {talukas.map((t) => (
                    <option key={t.code} value={t.code}>
                      {isMarathi ? t.marathiName : t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker-col">
                <label className="filter-label">{t('demand.form.villageLabel')}</label>
                <select
                  className="filter-select"
                  value={villageCode}
                  onChange={(e) => setVillageCode(e.target.value ? Number(e.target.value) : '')}
                  disabled={!talukaCode}
                >
                  <option value="">{isMarathi ? '-- गाव निवडा --' : '-- Select Village --'}</option>
                  {(Array.isArray(villages) ? villages : []).map((v) => {
                    const c = v.code || v.c;
                    const name = isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n);
                    return (
                      <option key={c} value={c}>
                        {name} [LGD {c}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Scope Segmentation Controls */}
        <div className="scope-selector-wrap">
          <span className="scope-selector-label">{t('demand.entrepreneur.scopeLabel')}</span>
          <div className="scope-segmented-buttons" role="group">
            {/* Same Village Only (Requirement 1) */}
            <button
              type="button"
              className={`scope-btn ${scope === 'same_village' ? 'scope-btn--active' : ''}`}
              onClick={() => setScope('same_village')}
              aria-pressed={scope === 'same_village'}
            >
              {t('demand.entrepreneur.scopeSameVillage')}
            </button>

            {/* Radius Proximity Option (Requirement 2) */}
            <button
              type="button"
              className={`scope-btn ${scope === 'radius' ? 'scope-btn--active' : ''}`}
              onClick={() => setScope('radius')}
              aria-pressed={scope === 'radius'}
            >
              {t('demand.entrepreneur.scopeRadius')} ({radiusKm} km)
            </button>

            {/* Entire Taluka */}
            <button
              type="button"
              className={`scope-btn ${scope === 'taluka' ? 'scope-btn--active' : ''}`}
              onClick={() => setScope('taluka')}
              aria-pressed={scope === 'taluka'}
            >
              {t('demand.entrepreneur.scopeTaluka')}
            </button>

            {/* Entire District */}
            <button
              type="button"
              className={`scope-btn ${scope === 'district' ? 'scope-btn--active' : ''}`}
              onClick={() => setScope('district')}
              aria-pressed={scope === 'district'}
            >
              {t('demand.entrepreneur.scopeDistrict')}
            </button>
          </div>
        </div>

        {/* Radius Slider & Quick Chips (Visible when Radius scope is active) */}
        {scope === 'radius' && (
          <div className="radius-slider-section">
            <div className="radius-slider-header">
              <span className="radius-title">
                ⭕ {t('demand.entrepreneur.radiusSliderLabel', { village: currentVillageName, radius: radiusKm })}
              </span>
              <div className="radius-quick-chips">
                {[5, 10, 15, 25, 50].map((km) => (
                  <button
                    key={km}
                    type="button"
                    className={`radius-chip ${radiusKm === km ? 'radius-chip--active' : ''}`}
                    onClick={() => setRadiusKm(km)}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>

            <div className="slider-track-wrap">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="radius-range-slider"
                aria-label="Radius Distance Slider"
              />
              <div className="slider-ticks">
                <span>5 km</span>
                <span>15 km</span>
                <span>25 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Phase 3: High Priority Emerging Demand Alerts */}
      {emergingAlerts.length > 0 && (
        <div className="emerging-alerts-banner">
          <div className="alert-header">
            <span className="pulse-dot">🔥</span>
            <strong>{isMarathi ? `स्थानिक तातडीच्या मागणी सूचना (${emergingAlerts.length})` : `High Priority Emerging Demand Alerts (${emergingAlerts.length})`}</strong>
          </div>
          <div className="alerts-chips-row">
            {emergingAlerts.slice(0, 3).map((a) => (
              <div key={a.demandId} className="emerging-alert-chip">
                <span className="alert-item-title">{isMarathi ? a.productOrService_mr : a.productOrService}</span>
                <span className="alert-sub">{a.village} • {a.totalReports} {isMarathi ? 'नोंदी' : 'reports'} ({isMarathi ? a.reason_mr : a.reason_en})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggregated Statistics Overview Cards */}
      <div className="demand-stats-grid">
        <Card className="stat-card">
          <span className="stat-number">{stats.totalReports}</span>
          <span className="stat-label">
            {scope === 'same_village'
              ? (isMarathi ? 'याच गावातील ग्राहक मागण्या' : 'Same Village Customer Reports')
              : (isMarathi ? 'परिसरातील एकूण मागण्या' : 'In-Scope Customer Reports')}
          </span>
          <span className="stat-desc">
            {scope === 'same_village'
              ? (isMarathi ? `केवळ ${currentVillageName} मधील नोंदी` : `Direct reports from ${currentVillageName}`)
              : (isMarathi ? `${radiusKm} कि.मी. अंतरातील नोंदी` : `Within ${radiusKm} km search radius`)}
          </span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--accent">{stats.uniqueNeeds}</span>
          <span className="stat-label">
            {isMarathi ? 'विविध वस्तू व सेवा' : 'Distinct Unmet Needs'}
          </span>
          <span className="stat-desc">
            {isMarathi ? 'स्थानिक तुटवड्याची वर्गवारी' : 'Identified local product gaps'}
          </span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--success">{stats.verifiedPatterns}</span>
          <span className="stat-label">
            {isMarathi ? 'पडताळलेले प्रवाह' : 'Verified Patterns'}
          </span>
          <span className="stat-desc">
            {isMarathi ? 'अनेक ग्रामस्थांनी स्वतंत्रपणे नोंदवलेले' : 'Multi-resident corroborated signals'}
          </span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--danger">{stats.criticalShortages}</span>
          <span className="stat-label">
            {isMarathi ? 'तीव्र टंचाई' : 'Critical Shortages'}
          </span>
          <span className="stat-desc">
            {isMarathi ? '१०+ नागरिकांनी अजिबात उपलब्ध नसल्याचे सांगितले' : '10+ reports indicating zero local supply'}
          </span>
        </Card>
      </div>

      {/* Category & Availability Filters Card */}
      <Card className="demand-filters-card">
        {/* Search input */}
        <div className="filter-search-row">
          <div className="search-bar-wrap">
            <AppIcon name="search" size={18} color="#555" />
            <input
              type="text"
              className="demand-search-input"
              placeholder={t('demand.entrepreneur.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="filters-selectors-row">
          {/* Category Filter */}
          <div className="filter-control">
            <label htmlFor="filter-cat" className="filter-label">
              {t('demand.form.categoryLabel')}
            </label>
            <select
              id="filter-cat"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{t('demand.entrepreneur.filterAllCategories')}</option>
              {DEMAND_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {isMarathi ? c.name_mr : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="filter-control">
            <label htmlFor="filter-avail" className="filter-label">
              {isMarathi ? 'उपलब्धता:' : 'Availability:'}
            </label>
            <select
              id="filter-avail"
              className="filter-select"
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
            >
              <option value="all">{t('demand.entrepreneur.filterAllAvailability')}</option>
              {AVAILABILITY_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {isMarathi ? a.label_mr : a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div className="filter-control">
            <label htmlFor="filter-freq" className="filter-label">
              {isMarathi ? 'वारंवारता:' : 'Frequency:'}
            </label>
            <select
              id="filter-freq"
              className="filter-select"
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
            >
              <option value="all">{t('demand.entrepreneur.filterAllFrequencies')}</option>
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {isMarathi ? f.label_mr : f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Demand Results Section */}
      <div className="demand-results-container">
        {loading ? (
          <div className="demand-loading-state">
            <div className="spinner"></div>
            <p>{isMarathi ? 'स्थानिक मागणी माहिती लोड होत आहे...' : 'Loading local community demand signals...'}</p>
          </div>
        ) : demandSignals.length === 0 ? (
          /* Empty State with Helpful 1-Tap Radius Expansion Options */
          <Card className="demand-empty-card">
            <AppIcon name="search" size={40} color="#777" />
            <h3 className="empty-title">
              {scope === 'same_village'
                ? t('demand.entrepreneur.noSameVillageTitle', { village: currentVillageName })
                : (isMarathi ? 'कोणतीही मागणी आढळली नाही' : 'No Demand Reports Found')}
            </h3>
            <p className="empty-text">
              {scope === 'same_village'
                ? t('demand.entrepreneur.noSameVillageHelp')
                : t('demand.entrepreneur.emptyState')}
            </p>

            {/* Quick 1-Tap Radius Expansion Actions */}
            {scope === 'same_village' && (
              <div className="expand-radius-actions-row">
                <Button
                  variant="primary"
                  onClick={() => {
                    setScope('radius');
                    setRadiusKm(10);
                  }}
                >
                  ⭕ {t('demand.entrepreneur.expandRadius10')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setScope('radius');
                    setRadiusKm(25);
                  }}
                >
                  ⭕ {t('demand.entrepreneur.expandRadius25')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setScope('taluka')}
                >
                  🏛️ {t('demand.entrepreneur.scopeTaluka')}
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="demand-cards-list">
            {demandSignals.map((signal) => {
              const catMeta = getCategoryMeta(signal.category);
              const isSaved = savedDemandIds.has(signal.id);
              const bd = signal.breakdown || { not_available: 0, difficult_access: 0, insufficient: 0, occasional_only: 0 };
              const notAvailablePercent = Math.round(((bd.not_available || 0) / (signal.totalReports || 1)) * 100);

              return (
                <Card
                  key={signal.id}
                  className={`demand-signal-card ${signal.isSameVillage ? 'demand-signal-card--same-village' : ''}`}
                >
                  {/* Card Header with Location & Distance Badge */}
                  <div className="demand-card-header">
                    <div className="demand-title-group">
                      <span className="demand-cat-icon">{catMeta.icon}</span>
                      <div>
                        <div className="demand-proximity-row">
                          {/* Proximity / Distance Badge */}
                          {signal.isSameVillage ? (
                            <span className="distance-badge distance-badge--same">
                              {t('demand.entrepreneur.sameVillageBadge')}
                            </span>
                          ) : signal.distanceKm !== null ? (
                            <span className="distance-badge distance-badge--nearby">
                              {t('demand.entrepreneur.distanceKmBadge', { km: signal.distanceKm })}
                            </span>
                          ) : null}

                          <span className="demand-cat-name">
                            {isMarathi ? catMeta.name_mr : catMeta.name}
                          </span>
                        </div>

                        <h3 className="demand-item-name">
                          {isMarathi ? (signal.productOrService_mr || signal.productOrService) : signal.productOrService}
                        </h3>

                        <div className="demand-location-crumbs">
                          <span className="crumb-village">📍 {signal.village || signal.taluka}</span>
                          <span className="crumb-taluka">, {signal.taluka}</span>
                          <span className="crumb-dist">, {signal.district}</span>
                        </div>
                      </div>
                    </div>

                    <div className="demand-header-badges">
                      {/* Total Reports Badge */}
                      <span className="demand-count-badge">
                        👥 {signal.totalReports} {isMarathi ? 'नागरिक नोंदी' : 'Customer Reports'}
                      </span>

                      {/* Verification Status Pill */}
                      {signal.status === MODERATION_STATUSES.VERIFIED_PATTERN && (
                        <span className="verification-pill verification-pill--verified" title="Multi-resident verified pattern">
                          ✓ {isMarathi ? 'पडताळलेला प्रवाह' : 'Verified Pattern'}
                        </span>
                      )}
                      {signal.status === MODERATION_STATUSES.REVIEWED && (
                        <span className="verification-pill verification-pill--reviewed">
                          👁️ {isMarathi ? 'तपासलेले' : 'Reviewed'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Breakdown of Availability and Urgency */}
                  <div className="demand-card-metrics">
                    {/* Availability Breakdown Bar */}
                    <div className="metric-box">
                      <span className="metric-box-title">{t('demand.entrepreneur.breakdownTitle')}</span>
                      <div className="availability-pills-row">
                        <span className="avail-chip avail-chip--danger">
                          🚫 {bd.not_available || 0} {isMarathi ? 'गावात नाही' : 'Not Available'} ({notAvailablePercent}%)
                        </span>
                        <span className="avail-chip avail-chip--warning">
                          ⚠️ {bd.difficult_access || 0} {isMarathi ? 'मिळणे कठीण' : 'Difficult Access'}
                        </span>
                        <span className="avail-chip avail-chip--info">
                          📉 {bd.insufficient || 0} {isMarathi ? 'अपुरे पडते' : 'Insufficient'}
                        </span>
                      </div>
                    </div>

                    {/* Dominant Frequency & Timing */}
                    <div className="metric-box">
                      <span className="metric-box-title">{t('demand.entrepreneur.frequencyTitle')}</span>
                      <div className="frequency-info-row">
                        <span className="frequency-pill">
                          ⏱️ {isMarathi ? 'वारंवारता:' : 'Frequency:'} <strong>{getFrequencyLabel(signal.dominantFrequency)}</strong>
                        </span>
                        <span className="reported-date-pill">
                          📅 {isMarathi ? 'शेवटची नोंद:' : 'Last Reported:'} {signal.lastReportedAt ? new Date(signal.lastReportedAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Objective Explanation Card (Mandatory Requirement) */}
                  <div className="demand-explanation-box">
                    <span className="explanation-label">
                      💡 {t('demand.entrepreneur.explanationTitle')}
                    </span>
                    <p className="explanation-text">
                      {isMarathi
                        ? (signal.explanationText_mr || `या गावातील नागरिकांनी ${signal.productOrService_mr || signal.productOrService} उपलब्ध नसल्याचे नोंदवले आहे. ही एक अभ्यास करण्यासारखी व्यवसाय संधी असू शकते.`)
                        : (signal.explanationText_en || `Several residents have reported difficulty accessing ${signal.productOrService} in this village. This may indicate an opportunity worth investigating.`)}
                    </p>
                  </div>

                  {/* Action Bar for Rural Entrepreneurs */}
                  <div className="demand-actions-bar">
                    <div className="left-actions">
                      {/* Save Opportunity Button */}
                      <Button
                        variant={isSaved ? 'success' : 'outline'}
                        size="small"
                        onClick={() => handleToggleSave(signal.id)}
                        className="save-btn"
                      >
                        {isSaved ? '★ ' + t('demand.entrepreneur.savedSuccess') : '☆ ' + t('demand.entrepreneur.saveOpportunityBtn')}
                      </Button>

                      {/* Community Confirmation ("I also need this") Button */}
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleConfirmDemand(signal.id)}
                        disabled={confirmingSignalId === signal.id}
                        title={isMarathi ? 'मलाही या वस्तूची गरज आहे' : 'Confirm you also need this product'}
                      >
                        👍 {isMarathi ? 'मलाही गरज आहे' : 'Confirm'} {signal.communityConfirmations ? `(${signal.communityConfirmations})` : ''}
                      </Button>
                    </div>

                    <div className="right-module-links">
                      {/* Connect to Gap Analyzer */}
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('gap-analyzer', { signalId: signal.id, product: signal.productOrService })}
                        title={isMarathi ? 'पुरवठा-मागणी अंतर तपासा' : 'Analyze in Gap Analyzer'}
                      >
                        📊 {t('demand.entrepreneur.analyzeGapBtn')}
                      </Button>

                      {/* Connect to Village Opportunity Detector */}
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('opportunity-detector', { signalId: signal.id, villageCode: signal.villageCode })}
                        title={isMarathi ? 'ग्राम संधी शोधकात तपासा' : 'Evaluate in Opportunity Detector'}
                      >
                        🎯 {t('demand.entrepreneur.evaluateDetectorBtn')}
                      </Button>

                      {/* Connect to BazaarPath */}
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('bazaarpath', { districtCode: signal.districtCode, talukaCode: signal.talukaCode })}
                        title={isMarathi ? 'जवळचे आठवडे बाजार शोधा' : 'Find nearby weekly haats'}
                      >
                        🛒 {t('demand.entrepreneur.checkBazaarBtn')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default EntrepreneurDemandExplorer;
