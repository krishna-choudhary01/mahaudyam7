import React, { useState, useEffect } from 'react';
import { demandSignalService } from '../../services/demand/demandSignalService.js';
import { MODERATION_STATUSES, DEMAND_CATEGORIES } from '../../data/demand/initialDemandSignals.js';
import { useLanguage } from '../../i18n/index.js';
import { adminAuthService } from '../../services/auth/adminAuthService.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';

export function DemandModerationSection() {
  const { t, isMarathi } = useLanguage();
  const currentAdmin = adminAuthService.getCurrentAdmin();
  const isAuthorized = adminAuthService.isAdminAuthenticated();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedReports, setSelectedReports] = useState(new Set());

  const loadReports = async () => {
    setLoading(true);
    try {
      const list = await demandSignalService.getRawReports({
        status: selectedStatus === 'all' ? undefined : selectedStatus
      });
      setReports(list);
    } catch (err) {
      console.warn('Could not load moderation reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [selectedStatus]);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await demandSignalService.updateReportStatus(
        reportId,
        newStatus,
        `Moderated by ${currentAdmin?.username || 'admin'}`
      );
      setActionMessage(t('demand.moderation.statusUpdatedMsg'));
      setTimeout(() => setActionMessage(''), 3000);
      loadReports();
    } catch (err) {
      alert(`Error updating report: ${err.message}`);
    }
  };

  const handleToggleSelect = (id) => {
    const updated = new Set(selectedReports);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedReports(updated);
  };

  const handleMergeSelected = async () => {
    const ids = Array.from(selectedReports);
    if (ids.length < 2) {
      alert(isMarathi ? 'कृपया विलीन करण्यासाठी किमान २ नोंदी निवडा.' : 'Please select at least 2 reports to merge.');
      return;
    }
    const [primaryId, ...duplicates] = ids;
    try {
      await demandSignalService.mergeReports(primaryId, duplicates);
      setSelectedReports(new Set());
      setActionMessage(isMarathi ? 'नोंदी यशस्वीरीत्या विलीन केल्या.' : 'Duplicate reports merged successfully.');
      setTimeout(() => setActionMessage(''), 3000);
      loadReports();
    } catch (err) {
      alert(`Merge error: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case MODERATION_STATUSES.VERIFIED_PATTERN:
        return <span className="status-badge status-badge--verified">✓ {isMarathi ? 'पडताळलेला प्रवाह' : 'Verified Pattern'}</span>;
      case MODERATION_STATUSES.REVIEWED:
        return <span className="status-badge status-badge--reviewed">👁️ {isMarathi ? 'तपासलेले' : 'Reviewed'}</span>;
      case MODERATION_STATUSES.REJECTED_SPAM:
        return <span className="status-badge status-badge--spam">🚫 {isMarathi ? 'स्पॅम / अवैध' : 'Rejected / Spam'}</span>;
      case MODERATION_STATUSES.ARCHIVED:
        return <span className="status-badge status-badge--archived">📁 {isMarathi ? 'पुराभिलेखित' : 'Archived'}</span>;
      default:
        return <span className="status-badge status-badge--pending">⏳ {isMarathi ? 'प्रलंबित' : 'Pending'}</span>;
    }
  };

  return (
    <div className="demand-moderation-section">
      <div className="moderation-header">
        <h3 className="moderation-title">{t('demand.moderation.title')}</h3>
        <p className="moderation-subtitle">{t('demand.moderation.subtitle')}</p>
      </div>

      {/* Mandatory Statutory Notice */}
      <div className="moderation-notice-card">
        <AppIcon name="shield" size={18} color="#2e7d32" />
        <span>{t('demand.moderation.notice')}</span>
      </div>

      {actionMessage && (
        <div className="action-feedback-banner">
          ✓ {actionMessage}
        </div>
      )}

      {/* Controls Bar */}
      <div className="moderation-controls-bar">
        <div className="filter-group">
          <label htmlFor="mod-status-filter" className="filter-label">
            {t('demand.moderation.filterStatus')}
          </label>
          <select
            id="mod-status-filter"
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">{isMarathi ? 'सर्व स्थिती' : 'All Statuses'}</option>
            <option value={MODERATION_STATUSES.PENDING}>{isMarathi ? 'प्रलंबित (Pending)' : 'Pending'}</option>
            <option value={MODERATION_STATUSES.REVIEWED}>{isMarathi ? 'तपासलेले (Reviewed)' : 'Reviewed'}</option>
            <option value={MODERATION_STATUSES.VERIFIED_PATTERN}>{isMarathi ? 'पडताळलेले (Verified Pattern)' : 'Verified Pattern'}</option>
            <option value={MODERATION_STATUSES.REJECTED_SPAM}>{isMarathi ? 'स्पॅम (Rejected Spam)' : 'Rejected Spam'}</option>
            <option value={MODERATION_STATUSES.ARCHIVED}>{isMarathi ? 'पुराभिलेखित (Archived)' : 'Archived'}</option>
          </select>
        </div>

        {selectedReports.size > 1 && (
          <Button variant="secondary" size="small" onClick={handleMergeSelected}>
            ⧉ {t('demand.moderation.mergeDuplicates')} ({selectedReports.size})
          </Button>
        )}
      </div>

      {/* Moderation Reports Table */}
      <div className="moderation-table-wrapper">
        {loading ? (
          <div className="mod-loading">
            <div className="spinner"></div>
            <p>{isMarathi ? 'नोंदी लोड होत आहेत...' : 'Loading moderation items...'}</p>
          </div>
        ) : reports.length === 0 ? (
          <Card className="mod-empty-card">
            <p>{isMarathi ? 'या फिल्टरमध्ये कोणत्याही नोंदी नाहीत.' : 'No records found for the selected filter.'}</p>
          </Card>
        ) : (
          <table className="moderation-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Select</th>
                <th>{isMarathi ? 'मागणी / सेवा' : 'Need / Service'}</th>
                <th>{isMarathi ? 'स्थान' : 'Location'}</th>
                <th>{isMarathi ? 'उपलब्धता / वारंवारता' : 'Availability & Freq'}</th>
                <th>{isMarathi ? 'नोंद दिनांक' : 'Reported'}</th>
                <th>{isMarathi ? 'स्थिती' : 'Status'}</th>
                <th>{isMarathi ? 'कृती' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((item) => (
                <tr key={item.id} className={selectedReports.has(item.id) ? 'row-selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedReports.has(item.id)}
                      onChange={() => handleToggleSelect(item.id)}
                      aria-label="Select report"
                    />
                  </td>
                  <td>
                    <strong>{isMarathi ? (item.productOrService_mr || item.productOrService) : item.productOrService}</strong>
                    <div className="item-notes">{item.additionalNotes || (isMarathi ? 'नोंद नाही' : 'No extra notes')}</div>
                  </td>
                  <td>
                    <span>{item.village || item.taluka}</span>
                    <div className="sub-loc">{item.taluka}, {item.district}</div>
                  </td>
                  <td>
                    <span className="badge-avail">{item.availability}</span>
                    <div className="sub-freq">⏱️ {item.frequency}</div>
                  </td>
                  <td>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {getStatusBadge(item.status)}
                  </td>
                  <td>
                    <div className="mod-actions-grid">
                      <button
                        type="button"
                        className="btn-mod-action btn-mod-action--review"
                        title={t('demand.moderation.markReviewed')}
                        onClick={() => handleUpdateStatus(item.id, MODERATION_STATUSES.REVIEWED)}
                      >
                        👁️
                      </button>
                      <button
                        type="button"
                        className="btn-mod-action btn-mod-action--verify"
                        title={t('demand.moderation.verifyPattern')}
                        onClick={() => handleUpdateStatus(item.id, MODERATION_STATUSES.VERIFIED_PATTERN)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-mod-action btn-mod-action--spam"
                        title={t('demand.moderation.flagSpam')}
                        onClick={() => handleUpdateStatus(item.id, MODERATION_STATUSES.REJECTED_SPAM)}
                      >
                        🚫
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
