import React, { useState, useEffect } from 'react';
import {
  gapAnalyzerService,
  GAP_CLASSIFICATIONS,
  GAP_SEVERITY,
  CONFIDENCE_LEVEL,
  DEMAND_TRENDS,
  DATA_COVERAGE_LEVELS
} from '../../services/gap/gapAnalyzerService.js';
import { locationService } from '../../services/location/locationService.js';
import { DEMAND_CATEGORIES } from '../../data/demand/initialDemandSignals.js';
import { useLanguage } from '../../i18n/index.js';
import { authService } from '../../services/auth/authService.js';
import { AppIcon } from '../common/Icons.jsx';
import { Card } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import { GapDetailModal } from './GapDetailModal.jsx';

export function GapOverviewSection({
  onNavigateModule,
  defaultDistrictCode = 490,
  defaultTalukaCode = 4154,
  defaultVillageCode = 524444,
  viewOnlySaved = false
}) {
  const { t, isMarathi } = useLanguage();
  const currentUserId = authService.getUserId();

  // Location Selection State
  const [districtCode, setDistrictCode] = useState(defaultDistrictCode);
  const [talukaCode, setTalukaCode] = useState(defaultTalukaCode);
  const [villageCode, setVillageCode] = useState(defaultVillageCode);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Filter Controls
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [selectedTrend, setSelectedTrend] = useState('all');
  const [selectedConfidence, setSelectedConfidence] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedOnlyFilter, setSavedOnlyFilter] = useState(viewOnlySaved);

  // Location Selector Lists
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  // Data & Results
  const [gaps, setGaps] = useState([]);
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    strongGaps: 0,
    moderateGaps: 0,
    emergingDemand: 0,
    noClearGap: 0,
    insufficientEvidence: 0,
    highConfidence: 0
  });
  const [savedGapIds, setSavedGapIds] = useState(new Set());
  const [selectedAuditGap, setSelectedAuditGap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cachedInfo, setCachedInfo] = useState(null);

  // Load locations on mount
  useEffect(() => {
    setDistricts(locationService.getAllDistricts());
    if (districtCode) {
      setTalukas(locationService.getTalukasForDistrict(districtCode));
    }
    if (districtCode && talukaCode) {
      locationService.getVillagesForTaluka(districtCode, talukaCode).then((res) => {
        setVillages(Array.isArray(res) ? res : (res?.villages || []));
      });
    }
  }, []);

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

  const handleTalukaChange = async (e) => {
    const tVal = e.target.value ? Number(e.target.value) : '';
    setTalukaCode(tVal);
    setVillageCode('');
    if (districtCode && tVal) {
      try {
        const res = await locationService.getVillagesForTaluka(districtCode, tVal);
        setVillages(Array.isArray(res) ? res : (res?.villages || []));
      } catch (err) {
        setVillages([]);
      }
    } else {
      setVillages([]);
    }
  };

  // Execute Gap Analysis
  const runAnalysis = async () => {
    setLoading(true);
    try {
      const filters = {
        districtCode: districtCode || undefined,
        talukaCode: talukaCode || undefined,
        villageCode: villageCode || undefined,
        classification: selectedClassification,
        trend: selectedTrend,
        minConfidence: selectedConfidence,
        category: selectedCategory,
        searchQuery: searchQuery
      };

      const [gapResults, statistics, savedIds] = await Promise.all([
        gapAnalyzerService.analyzeGaps(filters),
        gapAnalyzerService.getGapStatistics(filters),
        currentUserId ? gapAnalyzerService.getSavedGapIdsForUser(currentUserId) : []
      ]);

      setGaps(gapResults);
      setStats(statistics);
      setSavedGapIds(new Set(savedIds));

      // Check cache metadata
      if (districtCode) {
        const cacheKey = `gap_analysis_${districtCode}_${talukaCode || 'all'}`;
        const cacheMeta = await gapAnalyzerService.getCachedAnalysisRun(cacheKey);
        setCachedInfo(cacheMeta);
      }
    } catch (err) {
      console.warn('Error during gap analysis', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [districtCode, talukaCode, villageCode, selectedClassification, selectedTrend, selectedConfidence, selectedCategory, searchQuery]);

  // Handle Save / Unsave
  const handleToggleSave = async (gapId) => {
    if (!currentUserId) {
      alert(isMarathi ? 'संधी जतन करण्यासाठी कृपया उद्योजक खात्यात प्रवेश करा.' : 'Please log in with your entrepreneur account to save opportunities.');
      return;
    }

    const isSaved = savedGapIds.has(gapId);
    if (isSaved) {
      await gapAnalyzerService.removeSavedGapForUser(currentUserId, gapId);
      const updated = new Set(savedGapIds);
      updated.delete(gapId);
      setSavedGapIds(updated);
    } else {
      const targetGap = gaps.find((g) => g.id === gapId);
      await gapAnalyzerService.saveGapForUser(currentUserId, gapId, '', targetGap);
      const updated = new Set(savedGapIds);
      updated.add(gapId);
      setSavedGapIds(updated);
    }
  };

  // Helper Badges
  const getClassificationBadge = (classification) => {
    switch (classification) {
      case GAP_CLASSIFICATIONS.STRONG_GAP:
        return <span className="severity-badge severity-badge--critical">🚨 {t('gapAnalyzer.classification.strong_gap')}</span>;
      case GAP_CLASSIFICATIONS.EMERGING_DEMAND:
        return <span className="severity-badge severity-badge--emerging">📈 {t('gapAnalyzer.classification.emerging_demand')}</span>;
      case GAP_CLASSIFICATIONS.MODERATE_GAP:
        return <span className="severity-badge severity-badge--moderate">⚠️ {t('gapAnalyzer.classification.moderate_gap')}</span>;
      case GAP_CLASSIFICATIONS.NO_CLEAR_GAP:
        return <span className="severity-badge severity-badge--balanced">✓ {t('gapAnalyzer.classification.no_clear_gap')}</span>;
      default:
        return <span className="severity-badge severity-badge--insufficient">⏳ {t('gapAnalyzer.classification.insufficient_evidence')}</span>;
    }
  };

  const getTrendBadge = (trend, growth) => {
    switch (trend) {
      case DEMAND_TRENDS.INCREASING:
        return <span className="trend-pill trend-pill--increasing">🚀 {t('gapAnalyzer.trend.increasing')} (+{growth}%)</span>;
      case DEMAND_TRENDS.EMERGING:
        return <span className="trend-pill trend-pill--emerging">🌱 {t('gapAnalyzer.trend.emerging')}</span>;
      case DEMAND_TRENDS.DECREASING:
        return <span className="trend-pill trend-pill--decreasing">📉 {t('gapAnalyzer.trend.decreasing')} ({growth}%)</span>;
      case DEMAND_TRENDS.STABLE:
        return <span className="trend-pill trend-pill--stable">⚖️ {t('gapAnalyzer.trend.stable')}</span>;
      default:
        return <span className="trend-pill trend-pill--na">ℹ️ {t('gapAnalyzer.trend.trend_not_available')}</span>;
    }
  };

  const getConfidenceBadge = (confidence, score) => {
    switch (confidence) {
      case CONFIDENCE_LEVEL.HIGH:
        return <span className="confidence-pill confidence-pill--high">🛡️ {score}% {t('gapAnalyzer.confidence.high')}</span>;
      case CONFIDENCE_LEVEL.MODERATE:
        return <span className="confidence-pill confidence-pill--moderate">🔍 {score}% {t('gapAnalyzer.confidence.moderate')}</span>;
      default:
        return <span className="confidence-pill confidence-pill--low">📊 {score}% {t('gapAnalyzer.confidence.low')}</span>;
    }
  };

  const getCoverageBadge = (coverage) => {
    switch (coverage) {
      case DATA_COVERAGE_LEVELS.ADEQUATE:
        return <span className="coverage-pill coverage-pill--adequate">📋 {t('gapAnalyzer.scoring.adequate')}</span>;
      case DATA_COVERAGE_LEVELS.PARTIAL:
        return <span className="coverage-pill coverage-pill--partial">📝 {t('gapAnalyzer.scoring.partial')}</span>;
      default:
        return <span className="coverage-pill coverage-pill--inadequate">⚠️ {t('gapAnalyzer.scoring.inadequate')}</span>;
    }
  };

  const currentDistObj = locationService.getDistrictByCode(districtCode);
  const currentTalObj = locationService.getTalukaByCode(talukaCode);
  const currentVillObj = villages.find((v) => (v.code || v.c) === Number(villageCode));
  const currentVillageName = currentVillObj
    ? (isMarathi ? (currentVillObj.name_mr || currentVillObj.m) : (currentVillObj.name_en || currentVillObj.n))
    : (villageCode === 524444 ? (isMarathi ? 'बारेगाव पिंप्री' : 'Baragaon Pimpri') : (isMarathi ? 'सर्व गावे' : 'All Villages'));

  // Filter for saved opportunities if toggled
  const displayedGaps = savedOnlyFilter
    ? gaps.filter((g) => savedGapIds.has(g.id))
    : gaps;

  return (
    <div className="gap-overview-section">
      {/* Offline Sync State Notice */}
      {cachedInfo && (
        <div className={`offline-cache-banner ${cachedInfo.isOutdated ? 'offline-cache-banner--outdated' : ''}`}>
          <AppIcon name="clock" size={16} color="#795548" />
          <span>
            {isMarathi
              ? `ऑफलाइन साठा: ${new Date(cachedInfo.cachedAt).toLocaleDateString()} रोजी साठवलेले विश्लेषण`
              : `Showing cached analysis from ${new Date(cachedInfo.cachedAt).toLocaleDateString()}`}
            {cachedInfo.isOutdated && (
              <strong> • {isMarathi ? 'साठा जुना आहे, नव्याने जोडणी करा' : 'Analysis older than 7 days'}</strong>
            )}
          </span>
          <button type="button" className="refresh-cache-btn" onClick={runAnalysis}>
            🔄 {t('gapAnalyzer.offline.syncNowBtn')}
          </button>
        </div>
      )}

      {/* Transparency & Limitations Mandatory Banner */}
      <div className="transparency-mandatory-banner" role="alert">
        <div className="banner-icon-box">
          <AppIcon name="shield" size={22} color="#b78103" />
        </div>
        <div className="banner-text-box">
          <strong className="banner-title">{t('gapAnalyzer.disclaimer.title')}</strong>
          <p className="banner-desc">{t('gapAnalyzer.disclaimer.body')}</p>
        </div>
      </div>

      {/* Location Base Context Bar */}
      <Card className="gap-location-bar-card">
        <div className="location-bar-content">
          <div className="location-meta">
            <span className="location-meta-label">{t('gapAnalyzer.filters.locationBase')}</span>
            <strong className="location-meta-name">
              📍 {currentVillageName}, {currentTalObj ? (isMarathi ? currentTalObj.marathiName : currentTalObj.name) : 'Sinnar'}, {currentDistObj ? (isMarathi ? currentDistObj.marathiName : currentDistObj.name) : 'Nashik'}
            </strong>
          </div>
          <button
            type="button"
            className="change-location-btn"
            onClick={() => setShowLocationPicker(!showLocationPicker)}
          >
            {showLocationPicker ? (isMarathi ? 'बंद करा ✕' : 'Close ✕') : (isMarathi ? 'स्थान बदला ⚙️' : 'Change Location ⚙️')}
          </button>
        </div>

        {/* Location Picker Drawer */}
        {showLocationPicker && (
          <div className="location-picker-drawer">
            <div className="location-picker-grid">
              <div className="picker-col">
                <label className="filter-label">{isMarathi ? 'जिल्हा:' : 'District:'}</label>
                <select className="filter-select" value={districtCode} onChange={handleDistrictChange}>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {isMarathi ? d.marathiName : d.name} (LGD {d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker-col">
                <label className="filter-label">{isMarathi ? 'तालुका:' : 'Taluka:'}</label>
                <select className="filter-select" value={talukaCode} onChange={handleTalukaChange} disabled={!districtCode}>
                  {talukas.map((t) => (
                    <option key={t.code} value={t.code}>
                      {isMarathi ? t.marathiName : t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="picker-col">
                <label className="filter-label">{isMarathi ? 'गाव:' : 'Village:'}</label>
                <select
                  className="filter-select"
                  value={villageCode}
                  onChange={(e) => setVillageCode(e.target.value ? Number(e.target.value) : '')}
                  disabled={!talukaCode}
                >
                  <option value="">{isMarathi ? '-- सर्व गावे --' : '-- All Villages --'}</option>
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
      </Card>

      {/* Summary Statistics Cards (Phase 2 Metrics) */}
      <div className="gap-stats-grid">
        <Card className="stat-card">
          <span className="stat-number">{stats.totalAnalyzed}</span>
          <span className="stat-label">{t('gapAnalyzer.stats.totalAnalyzed')}</span>
          <span className="stat-desc">{isMarathi ? 'नागरिक मागण्या व पुरवठा तुलना' : 'Needs cross-examined'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--danger">{stats.strongGaps || stats.criticalGaps}</span>
          <span className="stat-label">{t('gapAnalyzer.stats.strongGaps')}</span>
          <span className="stat-desc">{isMarathi ? 'उच्च मागणी + शून्य स्थानिक पुरवठा' : 'High demand + 0 suppliers'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--emerging">{stats.emergingDemand}</span>
          <span className="stat-label">{t('gapAnalyzer.stats.emergingDemand')}</span>
          <span className="stat-desc">{isMarathi ? 'वेगाने वाढणाऱ्या नव्या गरजा' : 'Surging recent request volume'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--warning">{stats.moderateGaps}</span>
          <span className="stat-label">{t('gapAnalyzer.stats.moderateGaps')}</span>
          <span className="stat-desc">{isMarathi ? 'मध्यम मागणी + मर्यादित पुरवठा' : 'Moderate demand + limited supply'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--success">{stats.highConfidence}</span>
          <span className="stat-label">{t('gapAnalyzer.stats.highConfidence')}</span>
          <span className="stat-desc">{isMarathi ? 'बहु-नागरिक पडताळलेला पुरावा' : 'Corroborated evidence'}</span>
        </Card>
      </div>

      {/* Filter Options Card (Phase 2: Classification, Trend, Confidence, Category) */}
      <Card className="gap-filters-card">
        <div className="gap-filters-row">
          {/* Search Query */}
          <div className="filter-search-box">
            <AppIcon name="search" size={18} color="#555" />
            <input
              type="text"
              className="demand-search-input"
              placeholder={t('gapAnalyzer.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {/* Classification Filter */}
          <div className="filter-select-box">
            <label className="filter-label">{t('gapAnalyzer.filters.classificationFilter')}</label>
            <select
              className="filter-select"
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
            >
              <option value="all">{t('gapAnalyzer.filters.allClassifications')}</option>
              <option value={GAP_CLASSIFICATIONS.STRONG_GAP}>{t('gapAnalyzer.classification.strong_gap')}</option>
              <option value={GAP_CLASSIFICATIONS.EMERGING_DEMAND}>{t('gapAnalyzer.classification.emerging_demand')}</option>
              <option value={GAP_CLASSIFICATIONS.MODERATE_GAP}>{t('gapAnalyzer.classification.moderate_gap')}</option>
              <option value={GAP_CLASSIFICATIONS.NO_CLEAR_GAP}>{t('gapAnalyzer.classification.no_clear_gap')}</option>
              <option value={GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE}>{t('gapAnalyzer.classification.insufficient_evidence')}</option>
            </select>
          </div>

          {/* Trend Filter */}
          <div className="filter-select-box">
            <label className="filter-label">{t('gapAnalyzer.filters.trendFilter')}</label>
            <select
              className="filter-select"
              value={selectedTrend}
              onChange={(e) => setSelectedTrend(e.target.value)}
            >
              <option value="all">{t('gapAnalyzer.filters.allTrends')}</option>
              <option value={DEMAND_TRENDS.INCREASING}>{t('gapAnalyzer.trend.increasing')}</option>
              <option value={DEMAND_TRENDS.EMERGING}>{t('gapAnalyzer.trend.emerging')}</option>
              <option value={DEMAND_TRENDS.STABLE}>{t('gapAnalyzer.trend.stable')}</option>
              <option value={DEMAND_TRENDS.DECREASING}>{t('gapAnalyzer.trend.decreasing')}</option>
              <option value={DEMAND_TRENDS.NOT_AVAILABLE}>{t('gapAnalyzer.trend.trend_not_available')}</option>
            </select>
          </div>

          {/* Confidence Filter */}
          <div className="filter-select-box">
            <label className="filter-label">{t('gapAnalyzer.filters.confidenceFilter')}</label>
            <select
              className="filter-select"
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
            >
              <option value="all">{t('gapAnalyzer.filters.allConfidence')}</option>
              <option value={CONFIDENCE_LEVEL.HIGH}>{t('gapAnalyzer.confidence.high')}</option>
              <option value={CONFIDENCE_LEVEL.MODERATE}>{t('gapAnalyzer.confidence.moderate')}</option>
              <option value={CONFIDENCE_LEVEL.LOW}>{t('gapAnalyzer.confidence.low')}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-select-box">
            <label className="filter-label">{t('gapAnalyzer.filters.categoryFilter')}</label>
            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{t('gapAnalyzer.filters.allCategories')}</option>
              {DEMAND_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {isMarathi ? c.name_mr : c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Saved Opportunities Toggle */}
          <div className="filter-saved-toggle-box">
            <button
              type="button"
              className={`saved-toggle-btn ${savedOnlyFilter ? 'saved-toggle-btn--active' : ''}`}
              onClick={() => setSavedOnlyFilter(!savedOnlyFilter)}
            >
              ★ {isMarathi ? 'माझ्या जतन केलेल्या संधी' : 'My Saved Opportunities'} ({savedGapIds.size})
            </button>
          </div>
        </div>
      </Card>

      {/* Gap Analysis Results List */}
      <div className="gap-results-container">
        {loading ? (
          <div className="gap-loading-box">
            <div className="spinner"></div>
            <p>{isMarathi ? 'पुरवठा-मागणी अंतर विश्लेषण सुरू आहे...' : 'Analyzing supply-demand ratios against verified registers...'}</p>
          </div>
        ) : displayedGaps.length === 0 ? (
          <Card className="gap-empty-card">
            <p>
              {savedOnlyFilter
                ? (isMarathi ? 'तुम्ही अद्याप कोणतीही संधी जतन केलेली नाही.' : 'You have not saved any opportunities yet.')
                : (isMarathi ? 'निवडलेल्या निकषांवर कोणताही पुरवठा तुटवडा आढळला नाही.' : 'No supply gaps match the selected filters.')}
            </p>
          </Card>
        ) : (
          <div className="gap-cards-stack">
            {displayedGaps.map((item) => {
              const isSaved = savedGapIds.has(item.id);
              const isStrong = item.classification === GAP_CLASSIFICATIONS.STRONG_GAP;

              return (
                <Card
                  key={item.id}
                  className={`gap-item-card ${isStrong ? 'gap-item-card--critical' : ''}`}
                >
                  {/* Card Top Metadata & Indicators */}
                  <div className="gap-card-header">
                    <div className="gap-title-group">
                      <div className="gap-badges-row">
                        {getClassificationBadge(item.classification)}
                        {getTrendBadge(item.trend, item.trendGrowthPercentage)}
                        {getConfidenceBadge(item.confidence, item.confidenceScore)}
                        {getCoverageBadge(item.dataCoverage)}
                      </div>
                      <h3 className="gap-product-title">
                        {isMarathi ? item.productOrService_mr : item.productOrService}
                      </h3>
                      <div className="gap-location-trail">
                        <span>📍 {item.village || item.taluka}</span>
                        <span>• {item.taluka}</span>
                        <span>• {item.district}</span>
                      </div>
                    </div>

                    <div className="gap-header-right">
                      {/* Potential Gap Score Pill */}
                      <div className="gap-score-box">
                        <span className="gap-score-title">{t('gapAnalyzer.scoring.scoreLabel')}</span>
                        {item.isScoreValid ? (
                          <span className={`gap-score-badge ${item.gapScore >= 70 ? 'gap-score-badge--high' : item.gapScore >= 40 ? 'gap-score-badge--medium' : 'gap-score-badge--low'}`}>
                            {isMarathi ? item.gapScoreLabel_mr : item.gapScoreLabel}
                          </span>
                        ) : (
                          <span className="gap-score-badge gap-score-badge--insufficient">
                            {isMarathi ? item.gapScoreLabel_mr : item.gapScoreLabel}
                          </span>
                        )}
                      </div>

                      {/* Save Opportunity Action */}
                      <Button
                        variant={isSaved ? 'success' : 'outline'}
                        size="small"
                        onClick={() => handleToggleSave(item.id)}
                        className="save-gap-btn"
                      >
                        {isSaved ? '★ ' + t('gapAnalyzer.card.savedBadge') : '☆ ' + t('gapAnalyzer.card.saveOpportunityBtn')}
                      </Button>
                    </div>
                  </div>

                  {/* Card Metrics Grid: Demand Evidence vs Known Local Supply */}
                  <div className="gap-evidence-grid">
                    {/* Column 1: Citizen Demand Evidence */}
                    <div className="evidence-col evidence-col--demand">
                      <span className="evidence-header-label">
                        👥 {t('gapAnalyzer.card.citizenDemandCount', { count: item.totalValidReports })}
                      </span>
                      <div className="evidence-metrics">
                        <span className="breakdown-pill">
                          {t('gapAnalyzer.card.breakdownSummary', {
                            notAvailable: item.notAvailablePercentage,
                            difficultAccess: Math.max(0, 100 - item.notAvailablePercentage)
                          })}
                        </span>
                        <span className="urgency-pill">
                          ⏱️ {t('gapAnalyzer.card.frequencyLabel')} <strong>{item.dominantFrequency || 'Weekly'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Known Local Supply Evidence */}
                    <div className="evidence-col evidence-col--supply">
                      <span className="evidence-header-label">
                        🏢 {item.knownVerifiedSuppliersCount === 0
                          ? t('gapAnalyzer.card.zeroSuppliers')
                          : t('gapAnalyzer.card.knownSuppliers', { count: item.knownVerifiedSuppliersCount })}
                      </span>
                      <div className="evidence-metrics">
                        {item.knownVerifiedSuppliersCount === 0 ? (
                          <span className="zero-supply-warning">
                            ⚠️ {isMarathi ? 'गावात एकही अधिकृत विक्रेता नोंदणीकृत नाही' : 'Zero registered providers in village'}
                          </span>
                        ) : (
                          <span className="known-supply-pill">
                            ✓ {isMarathi
                              ? `${item.sameVillageVerifiedCount} गावात, ${item.knownVerifiedSuppliersCount - item.sameVillageVerifiedCount} तालुक्यात`
                              : `${item.sameVillageVerifiedCount} in village, ${item.knownVerifiedSuppliersCount - item.sameVillageVerifiedCount} in taluka`}
                          </span>
                        )}
                        {item.unverifiedSuppliersCount > 0 && (
                          <span className="unverified-supply-pill">
                            ℹ️ {t('gapAnalyzer.card.unverifiedSuppliers', { count: item.unverifiedSuppliersCount })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Objective Rule Explanation Box (Section 6) */}
                  <div className="gap-explanation-box">
                    <strong className="explanation-title">
                      💡 {t('gapAnalyzer.card.explanationHeading')}
                    </strong>
                    <p className="explanation-paragraph">
                      {isMarathi ? item.explanation_mr : item.explanation_en}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="gap-actions-bar">
                    <div className="left-audit-action">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setSelectedAuditGap(item)}
                      >
                        🔍 {t('gapAnalyzer.card.viewAuditBtn')}
                      </Button>
                    </div>

                    <div className="right-integrations">
                      {/* Village Opportunity Detector Link */}
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('opportunity-detector')}
                      >
                        🌾 {t('gapAnalyzer.card.connectDetectorBtn')}
                      </Button>

                      {/* Demand Signal Collector Link */}
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('demand-collector')}
                      >
                        📢 {t('gapAnalyzer.card.connectDemandBtn')}
                      </Button>

                      {/* BazaarPath Link */}
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => onNavigateModule && onNavigateModule('bazaarpath')}
                      >
                        🛒 {t('gapAnalyzer.card.connectBazaarBtn')}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Opportunity Details & Field Investigation Modal */}
      {selectedAuditGap && (
        <GapDetailModal
          gap={selectedAuditGap}
          onClose={() => setSelectedAuditGap(null)}
          onSaveOpportunity={handleToggleSave}
          isSaved={savedGapIds.has(selectedAuditGap.id)}
        />
      )}
    </div>
  );
}

export default GapOverviewSection;
