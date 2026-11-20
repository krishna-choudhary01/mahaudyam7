import React from 'react';
import { Navbar } from '../common/Navbar';
import { OfflineBanner } from '../common/OfflineBanner';
import { SyncStatusBadge } from '../common/SyncStatusBadge';
import { FloatingAdvisorButton } from '../ai/FloatingAdvisorButton';
import './AppLayout.css';

export function AppLayout({
  children,
  onNavigateHome,
  onNavigateDiagnostic,
  onNavigateAdvisor,
  activeModuleId,
  currentView,
  currentUser,
  onNavigateAuth,
  onRequestLogout
}) {
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-to-content-link">
        Skip to main content
      </a>
      <Navbar
        onNavigateHome={onNavigateHome}
        onNavigateDiagnostic={onNavigateDiagnostic}
        onNavigateAdvisor={onNavigateAdvisor}
        activeModuleId={activeModuleId}
        currentView={currentView}
        currentUser={currentUser}
        onNavigateAuth={onNavigateAuth}
        onRequestLogout={onRequestLogout}
      />
      <OfflineBanner />

      <main id="main-content" className="app-layout__content container" tabIndex="-1">
        {children}
      </main>

      {/* Floating AI Business Advisor Trigger Button (visible to logged-in entrepreneurs on all modules/pages except the advisor itself) */}
      {currentUser && activeModuleId !== 'ai-advisor' && (
        <FloatingAdvisorButton
          onOpenAdvisor={onNavigateAdvisor}
          activeModuleId={activeModuleId}
        />
      )}

      <footer className="app-layout__footer">
        <div className="container footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <strong>MahaUdyam (महाउद्यम)</strong>
              <p>Offline-First Rural Entrepreneurship & Market Platform for Maharashtra</p>
            </div>
            <div className="footer-status-pill">
              <SyncStatusBadge />
            </div>
          </div>

          <div className="footer-links">
            <button
              type="button"
              className="footer-link-btn"
              onClick={onNavigateHome}
            >
              Explore All Modules
            </button>
            <span className="footer-sep">•</span>
            {currentUser ? (
              <>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigateAuth && onNavigateAuth('profile')}
                >
                  My Profile ({currentUser.name || 'User'})
                </button>
                <span className="footer-sep">•</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="footer-link-btn"
                  onClick={() => onNavigateAuth && onNavigateAuth('login')}
                >
                  Login / Register
                </button>
                <span className="footer-sep">•</span>
              </>
            )}
            <button
              type="button"
              className="footer-link-btn"
              onClick={onNavigateDiagnostic}
            >
              Storage & Sync Diagnostics
            </button>
            <span className="footer-sep">•</span>
            <button
              type="button"
              className="footer-link-btn"
              onClick={() => onNavigateAuth && onNavigateAuth('admin-login')}
              style={{ color: '#ffd54f' }}
            >
              🛡️ Admin Portal (प्रशासकीय कक्ष)
            </button>
          </div>

          <div className="footer-bottom">
            <p>
              Individual Engineering Idea Lab Project • Designed for low-bandwidth 2G/3G & unstable power zones.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
