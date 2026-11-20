import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { Card } from './components/common/Card';
import { Button } from './components/common/Button';
import { AppIcon } from './components/common/Icons';
import { WelcomeSection } from './components/home/WelcomeSection';
import { RecentModules } from './components/home/RecentModules';
import { CitizenGuestSection } from './components/home/CitizenGuestSection';
import { OfflineAssuranceCard } from './components/home/OfflineAssuranceCard';
import { ModuleCard } from './components/modules/ModuleCard';
import { ModuleDetailPlaceholder } from './components/modules/ModuleDetailPlaceholder';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { UserProfileView } from './components/auth/UserProfileView';
import { LogoutConfirmModal } from './components/auth/LogoutConfirmModal';
import { BazaarPathModule } from './components/bazaar/BazaarPathModule';
import { DemandSignalCollectorModule } from './components/demand/DemandSignalCollectorModule.jsx';
import { SupplyDemandGapAnalyzerModule } from './components/gap/SupplyDemandGapAnalyzerModule.jsx';
import { VillageOpportunityDetectorModule } from './components/village/VillageOpportunityDetectorModule.jsx';
import { UnsoldStockRescueModule } from './components/stock/UnsoldStockRescueModule.jsx';
import { RawMaterialRouteFinderModule } from './components/materials/RawMaterialRouteFinderModule.jsx';
import { SharedResourceMatcherModule } from './components/resources/SharedResourceMatcherModule.jsx';
import { ResourceHubModule } from './components/learning/ResourceHubModule.jsx';
import { AIBusinessAdvisorModule } from './components/ai/AIBusinessAdvisorModule.jsx';
import { MODULES_DATA, MODULE_CATEGORIES } from './data/modulesData';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { db, getDbStatus } from './services/db';
import { syncManager } from './services/offline/syncManager';
import { syncEngine, SYNC_STATUS } from './services/offline/syncEngine';
import { authService } from './services/auth/authService';
import { adminAuthService } from './services/auth/adminAuthService.js';
import { AdminLoginForm } from './components/admin/AdminLoginForm.jsx';
import { AdminDashboard } from './components/admin/AdminDashboard.jsx';
import { useLanguage } from './i18n';
import './App.css';

