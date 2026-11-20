import React, { useState, useEffect } from 'react';
import { adminAuthService, ROLES } from '../../services/auth/adminAuthService.js';
import { AppIcon } from '../common/Icons.jsx';
import { useLanguage } from '../../i18n/index.js';
import './AdminDashboard.css';
import './sections/Sections.css';

// Dashboard Sections
import { OverviewSection } from './sections/OverviewSection.jsx';
import { MarketManagementSection } from './sections/MarketManagementSection.jsx';
import { AddMarketSection } from './sections/AddMarketSection.jsx';
import { SubmissionsSection } from './sections/SubmissionsSection.jsx';
import { LocationManagementSection } from './sections/LocationManagementSection.jsx';
import { CategoriesSection } from './sections/CategoriesSection.jsx';
import { UserManagementSection } from './sections/UserManagementSection.jsx';
import { ActivityLogsSection } from './sections/ActivityLogsSection.jsx';
import { SettingsSection } from './sections/SettingsSection.jsx';
import { DemandModerationSection } from '../demand/DemandModerationSection.jsx';

export function AdminDashboard({ onNavigatePublic, onLogout }) {
  const { t, language, setLanguage, isMarathi } = useLanguage();
  const [currentAdmin, setCurrentAdmin] = useState(() => adminAuthService.getCurrentAdmin());
  const [activeTab, setActiveTab] = useState('overview');
  const [editingMarket, setEditingMarket] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = adminAuthService.subscribe((admin) => {
      setCurrentAdmin(admin);
    });
    return () => unsub();
  }, []);

  const handleEditMarket = (market) => {
    setEditingMarket(market);
    setActiveTab('add-market');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNewMarket = () => {
    setEditingMarket(null);
    setActiveTab('add-market');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarketSaved = () => {
    setEditingMarket(null);
    setActiveTab('market-management');
  };

  const handleLogout = async () => {
    await adminAuthService.logoutAdmin();
    if (onLogout) onLogout();
  };

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'overview': return t('admin.nav.overview');
      case 'market-management': return t('admin.nav.marketManagement');
      case 'add-market': return editingMarket ? (isMarathi ? 'बाजार संपादन' : 'Edit Market') : t('admin.nav.addNewMarket');
      case 'submissions': return t('admin.nav.submissions');
      case 'demand-moderation': return isMarathi ? 'ग्राहक मागणी नियंत्रण' : 'Citizen Demand Moderation';
      case 'locations': return t('admin.nav.locations');
      case 'categories': return t('admin.nav.categories');
      case 'users': return t('admin.nav.users');
      case 'audit-logs': return t('admin.nav.auditLogs');
      case 'settings': return t('admin.nav.settings');
      default: return 'Admin Portal';
    }
  };

  const isSuperAdmin = currentAdmin?.role === ROLES.SUPER_ADMIN;

  return (
    <div className="admin-dashboard">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="admin-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__brand">
            <div className="admin-sidebar__logo">MU</div>
            <div>
              <span className="admin-sidebar__title">MahaUdyam</span>
              <span className="admin-sidebar__subtitle">Admin Console</span>
            </div>
          </div>
          {mobileMenuOpen && (
            <button
              type="button"
              className="btn-mini"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          )}
        </div>

        <nav className="admin-sidebar__nav" role="navigation" aria-label="Admin Navigation">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'overview' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="analysis" size={18} />
            <span>{t('admin.nav.overview')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'market-management' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('market-management'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="market" size={18} />
            <span>{t('admin.nav.marketManagement')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'add-market' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { handleAddNewMarket(); setMobileMenuOpen(false); }}
          >
            <AppIcon name="check" size={18} />
            <span>{t('admin.nav.addNewMarket')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'submissions' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('submissions'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="opportunity" size={18} />
            <span>{t('admin.nav.submissions')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'demand-moderation' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('demand-moderation'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="signal" size={18} />
            <span>{isMarathi ? 'ग्राहक मागणी नियंत्रण' : 'Demand Moderation'}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'locations' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('locations'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="route" size={18} />
            <span>{t('admin.nav.locations')}</span>
          </button>

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'categories' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('categories'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="signal" size={18} />
            <span>{t('admin.nav.categories')}</span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                className={`admin-nav-item ${activeTab === 'users' ? 'admin-nav-item--active' : ''}`}
                onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
              >
                <AppIcon name="lock" size={18} />
                <span>{t('admin.nav.users')}</span>
              </button>

              <button
                type="button"
                className={`admin-nav-item ${activeTab === 'audit-logs' ? 'admin-nav-item--active' : ''}`}
                onClick={() => { setActiveTab('audit-logs'); setMobileMenuOpen(false); }}
              >
                <AppIcon name="database" size={18} />
                <span>{t('admin.nav.auditLogs')}</span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'settings' ? 'admin-nav-item--active' : ''}`}
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
          >
            <AppIcon name="sync" size={18} />
            <span>{t('admin.nav.settings')}</span>
          </button>
        </nav>

        {/* Sidebar Footer with Personnel Info & Actions */}
        <div className="admin-sidebar__footer">
          {currentAdmin && (
            <div className="admin-user-info">
              <div className="admin-avatar">
                {currentAdmin.name ? currentAdmin.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="admin-user-details">
                <span className="admin-user-name" title={currentAdmin.name}>
                  {currentAdmin.name}
                </span>
                <span className={`admin-role-pill ${currentAdmin.role === ROLES.SUPER_ADMIN ? 'role-super' : currentAdmin.role === ROLES.ADMIN ? 'role-admin' : 'role-moderator'}`}>
                  {currentAdmin.role}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="admin-footer-btn"
            onClick={onNavigatePublic}
            title="Switch to Entrepreneur Public Website"
          >
            🌐 {t('admin.nav.viewPublicSite')}
          </button>

          <button
            type="button"
            className="admin-footer-btn admin-footer-btn--logout"
            onClick={handleLogout}
          >
            🚪 {t('admin.nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              type="button"
              className="admin-menu-toggle"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Sidebar Menu"
            >
              ☰
            </button>
            <h1 className="admin-topbar__title">{getSectionTitle()}</h1>
          </div>

          <div className="admin-topbar__right">
            {/* Prominent Language Switcher */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className={`admin-lang-pill ${language === 'en' ? 'admin-lang-pill--active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`admin-lang-pill ${language === 'mr' ? 'admin-lang-pill--active' : ''}`}
                onClick={() => setLanguage('mr')}
              >
                मराठी
              </button>
            </div>

            <button
              type="button"
              className="btn-mini"
              onClick={onNavigatePublic}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>{isMarathi ? 'उद्योजक पोर्टल' : 'Entrepreneur View'}</span> →
            </button>
          </div>
        </header>

        {/* Dynamic Section Container */}
        <div className="admin-content-body">
          {activeTab === 'overview' && (
            <OverviewSection onNavigateTab={(tab) => { setActiveTab(tab); }} />
          )}

          {activeTab === 'market-management' && (
            <MarketManagementSection
              onEditMarket={handleEditMarket}
              onAddNew={handleAddNewMarket}
            />
          )}

          {activeTab === 'add-market' && (
            <AddMarketSection
              editingMarket={editingMarket}
              onSaved={handleMarketSaved}
              onCancel={() => { setEditingMarket(null); setActiveTab('market-management'); }}
            />
          )}

          {activeTab === 'submissions' && (
            <SubmissionsSection />
          )}

          {activeTab === 'demand-moderation' && (
            <DemandModerationSection />
          )}

          {activeTab === 'locations' && (
            <LocationManagementSection />
          )}

          {activeTab === 'categories' && (
            <CategoriesSection />
          )}

          {activeTab === 'users' && (
            <UserManagementSection />
          )}

          {activeTab === 'audit-logs' && (
            <ActivityLogsSection />
          )}

          {activeTab === 'settings' && (
            <SettingsSection />
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
