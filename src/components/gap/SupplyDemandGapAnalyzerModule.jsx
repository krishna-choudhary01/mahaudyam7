import React, { useState } from 'react';
import { GapOverviewSection } from './GapOverviewSection.jsx';
import { LocalSuppliersDirectory } from './LocalSuppliersDirectory.jsx';
import { InvestigatedOpportunitiesSection } from './InvestigatedOpportunitiesSection.jsx';
import { useLanguage } from '../../i18n/index.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import './SupplyDemandGapAnalyzer.css';

export function SupplyDemandGapAnalyzerModule({ onBack, onNavigateModule, initialTab = 'gapsList' }) {
  const { t, isMarathi } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState(initialTab); // 'gapsList' | 'suppliersDir'

  return (
    <div className="supply-demand-gap-analyzer-module">
      {/* Module Top Bar */}
      <div className="module-top-bar">
        <div className="top-bar-left">
          {onBack && (
            <button
              type="button"
              className="back-nav-btn"
              onClick={onBack}
              aria-label={isMarathi ? 'मागे जा' : 'Back to Home'}
            >
              <AppIcon name="arrowLeft" size={20} color="#1b5e20" />
              <span>{isMarathi ? 'मागे' : 'Back'}</span>
            </button>
          )}

          <div className="module-title-wrap">
            <span className="module-category-pill">
              {isMarathi ? 'बाजार माहिती व नियोजन' : 'Market Intelligence & Planning'}
            </span>
            <h1 className="module-main-title">
              {isMarathi ? 'पुरवठा-मागणी अंतर विश्लेषक' : 'Supply–Demand Gap Analyzer'}
            </h1>
          </div>
        </div>

        <div className="top-bar-right">
          {/* Offline Sync State Badge */}
          <div className={`sync-pill-badge ${isOnline ? 'sync-pill-badge--online' : 'sync-pill-badge--offline'}`}>
            <span className="sync-dot"></span>
            <span>
              {isOnline
                ? (isMarathi ? 'ऑनलाइन सिंक सुरू' : 'Online & Live')
                : (isMarathi ? 'स्थानिक साठा सक्रिय' : 'Offline Cache Active')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="gap-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'gapsList'}
          className={`gap-nav-tab ${activeTab === 'gapsList' ? 'gap-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('gapsList')}
        >
          <span className="tab-icon">⚖️</span>
          <span className="tab-title">{t('gapAnalyzer.tabs.gapsList')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'savedGaps'}
          className={`gap-nav-tab ${activeTab === 'savedGaps' ? 'gap-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('savedGaps')}
        >
          <span className="tab-icon">★</span>
          <span className="tab-title">{t('gapAnalyzer.tabs.savedGaps')}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'suppliersDir'}
          className={`gap-nav-tab ${activeTab === 'suppliersDir' ? 'gap-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('suppliersDir')}
        >
          <span className="tab-icon">🏢</span>
          <span className="tab-title">{t('gapAnalyzer.tabs.suppliersDir')}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="gap-tab-content">
        {activeTab === 'gapsList' && (
          <GapOverviewSection onNavigateModule={onNavigateModule} />
        )}

        {activeTab === 'savedGaps' && (
          <InvestigatedOpportunitiesSection
            onNavigateModule={onNavigateModule}
            onExploreMore={() => setActiveTab('gapsList')}
          />
        )}

        {activeTab === 'suppliersDir' && (
          <LocalSuppliersDirectory />
        )}
      </div>
    </div>
  );
}
export default SupplyDemandGapAnalyzerModule;
