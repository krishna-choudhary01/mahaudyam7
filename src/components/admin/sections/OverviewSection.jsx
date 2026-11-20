import React, { useState, useEffect } from 'react';
import { marketManagementService } from '../../../services/admin/marketManagementService.js';
import { AppIcon } from '../../common/Icons.jsx';
import { useLanguage } from '../../../i18n/index.js';

export function OverviewSection({ onNavigateTab }) {
  const { t, isMarathi } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await marketManagementService.getDashboardStatistics();
      setStats(data);
    } catch (e) {
      console.warn('Failed to load dashboard statistics', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.overview')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'महाराष्ट्र राज्य अधिकृत आठवडे बाजार, कृषी उत्पन्न बाजार व नागरिक सूचनांची सद्यस्थिती'
              : 'Real-time governance overview of weekly markets, APMC mandis, and field submissions'}
          </p>
        </div>
        <button
          type="button"
          className="btn-mini btn-mini--primary"
          onClick={loadStats}
          disabled={loading}
        >
          🔄 {t('admin.actions.refresh')}
        </button>
      </div>

      {/* Real Statistics Metric Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon--green">
            <AppIcon name="market" size={24} color="#1b5e20" />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats ? stats.totalMarkets : '—'}</span>
            <span className="stat-label">{t('admin.stats.totalMarkets')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon--blue">
            <AppIcon name="check" size={24} color="#0277bd" />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats ? stats.verifiedMarkets : '—'}</span>
            <span className="stat-label">{t('admin.stats.verifiedMarkets')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon--amber">
            <AppIcon name="clock" size={24} color="#f57f17" />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats ? stats.pendingVerification : '—'}</span>
            <span className="stat-label">{t('admin.stats.pendingVerification')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon--red">
            <AppIcon name="close" size={24} color="#c62828" />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats ? stats.rejectedRecords : '—'}</span>
            <span className="stat-label">{t('admin.stats.rejectedRecords')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon--gray">
            <AppIcon name="database" size={24} color="#455a64" />
          </div>
          <div className="stat-info">
            <span className="stat-number">{stats ? stats.inactiveMarkets : '—'}</span>
            <span className="stat-label">{t('admin.stats.inactiveMarkets')}</span>
          </div>
        </div>
      </div>

      {/* Quick Action CTAs */}
      <div className="admin-card">
        <h3 className="admin-card__title">
          {isMarathi ? 'प्रशासकीय कृती शॉर्टकट' : 'Administrative Quick Actions'}
        </h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-mini btn-mini--primary"
            onClick={() => onNavigateTab('add-market')}
          >
            ➕ {t('admin.nav.addNewMarket')}
          </button>
          <button
            type="button"
            className="btn-mini"
            onClick={() => onNavigateTab('market-management')}
          >
            📋 {t('admin.nav.marketManagement')}
          </button>
          <button
            type="button"
            className="btn-mini"
            onClick={() => onNavigateTab('submissions')}
          >
            📥 {t('admin.nav.submissions')} ({stats ? stats.pendingVerification : 0})
          </button>
          <button
            type="button"
            className="btn-mini"
            onClick={() => onNavigateTab('locations')}
          >
            📍 {t('admin.nav.locations')}
          </button>
        </div>
      </div>

      {/* Recently Updated Markets Table */}
      <div className="admin-card">
        <h3 className="admin-card__title">{t('admin.stats.recentlyUpdated')}</h3>
        {stats && stats.recentlyUpdated && stats.recentlyUpdated.length > 0 ? (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.table.marketName')}</th>
                  <th>{t('admin.table.district')}</th>
                  <th>{t('admin.table.taluka')}</th>
                  <th>{t('admin.table.operatingDay')}</th>
                  <th>{t('admin.table.status')}</th>
                  <th>{t('admin.table.lastUpdated')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentlyUpdated.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{isMarathi ? (m.name_mr || m.name) : m.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6e7a72' }}>ID: {m.id}</div>
                    </td>
                    <td>{m.district}</td>
                    <td>{m.taluka}</td>
                    <td>{m.operatingDay}</td>
                    <td>
                      <span className={`status-pill badge-${m.verificationStatus || 'pending'}`}>
                        {t(`admin.status.${m.verificationStatus || 'pending_verification'}`)}
                      </span>
                    </td>
                    <td>
                      {m.lastUpdated ? new Date(m.lastUpdated).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#6e7a72', fontSize: '0.875rem' }}>
            {isMarathi ? 'कोणतीही नोंद उपलब्ध नाही.' : 'No recent updates available.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default OverviewSection;
