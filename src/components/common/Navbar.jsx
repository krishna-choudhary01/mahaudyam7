import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { SyncStatusBadge } from './SyncStatusBadge';
import { AppIcon } from './Icons';
import { useLanguage } from '../../i18n';
import { adminAuthService } from '../../services/auth/adminAuthService.js';
import './Navbar.css';

export function Navbar({
  onNavigateHome,
  onNavigateDiagnostic,
  onNavigateAdvisor,
  currentView,
  activeModuleId,
  currentUser,
  onNavigateAuth,
  onRequestLogout
}) {
  const { isOnline } = useOnlineStatus();
  const { language, setLanguage, t, isMarathi } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState(() => adminAuthService.getCurrentAdmin());

  useEffect(() => {
    const unsub = adminAuthService.subscribe((admin) => {
      setActiveAdmin(admin);
    });
    return () => unsub();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar__container">
        {/* Brand / Home trigger */}
        <button
          type="button"
          className="navbar__brand-btn"
          onClick={() => {
            onNavigateHome();
            closeMenu();
          }}
          aria-label={t('nav.brandTitle')}
        >
          <div className="navbar__logo">MU</div>
          <div className="navbar__titles">
            <span className="navbar__title">{t('nav.brandTitle')}</span>
            <span className="navbar__subtitle">{t('nav.brandSubtitle')}</span>
          </div>
        </button>

        {/* Desktop / Tablet Controls */}
        <div className="navbar__actions">
          {/* Prominent Bilingual Language Switcher */}
          <div className="navbar__lang-switcher" role="group" aria-label={t('nav.language')}>
            <button
              type="button"
              className={`lang-pill-btn ${language === 'en' ? 'lang-pill-btn--active' : ''}`}
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              title="Switch interface to English"
              aria-label="Switch interface to English"
            >
              English
            </button>
            <button
              type="button"
              className={`lang-pill-btn ${language === 'mr' ? 'lang-pill-btn--active' : ''}`}
              onClick={() => setLanguage('mr')}
              aria-pressed={language === 'mr'}
              title="संपूर्ण संकेतस्थळ मराठी भाषेत वापरा"
              aria-label="संपूर्ण संकेतस्थळ मराठी भाषेत वापरा"
            >
              मराठी
            </button>
          </div>

          <SyncStatusBadge />
          
          <div
            className={`navbar__network-badge ${isOnline ? 'badge--online' : 'badge--offline'}`}
            role="status"
            aria-label={`${t('common.info')}: ${isOnline ? t('nav.online') : t('nav.offline')}`}
          >
            <span className="status-dot" />
            <span className="network-label">{isOnline ? t('nav.online') : t('nav.offline')}</span>
          </div>

          {/* Prominent Global AI Advisor Button */}
          <button
            type="button"
            className={`navbar__ai-btn ${activeModuleId === 'ai-advisor' ? 'navbar__ai-btn--active' : ''}`}
            onClick={() => {
              if (onNavigateAdvisor) onNavigateAdvisor();
              closeMenu();
            }}
            title={isMarathi ? 'महाउद्यम व्यवसाय सल्लागार (AI Advisor)' : 'MahaUdyam AI Business Advisor'}
            aria-label="AI Business Advisor"
          >
            <span className="navbar__ai-icon">🎙️</span>
            <span className="navbar__ai-label">{isMarathi ? 'AI सल्लागार' : 'AI Advisor'}</span>
          </button>

          {/* User Account Pill or Login Button */}
          {currentUser ? (
            <button
              type="button"
              className={`navbar__user-btn ${currentView === 'profile' ? 'user-btn--active' : ''}`}
              onClick={() => {
                onNavigateAuth('profile');
                closeMenu();
              }}
              title={`${t('nav.loggedInAs')} ${currentUser.name || 'User'}`}
              aria-label={`${t('nav.myProfile')}: ${currentUser.name || 'User'}`}
            >
              <div className="user-avatar-mini">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="user-pill-name">
                {currentUser.name ? currentUser.name.split(' ')[0] : 'User'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="navbar__login-btn"
              onClick={() => {
                onNavigateAuth('login');
                closeMenu();
              }}
              aria-label={t('nav.loginOrRegister')}
            >
              <AppIcon name="lock" size={16} color="#ffffff" />
              <span className="login-btn-text">{t('nav.login')}</span>
            </button>
          )}

          {/* Admin Portal Indicator / Login */}
          {activeAdmin ? (
            <button
              type="button"
              className="navbar__admin-badge-btn"
              onClick={() => {
                onNavigateAuth('admin-dashboard');
                closeMenu();
              }}
              title={`Active Admin: ${activeAdmin.name} (${activeAdmin.role})`}
              aria-label="Admin Dashboard"
            >
              🛡️ {activeAdmin.role === 'SUPER_ADMIN' ? 'Super Admin' : activeAdmin.role}
            </button>
          ) : (
            <button
              type="button"
              className="navbar__admin-link-btn"
              onClick={() => {
                onNavigateAuth('admin-login');
                closeMenu();
              }}
              title="Official Administrative Portal Login"
              aria-label="Admin Portal"
            >
              🛡️ {isMarathi ? 'प्रशासक' : 'Admin'}
            </button>
          )}

          <button
            type="button"
            className="navbar__menu-toggle"
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            <AppIcon name={isMenuOpen ? 'close' : 'menu'} size={22} color="#ffffff" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Slide-down Menu */}
      {isMenuOpen && (
        <nav className="navbar__drawer" aria-label="Mobile navigation">
          <ul className="drawer__list">
            {/* Mobile Language Toggle Row */}
            <li className="drawer__lang-item">
              <div className="drawer__lang-header">
                <span className="drawer__lang-title">{t('nav.language')} / Language</span>
              </div>
              <div className="drawer__lang-buttons">
                <button
                  type="button"
                  className={`drawer__lang-btn ${language === 'en' ? 'drawer__lang-btn--active' : ''}`}
                  onClick={() => setLanguage('en')}
                  aria-pressed={language === 'en'}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`drawer__lang-btn ${language === 'mr' ? 'drawer__lang-btn--active' : ''}`}
                  onClick={() => setLanguage('mr')}
                  aria-pressed={language === 'mr'}
                >
                  मराठी
                </button>
              </div>
            </li>

            <li>
              <button
                type="button"
                className={`drawer__link ${currentView === 'home' ? 'drawer__link--active' : ''}`}
                onClick={() => {
                  onNavigateHome();
                  closeMenu();
                }}
              >
                <AppIcon name="market" size={18} />
                <span>{t('nav.homeAndModules')}</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className={`drawer__link ${activeModuleId === 'ai-advisor' ? 'drawer__link--active' : ''}`}
                onClick={() => {
                  if (onNavigateAdvisor) onNavigateAdvisor();
                  closeMenu();
                }}
              >
                <AppIcon name="advisor" size={18} />
                <span>{isMarathi ? 'महाउद्यम व्यवसाय सल्लागार (AI)' : 'AI Business Advisor'}</span>
              </button>
            </li>

            {currentUser ? (
              <>
                <li>
                  <button
                    type="button"
                    className={`drawer__link ${currentView === 'profile' ? 'drawer__link--active' : ''}`}
                    onClick={() => {
                      onNavigateAuth('profile');
                      closeMenu();
                    }}
                  >
                    <AppIcon name="database" size={18} />
                    <span>{t('nav.myProfile')}: {currentUser.name || 'User'}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="drawer__link drawer__link--logout"
                    onClick={() => {
                      closeMenu();
                      if (onRequestLogout) onRequestLogout();
                    }}
                  >
                    <AppIcon name="close" size={18} color="#ff8a80" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button
                    type="button"
                    className={`drawer__link ${currentView === 'login' ? 'drawer__link--active' : ''}`}
                    onClick={() => {
                      onNavigateAuth('login');
                      closeMenu();
                    }}
                  >
                    <AppIcon name="lock" size={18} />
                    <span>{t('auth.loginBtn')}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`drawer__link ${currentView === 'register' ? 'drawer__link--active' : ''}`}
                    onClick={() => {
                      onNavigateAuth('register');
                      closeMenu();
                    }}
                  >
                    <AppIcon name="database" size={18} />
                    <span>{t('auth.registerBtn')}</span>
                  </button>
                </li>
              </>
            )}

            <li>
              <button
                type="button"
                className={`drawer__link ${currentView === 'diagnostic' ? 'drawer__link--active' : ''}`}
                onClick={() => {
                  onNavigateDiagnostic();
                  closeMenu();
                }}
              >
                <AppIcon name="analysis" size={18} />
                <span>{t('nav.diagnostic')}</span>
              </button>
            </li>

            <li style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '8px', paddingTop: '8px' }}>
              <button
                type="button"
                className={`drawer__link ${currentView.startsWith('admin') ? 'drawer__link--active' : ''}`}
                onClick={() => {
                  onNavigateAuth(activeAdmin ? 'admin-dashboard' : 'admin-login');
                  closeMenu();
                }}
                style={{ color: '#ffd54f' }}
              >
                <AppIcon name="lock" size={18} color="#ffd54f" />
                <span>
                  {activeAdmin
                    ? `🛡️ Admin: ${activeAdmin.name.split(' ')[0]} (${activeAdmin.role})`
                    : `🛡️ ${isMarathi ? 'प्रशासक पोर्टल प्रवेश' : 'Admin Portal Login'}`}
                </span>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
