import React from 'react';
import { AppIcon } from '../common/Icons';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLanguage } from '../../i18n';
import './OfflineAssuranceCard.css';

export function OfflineAssuranceCard({ onOpenDiagnostic }) {
  const { isOnline } = useOnlineStatus();
  const { t, isMarathi } = useLanguage();

  return (
    <section className="offline-assurance" aria-label={t('home.offlineAssuranceTitle')}>
      <div className="offline-assurance__icon-col">
        <div className="offline-assurance__icon-wrap">
          <AppIcon name="cloud-off" size={28} color="#1b5e20" />
        </div>
      </div>
      <div className="offline-assurance__text-col">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="offline-assurance__title" style={{ margin: 0 }}>
            {t('home.offlineAssuranceTitle')}
          </h3>
          <span className="assurance-pill" style={{ background: '#e8f5e9', color: '#1b5e20', fontWeight: 700 }}>
            {isOnline ? (isMarathi ? '● ऑनलाइन सिंक सज्ज' : '● Online Sync Ready') : (isMarathi ? '○ ऑफलाइन कार्यरत' : '○ Operating Offline')}
          </span>
        </div>
        <p className="offline-assurance__desc">
          {t('home.offlineAssuranceDesc')}
        </p>
        <ul className="offline-assurance__list">
          <li>
            {t('home.offlinePoint1')}
          </li>
          <li>
            {t('home.offlinePoint2')}
          </li>
          <li>
            {t('home.offlinePoint3')}
          </li>
        </ul>
        <div className="offline-assurance__pills" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className="assurance-pill">{t('home.pillCoreCached')}</span>
            <span className="assurance-pill">{t('home.pillStorageActive')}</span>
          </div>
          {onOpenDiagnostic && (
            <button
              type="button"
              onClick={onOpenDiagnostic}
              style={{
                background: 'none',
                border: '1px solid #2e7d32',
                color: '#2e7d32',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isMarathi ? 'डेटाबेस डायग्नोस्टिक पॅनेल →' : 'Storage Diagnostics →'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
