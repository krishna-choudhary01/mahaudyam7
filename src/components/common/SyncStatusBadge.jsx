import React, { useState, useEffect } from 'react';
import { syncEngine, SYNC_STATUS } from '../../services/offline/syncEngine';
import { AppIcon } from './Icons';
import { useLanguage } from '../../i18n';
import './SyncStatusBadge.css';

export function SyncStatusBadge({ onSyncComplete }) {
  const { isMarathi } = useLanguage();
  const [syncState, setSyncState] = useState(() => syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (syncState.status === SYNC_STATUS.SYNCING) return;
    const res = await syncEngine.syncNow();
    if (onSyncComplete) onSyncComplete(res);
  };

  const getStatusLabel = () => {
    if (!syncState.isOnline) {
      return syncState.pendingCount > 0
        ? (isMarathi ? `ऑफलाइन (${syncState.pendingCount} स्थानिक)` : `Offline (${syncState.pendingCount} pending)`)
        : (isMarathi ? 'ऑफलाइन मोड' : 'Offline Mode');
    }

    switch (syncState.status) {
      case SYNC_STATUS.SYNCING:
        return isMarathi ? 'डेटा सिंक होत आहे...' : 'Syncing changes...';
      case SYNC_STATUS.FAILED:
        return isMarathi ? 'सिंक अयशस्वी (पुन्हा करा)' : 'Sync Failed (Retry)';
      case SYNC_STATUS.PENDING:
        return isMarathi ? `साठा: ${syncState.pendingCount} प्रलंबित` : `Storage: ${syncState.pendingCount} Pending`;
      case SYNC_STATUS.SYNCED:
      default:
        return isMarathi ? 'सर्व डेटा सुरक्षित व समक्रमित' : 'All Data Synced';
    }
  };

  const badgeClass = !syncState.isOnline
    ? 'sync-badge--offline'
    : syncState.status === SYNC_STATUS.SYNCING
    ? 'sync-badge--syncing'
    : syncState.status === SYNC_STATUS.FAILED
    ? 'sync-badge--failed'
    : syncState.pendingCount > 0
    ? 'sync-badge--pending'
    : 'sync-badge--synced';

  const iconName = syncState.status === SYNC_STATUS.SYNCING
    ? 'sync'
    : !syncState.isOnline
    ? 'cloud-off'
    : syncState.pendingCount > 0
    ? 'sync'
    : 'check';

  return (
    <div
      className={`sync-badge ${badgeClass}`}
      role="status"
      aria-live="polite"
      title={syncState.lastSyncTime ? `Last sync: ${new Date(syncState.lastSyncTime).toLocaleTimeString()}` : 'Sync engine active'}
    >
      <span className="sync-badge__icon">
        <AppIcon
          name={iconName}
          size={14}
          className={syncState.status === SYNC_STATUS.SYNCING ? 'sync-badge__spin' : ''}
        />
      </span>
      <span className="sync-badge__text">
        {getStatusLabel()}
      </span>
      {syncState.isOnline && syncState.status !== SYNC_STATUS.SYNCING && (
        <button
          type="button"
          className="sync-badge__action-btn"
          onClick={handleManualSync}
          aria-label={isMarathi ? 'माहिती सिंक करा' : 'Synchronize pending records now'}
        >
          {isMarathi ? 'सिंक करा' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}