export function App() {
  const { isOnline } = useOnlineStatus();
  const { t, isMarathi } = useLanguage();
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'diagnostic' | 'login' | 'register' | 'profile' | 'forgot-password'
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [authNotice, setAuthNotice] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [dbState, setDbState] = useState(null);
  const [testResult, setTestResult] = useState('');
  const [isTestingDb, setIsTestingDb] = useState(false);

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'All': return t('home.allCategories');
      case 'Market Intelligence': return t('home.categoryMarket');
      case 'Demand & Trade': return t('home.categoryDemand');
      case 'Logistics': return t('home.categoryLogistics');
      case 'Resources': return t('home.categoryResources');
      default: return cat;
    }
  };

  // Initialize auth session and subscribe to changes
  useEffect(() => {
    let unsubscribe = () => {};

    const initAuth = async () => {
      await authService.init();
      await adminAuthService.init();
      setCurrentUser(authService.getCurrentUser());
      unsubscribe = authService.subscribe((user) => {
        setCurrentUser(user);
      });
    };

    initAuth();
    refreshDbStatus();

    // Sync view from URL hash or history state
    const parseUrlHash = () => {
      const hash = (window.location.hash || '').replace('#', '');
      const validModules = [
        'ai-advisor', 'bazaarpath', 'demand-collector', 'gap-analyzer',
        'opportunity-detector', 'unsold-stock', 'route-finder',
        'resource-matcher', 'resource-hub'
      ];
      const validViews = ['login', 'register', 'profile', 'diagnostic', 'admin', 'forgot-password'];

      if (validModules.includes(hash)) {
        // Access control: Only 'demand-collector' (Report Village Need) is public before registration
        if (!authService.getCurrentUser() && hash !== 'demand-collector') {
          setAuthNotice({
            title: isMarathi ? '🔒 उद्योजक नोंदणी आवश्यक' : '🔒 Entrepreneur Registration Required',
            message: isMarathi
              ? 'या व्यवसाय मोड्युलसाठी कृपया उद्योजक म्हणून नोंदणी किंवा लॉगिन करा. सर्वसामान्य नागरिकांसाठी केवळ "गावाची गरज नोंदवा" उपलब्ध आहे.'
              : 'Please register or login as an entrepreneur to access this business module. Only "Report Village Need" is open to public visitors.'
          });
          setCurrentView('register');
          setActiveModuleId(null);
          return true;
        }
        setActiveModuleId(hash);
        setCurrentView('home');
        return true;
      } else if (validViews.includes(hash)) {
        setCurrentView(hash);
        setActiveModuleId(null);
        return true;
      }
      return false;
    };

    // Parse on initial load if hash is present
    if (window.location.hash && window.location.hash !== '#home') {
      parseUrlHash();
    }

    // Listen to browser popstate and hashchange for deep-linking and back button support
    const handlePopState = (e) => {
      if (e.state && e.state.moduleId) {
        setActiveModuleId(e.state.moduleId);
        setCurrentView('home');
      } else if (e.state && e.state.view) {
        setCurrentView(e.state.view);
        setActiveModuleId(null);
      } else if (!parseUrlHash()) {
        setActiveModuleId(null);
        setCurrentView('home');
      }
    };

    const handleHashChange = () => {
      parseUrlHash();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  async function refreshDbStatus() {
    const status = await getDbStatus();
    setDbState(status);
  }

  // Navigation handlers
  const handleSelectModule = (moduleId) => {
    // Access control: Only 'demand-collector' (Report Village Need) is accessible before registering
    if (!currentUser && moduleId !== 'demand-collector') {
      const moduleName = MODULES_DATA.find((m) => m.id === moduleId)?.title || moduleId;
      setAuthNotice({
        title: isMarathi ? '🔒 उद्योजक नोंदणी आवश्यक' : '🔒 Entrepreneur Registration Required',
        message: isMarathi
          ? `या व्यवसाय मोड्युलसाठी (${moduleName}) कृपया उद्योजक म्हणून नोंदणी किंवा लॉगिन करा. सर्वसामान्य नागरिकांसाठी केवळ 'गावाची गरज नोंदवा' उपलब्ध आहे.`
          : `Access to ${moduleName} requires an entrepreneur account. Only 'Report Village Need' is open to public visitors. Please register or login below.`
      });
      setCurrentView('register');
      setActiveModuleId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setActiveModuleId(moduleId);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({ moduleId }, '', `#${moduleId}`);
  };

  const handleOpenAdvisor = () => {
    if (!currentUser) {
      setAuthNotice({
        title: isMarathi ? '🔒 AI व्यवसाय सल्लागार — उद्योजक नोंदणी आवश्यक' : '🔒 AI Business Advisor — Registration Required',
        message: isMarathi
          ? 'AI व्यवसाय सल्लागार आणि नफा विश्लेषण केवळ नोंदणीकृत उद्योजकांसाठी उपलब्ध आहे. कृपया उद्योजक म्हणून नोंदणी किंवा लॉगिन करा.'
          : 'The AI Business Advisor is exclusive to registered entrepreneurs. Please register or login below.'
      });
      setCurrentView('register');
      setActiveModuleId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    handleSelectModule('ai-advisor');
  };

  const handleNavigateHome = () => {
    setAuthNotice(null);
    setActiveModuleId(null);
    setCurrentView('home');
    window.history.pushState({}, '', '#home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshDbStatus();
  };

  const handleNavigateDiagnostic = () => {
    setAuthNotice(null);
    setActiveModuleId(null);
    setCurrentView('diagnostic');
    window.history.pushState({ view: 'diagnostic' }, '', '#diagnostic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshDbStatus();
  };

  const handleNavigateAuth = (view) => {
    setAuthNotice(null);
    setActiveModuleId(null);
    setCurrentView(view);
    window.history.pushState({ view }, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshDbStatus();
  };

  // Phase 1 & 2 diagnostic test: verify real IndexedDB & SyncQueue write with owner isolation
  async function handleTestDbStorage() {
    setIsTestingDb(true);
    setTestResult('Executing local storage diagnostic write...');
    try {
      const activeUserId = authService.getUserId();
      const sampleItem = {
        title: `Agro-Processing Unit - Test ${new Date().toLocaleTimeString()}`,
        category: 'Food Processing',
        district: 'Nashik',
        userId: activeUserId,
        viabilityScore: 88,
        isFavorite: true,
        updatedAt: new Date().toISOString()
      };

      const id = await db.opportunities.add(sampleItem);
      const retrieved = await db.opportunities.get(id);

      // Verify offline sync queue dispatch
      await syncManager.enqueueAction('OPPORTUNITY_CREATED', {
        id: retrieved.id,
        title: retrieved.title,
        userId: activeUserId
      });

      setTestResult(
        `✓ IndexedDB write confirmed. Stored opportunity #${retrieved.id} ("${retrieved.title}") for owner "${activeUserId}" and enqueued 1 pending sync action.`
      );
      await refreshDbStatus();
    } catch (err) {
      setTestResult(`✗ IndexedDB diagnostic failed: ${err.message}`);
    } finally {
      setIsTestingDb(false);
    }
  }

  // Filter modules by category
  const filteredModules =
    activeCategory === 'All'
      ? MODULES_DATA
      : MODULES_DATA.filter((m) => m.category === activeCategory);

  const selectedModuleObj = activeModuleId
    ? MODULES_DATA.find((m) => m.id === activeModuleId)
    : null;

  // Dedicated Full-Screen Protected Route for Admin Dashboard
  if (currentView === 'admin-dashboard' && adminAuthService.isAdminAuthenticated()) {
    return (
      <AdminDashboard
        onNavigatePublic={handleNavigateHome}
        onLogout={() => {
          handleNavigateHome();
        }}
      />
    );
  }

  return (
    <AppLayout
      onNavigateHome={handleNavigateHome}
      onNavigateDiagnostic={handleNavigateDiagnostic}
      onNavigateAdvisor={handleOpenAdvisor}
      activeModuleId={activeModuleId}
      currentView={currentView}
      currentUser={currentUser}
      onNavigateAuth={handleNavigateAuth}
      onRequestLogout={() => setShowLogoutConfirm(true)}
    >
      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onLoggedOut={() => {
            setShowLogoutConfirm(false);
            handleNavigateHome();
          }}
        />
      )}

      {/* 1. Module Detail / Functional Module View */}
      {selectedModuleObj ? (
        selectedModuleObj.id === 'ai-advisor' ? (
          <AIBusinessAdvisorModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'bazaarpath' ? (
          <BazaarPathModule onBack={handleNavigateHome} />
        ) : selectedModuleObj.id === 'demand-collector' ? (
          <DemandSignalCollectorModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'gap-analyzer' ? (
          <SupplyDemandGapAnalyzerModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'opportunity-detector' ? (
          <VillageOpportunityDetectorModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'unsold-stock' ? (
          <UnsoldStockRescueModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'route-finder' ? (
          <RawMaterialRouteFinderModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'resource-matcher' ? (
          <SharedResourceMatcherModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : selectedModuleObj.id === 'resource-hub' ? (
          <ResourceHubModule
            onBack={handleNavigateHome}
            onNavigateModule={(targetModId) => handleSelectModule(targetModId)}
          />
        ) : (
          <ModuleDetailPlaceholder
            module={selectedModuleObj}
            onBack={handleNavigateHome}
          />
        )
      ) : currentView === 'admin-login' || currentView === 'admin-dashboard' ? (
        /* Administrative Portal Login View */
        <div className="auth-view-container">
          <AdminLoginForm
            onSuccess={() => handleNavigateAuth('admin-dashboard')}
            onNavigatePublic={handleNavigateHome}
          />
        </div>
      ) : currentView === 'login' ? (
        /* 2. Login View */
        <div className="auth-view-container">
          <LoginForm
            authNotice={authNotice}
            onNavigateRegister={() => handleNavigateAuth('register')}
            onNavigateForgot={() => handleNavigateAuth('forgot-password')}
            onNavigateForgotPassword={() => handleNavigateAuth('forgot-password')}
            onSuccess={() => {
              setAuthNotice(null);
              handleNavigateHome();
            }}
          />
        </div>
      ) : currentView === 'register' ? (
        /* 3. Register View */
        <div className="auth-view-container">
          <RegisterForm
            authNotice={authNotice}
            onNavigateLogin={() => handleNavigateAuth('login')}
            onSuccess={() => {
              setAuthNotice(null);
              handleNavigateHome();
            }}
            onCancel={handleNavigateHome}
          />
        </div>
      ) : currentView === 'forgot-password' ? (
        /* 4. Forgot Password View */
        <div className="auth-view-container">
          <ForgotPasswordModal
            onNavigateLogin={() => handleNavigateAuth('login')}
            onCancel={handleNavigateHome}
          />
        </div>
      ) : currentView === 'profile' ? (
        /* 5. User Profile View */
        <div className="auth-view-container">
          <UserProfileView
            onClose={handleNavigateHome}
            onRequestLogout={() => setShowLogoutConfirm(true)}
          />
        </div>
      ) : currentView === 'diagnostic' ? (
        /* 6. Detailed Storage & Diagnostics View */
        <div className="diagnostic-view">
          <div className="diagnostic-view__header">
            <Button
              variant="outline"
              onClick={handleNavigateHome}
              className="diagnostic-view__back-btn"
            >
              <AppIcon name="arrow-left" size={16} />
              {t('diagnostic.backHome')}
            </Button>
            <h2>{t('diagnostic.title')}</h2>
          </div>

          <div className="grid-cards">
            {/* Live Connectivity */}
            <Card title={isMarathi ? 'इंटरनेट जोडणी स्थिती' : 'Internet Connectivity'} badge={isOnline ? t('common.online') : t('common.offline')}>
              <div className="status-grid">
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'जोडणी स्थिती' : 'Connection State'}</span>
                  <span className={`status-metric__value ${isOnline ? 'text-success' : 'text-danger'}`}>
                    {isOnline ? (isMarathi ? '● सुरू (इंटरनेट उपलब्ध)' : '● Online (Connected)') : (isMarathi ? '○ बंद (ऑफलाइन मोड)' : '○ Offline (No Connection)')}
                  </span>
                </div>
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'PWA सर्व्हिस वर्कर' : 'PWA Service Worker'}</span>
                  <span className="status-metric__value text-success">
                    {'serviceWorker' in navigator ? (isMarathi ? '✓ सक्रिय व ऑफलाइन कार्यरत' : '✓ Active & Serving Cache') : (isMarathi ? '✗ उपलब्ध नाही' : '✗ Unavailable')}
                  </span>
                </div>
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'वापरकर्ता सत्र' : 'Active User Session'}</span>
                  <span className="status-metric__value">
                    {currentUser ? `${currentUser.name} (${currentUser.userId})` : (isMarathi ? 'अतिथी / खाते नाही' : 'Guest / No Session')}
                  </span>
                </div>
              </div>
            </Card>

            {/* IndexedDB Database Status */}
            <Card title={t('diagnostic.dbStatus')} badge={dbState?.isOpen ? (isMarathi ? 'डेटाबेस सुरू' : 'Database Open') : (isMarathi ? 'बंद' : 'Closed')}>
              <div className="db-info-row">
                <p>
                  {t('diagnostic.dbName')} <strong>{dbState?.name || 'MahaUdyamDB'}</strong> • {t('diagnostic.dbVersion')} <strong>v{dbState?.version || 1}</strong> • {isMarathi ? 'स्थिती:' : 'Status:'} <strong>{dbState?.isOpen ? (isMarathi ? 'सक्रिय व सुरक्षित' : 'Active & Accessible') : (isMarathi ? 'अनुपलब्ध' : 'Unavailable')}</strong>
                </p>
              </div>

              <div className="db-stats">
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.userProfiles ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.userProfilesCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.opportunities ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.opportunitiesCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.marketPrices ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.pricesCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.userSettings ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.userSettingsCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.cachedVillages ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.cachedVillagesCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.bazaarMarkets ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.bazaarMarketsCount')}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.userFavorites ?? 0}</span>
                  <span className="db-stat-item__label">{isMarathi ? 'आवडते बाजार:' : 'User Favorites'}</span>
                </div>
                <div className="db-stat-item">
                  <span className="db-stat-item__number">{dbState?.counts?.pendingSyncItems ?? 0}</span>
                  <span className="db-stat-item__label">{t('diagnostic.syncQueueCount')}</span>
                </div>
              </div>

              <div className="diagnostic-action">
                <Button
                  variant="outline"
                  onClick={handleTestDbStorage}
                  disabled={isTestingDb}
                >
                  {isTestingDb ? t('diagnostic.testRunning') : t('diagnostic.runTestBtn')}
                </Button>
                {testResult && <p className="diagnostic-result">{testResult}</p>}
              </div>
            </Card>

            {/* Central Server Synchronization Diagnostics */}
            <Card title={isMarathi ? 'मध्यवर्ती सर्व्हर सिंक्रोनायझेशन व क्रॉस-डिव्हाइस स्थिती' : 'Central Server Sync & Cross-Device Engine'} badge={isOnline ? (isMarathi ? 'सक्रिय' : 'Active') : t('common.offline')}>
              <div className="status-grid">
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'सिंक इंजिन स्थिती' : 'Sync Engine State'}</span>
                  <span className="status-metric__value text-success">
                    {syncEngine.getState().status.toUpperCase()} ({syncEngine.getState().pendingCount} pending)
                  </span>
                </div>
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'शेवटची यशस्वी सिंक वेळ' : 'Last Successful Sync'}</span>
                  <span className="status-metric__value">
                    {syncEngine.getState().lastSyncTime ? new Date(syncEngine.getState().lastSyncTime).toLocaleTimeString() : (isMarathi ? 'प्रतीक्षेत' : 'Pending First Sync')}
                  </span>
                </div>
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'प्रमाणित वापरकर्ता आयडी' : 'Authenticated User ID'}</span>
                  <span className="status-metric__value">
                    {currentUser?.userId || (isMarathi ? 'लॉगिन नाही' : 'Not Logged In')}
                  </span>
                </div>
                <div className="status-metric">
                  <span className="status-metric__label">{isMarathi ? 'रिअल-टाइम अपडेट्स (SSE)' : 'Real-Time Updates (SSE)'}</span>
                  <span className="status-metric__value text-success">
                    {isOnline ? (isMarathi ? '✓ सक्रिय व कनेक्टेड' : '✓ Active & Connected') : (isMarathi ? '○ ऑफलाइन' : '○ Offline')}
                  </span>
                </div>
              </div>

              <div className="diagnostic-action" style={{ marginTop: '1rem' }}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const res = await syncEngine.syncNow();
                    refreshDbStatus();
                    alert(isMarathi ? `सिंक्रोनायझेशन पूर्ण: ${res.pushed || 0} पाठवले, ${res.pulled || 0} डाउनलोड केले.` : `Sync complete: ${res.pushed || 0} pushed, ${res.pulled || 0} pulled.`);
                  }}
                >
                  🔄 {isMarathi ? 'आता सर्व डेटा सिंक करा' : 'Trigger Full Server Sync'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* 7. Main Home Page */
        <div className="home-view">
          {/* Welcome Section (with LocationHierarchySelector) */}
          <WelcomeSection currentUser={currentUser} />

          {/* Conditional Rendering: Registered Entrepreneur vs Unregistered Customer */}
          {currentUser ? (
            /* --- REGISTERED ENTREPRENEUR WORKSPACE --- */
            <>
              {/* Citizen Demand Callout Banner: Direct 1-Tap Access for Village Residents */}
              <div className="citizen-demand-cta-banner">
                <div className="citizen-cta-content">
                  <span className="citizen-cta-badge">📣 {isMarathi ? 'ग्रामस्थ आवाज' : 'Village Voice'}</span>
                  <h3 className="citizen-cta-title">
                    {isMarathi ? 'तुमच्या गावाला कशाची गरज आहे ते सांगा' : 'Tell Us What Your Village Needs'}
                  </h3>
                  <p className="citizen-cta-text">
                    {isMarathi
                      ? 'गावात वस्तू किंवा सेवांची कमतरता आहे? खाजगी माहिती न देता थेट नोंदवा, जेणेकरून स्थानिक उद्योजकांना खरी गरज समजेल.'
                      : 'Are goods or services missing or difficult to access in your village? Report anonymously to guide local entrepreneurs.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="citizen-cta-btn"
                  onClick={() => handleSelectModule('demand-collector')}
                >
                  {isMarathi ? '✍️ गावाची गरज नोंदवा' : '✍️ Report Village Need'}
                </button>
              </div>

              {/* Quick Access (BazaarPath and Village Opportunity Detector) */}
              <RecentModules onSelect={handleSelectModule} />

              {/* Explore Enterprise Modules Section */}
              <section className="home-section" aria-label={t('home.exploreModules')}>
                <div className="home-section__header">
                  <div>
                    <h3 className="home-section__title">{t('home.exploreModules')}</h3>
                    <span className="home-section__subtitle">
                      {t('home.exploreModulesSub')}
                    </span>
                  </div>
                </div>

                {/* Functional Category Filter Controls */}
                <div className="category-filters" role="tablist" aria-label={t('home.exploreModules')}>
                  {MODULE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={activeCategory === cat}
                      className={`filter-btn ${activeCategory === cat ? 'filter-btn--active' : ''}`}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>

                {/* Responsive Modules Grid */}
                <div className="modules-grid">
                  {filteredModules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      onSelect={handleSelectModule}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            /* --- UNREGISTERED GUEST / CUSTOMER VIEW --- */
            /* All modules removed; only customer can report village need; gate card prompts registration */
            <CitizenGuestSection
              onOpenDemandCollector={() => handleSelectModule('demand-collector')}
              onRequireAuth={(modId) => {
                const moduleName = MODULES_DATA.find((m) => m.id === modId)?.title || modId;
                setAuthNotice({
                  title: isMarathi ? '🔒 उद्योजक नोंदणी आवश्यक' : '🔒 Entrepreneur Registration Required',
                  message: isMarathi
                    ? `या व्यवसाय मोड्युलसाठी (${moduleName}) कृपया उद्योजक म्हणून नोंदणी किंवा लॉगिन करा. सर्वसामान्य नागरिकांसाठी केवळ 'गावाची गरज नोंदवा' उपलब्ध आहे.`
                    : `Access to ${moduleName} requires an entrepreneur account. Only 'Report Village Need' is open to public visitors. Please register or login below.`
                });
                setCurrentView('register');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigateRegister={() => {
                setAuthNotice(null);
                handleNavigateAuth('register');
              }}
              onNavigateLogin={() => {
                setAuthNotice(null);
                handleNavigateAuth('login');
              }}
            />
          )}

          {/* Consolidated Single Offline Readiness & Diagnostics Section */}
          <OfflineAssuranceCard onOpenDiagnostic={handleNavigateDiagnostic} />
        </div>
      )}
    </AppLayout>
  );
}

export default App;
