import React, { useState, useEffect } from 'react';
import { CustomerDemandForm } from './CustomerDemandForm.jsx';
import { EntrepreneurDemandExplorer } from './EntrepreneurDemandExplorer.jsx';
import { DemandModerationSection } from './DemandModerationSection.jsx';
import { adminAuthService } from '../../services/auth/adminAuthService.js';
import { authService } from '../../services/auth/authService.js';
import { useLanguage } from '../../i18n/index.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import './DemandSignalCollector.css';

export function DemandSignalCollectorModule({ onBack, onNavigateModule, initialTab = 'customer' }) {
  const { t, isMarathi } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState(initialTab); // 'customer' | 'entrepreneur' | 'moderation'
  const [isAdmin, setIsAdmin] = useState(() => adminAuthService.isAdminAuthenticated());
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    const unsub = adminAuthService.subscribe(() => {
      setIsAdmin(adminAuthService.isAdminAuthenticated());
    });
    return () => unsub();
  }, []);

  return (
    <div className="demand-signal-collector-module">
      {/* Module Header Bar */}
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
              {isMarathi ? 'मागणी आणि व्यापार' : 'Demand & Trade'}
            </span>
            <h1 className="module-main-title">
              {isMarathi ? 'मागणी संकलन' : 'Demand Signal Collector'}
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
                : (isMarathi ? 'ऑफलाइन कार्यक्षम' : 'Offline Ready')}
            </span>
          </div>
        </div>
      </div>

      {/* Role Navigation Switcher Tabs */}
      <div className="demand-tabs-nav" role="tablist">
        {/* Tab 1: Customer View (Village Resident) */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'customer'}
          className={`demand-nav-tab ${activeTab === 'customer' ? 'demand-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('customer')}
        >
          <span className="tab-icon">📣</span>
          <span className="tab-title">{t('demand.tabs.reportNeed')}</span>
        </button>

        {/* Tab 2: Entrepreneur View */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'entrepreneur'}
          className={`demand-nav-tab ${activeTab === 'entrepreneur' ? 'demand-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('entrepreneur')}
        >
          <span className="tab-icon">🔎</span>
          <span className="tab-title">{t('demand.tabs.discoverDemand')}</span>
        </button>

        {/* Tab 3: Moderation View (Visible to Admin/Staff) */}
        {isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'moderation'}
            className={`demand-nav-tab ${activeTab === 'moderation' ? 'demand-nav-tab--active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            <span className="tab-icon">🛡️</span>
            <span className="tab-title">{t('demand.tabs.moderation')}</span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="demand-tab-content">
        {activeTab === 'customer' && (
          <CustomerDemandForm
            onDemandSubmitted={() => {
              // Optionally offer preview in entrepreneur view
            }}
          />
        )}

        {activeTab === 'entrepreneur' && (
          !currentUser ? (
            <div className="entrepreneur-gate-card" role="region" aria-label={isMarathi ? 'उद्योजक नोंदणी आवश्यक' : 'Entrepreneur Registration Required'}>
              <div className="gate-icon-large">🔒</div>
              <h3 className="gate-card-title">
                {isMarathi ? 'उद्योजक नोंदणी आवश्यक' : 'Entrepreneur Registration Required'}
              </h3>
              <p className="gate-card-desc">
                {isMarathi
                  ? 'गावपातळीवरील गोळा झालेली मागणी आणि व्यवसायाच्या संधींचे विश्लेषण केवळ नोंदणीकृत उद्योजकांसाठी उपलब्ध आहे. स्थानिक मागणीचे विश्लेषण पाहण्यासाठी कृपया नोंदणी करा.'
                  : 'Exploring aggregated village demand signals, consumer deficits, and enterprise opportunities is reserved for verified entrepreneurs.'}
              </p>
              <div className="gate-card-actions">
                <button
                  type="button"
                  className="gate-card-btn-primary"
                  onClick={() => onNavigateModule && onNavigateModule('register')}
                >
                  🚀 {isMarathi ? 'उद्योजक म्हणून मोफत नोंदणी करा' : 'Register as Entrepreneur (Free)'}
                </button>
                <button
                  type="button"
                  className="gate-card-btn-secondary"
                  onClick={() => onNavigateModule && onNavigateModule('login')}
                >
                  🔑 {isMarathi ? 'खात्यात लॉगिन करा' : 'Login to Account'}
                </button>
              </div>
            </div>
          ) : (
            <EntrepreneurDemandExplorer
              onNavigateModule={onNavigateModule}
            />
          )
        )}

        {activeTab === 'moderation' && (
          <DemandModerationSection />
        )}
      </div>
    </div>
  );
}
export default DemandSignalCollectorModule;
