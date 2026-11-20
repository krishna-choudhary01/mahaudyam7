import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useLanguage } from '../../i18n';
import './OfflineBanner.css';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { t } = useLanguage();

  return (
    <div
      className={`offline-banner ${isOnline ? 'offline-banner--online' : 'offline-banner--offline'}`}
      role="status"
      aria-live="polite"
    >
      <div className="offline-banner__content">
        <span className="offline-banner__indicator" aria-hidden="true" />
        <span className="offline-banner__text">
          {isOnline ? t('sync.bannerOnline') : t('sync.bannerOffline')}
        </span>
      </div>
    </div>
  );
}
