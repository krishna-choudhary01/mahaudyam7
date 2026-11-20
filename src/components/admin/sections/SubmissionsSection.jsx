import React, { useState, useEffect } from 'react';
import { marketManagementService } from '../../../services/admin/marketManagementService.js';
import { adminAuthService } from '../../../services/auth/adminAuthService.js';
import { useLanguage } from '../../../i18n/index.js';

export function SubmissionsSection() {
  const { t, isMarathi } = useLanguage();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [rejectModalSub, setRejectModalSub] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const list = await marketManagementService.getSubmissions(statusFilter);
      setSubmissions(list);
    } catch (e) {
      console.warn('Failed to load submissions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (sub) => {
    if (!window.confirm(`Approve submission "${sub.name}" and publish to official market directory?`)) {
      return;
    }
    try {
      const res = await marketManagementService.approveSubmission(sub.id);
      if (res.success) {
        setActionMessage(`✓ Approved "${sub.name}" and created official market.`);
        setTimeout(() => setActionMessage(''), 4000);
        loadSubmissions();
      } else {
        alert(res.error || 'Failed to approve submission.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    try {
      const res = await marketManagementService.rejectSubmission(rejectModalSub.id, rejectReason);
      if (res.success) {
        setActionMessage(`✓ Submission rejected. Reason recorded for audit.`);
        setRejectModalSub(null);
        setRejectReason('');
        setTimeout(() => setActionMessage(''), 4000);
        loadSubmissions();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.submissions')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'ग्रामीण उद्योजकांनी नोंदवलेल्या नवीन बाजार सूचनांची तपासणी व अधिकृत मंजुरी'
              : 'Review and verify field market suggestions submitted by rural entrepreneurs'}
          </p>
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Submissions</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {actionMessage && (
        <div className="admin-alert admin-alert--info">
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Submission ID</th>
                <th>Suggested Market</th>
                <th>District / Taluka</th>
                <th>Operating Day</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>
                    Loading submissions...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#6e7a72' }}>
                    {isMarathi ? 'सध्या कोणतीही प्रलंबित सूचना नाही.' : 'No market submissions found.'}
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td><code>{sub.id}</code></td>
                    <td>
                      <strong>{sub.name}</strong>
                      {sub.name_mr && <div style={{ fontSize: '0.75rem', color: '#6e7a72' }}>{sub.name_mr}</div>}
                    </td>
                    <td>{sub.district || '—'} / {sub.taluka || '—'}</td>
                    <td>{sub.operatingDay || '—'}</td>
                    <td>{sub.submittedByName || sub.userId || 'Guest Entrepreneur'}</td>
                    <td>
                      <span className={`status-pill badge-${sub.status || 'pending'}`}>
                        {sub.status || 'pending'}
                      </span>
                    </td>
                    <td>{new Date(sub.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-mini"
                          onClick={() => setSelectedSub(sub)}
                        >
                          👁️ View
                        </button>
                        {sub.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn-mini btn-mini--primary"
                              onClick={() => handleApprove(sub)}
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn-mini btn-mini--danger"
                              onClick={() => {
                                setRejectModalSub(sub);
                                setRejectReason('');
                              }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedSub && (
        <div className="admin-backdrop" onClick={() => setSelectedSub(null)}>
          <div
            className="admin-card"
            style={{ maxWidth: '560px', margin: '40px auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Submission: {selectedSub.name}</h3>
              <button type="button" className="btn-mini" onClick={() => setSelectedSub(null)}>✕</button>
            </div>
            <p><strong>District:</strong> {selectedSub.district} | <strong>Taluka:</strong> {selectedSub.taluka}</p>
            <p><strong>Village / Landmark:</strong> {selectedSub.village || selectedSub.address || '—'}</p>
            <p><strong>Operating Day:</strong> {selectedSub.operatingDay}</p>
            <p><strong>Categories:</strong> {selectedSub.productCategories?.join(', ') || '—'}</p>
            <p><strong>Evidence / Source:</strong> {selectedSub.source || 'Direct Field Observation'}</p>
            <p><strong>Status:</strong> {selectedSub.status}</p>
            {selectedSub.rejectionReason && (
              <p style={{ color: '#c62828' }}><strong>Rejection Reason:</strong> {selectedSub.rejectionReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalSub && (
        <div className="admin-backdrop" onClick={() => setRejectModalSub(null)}>
          <div
            className="admin-card"
            style={{ maxWidth: '500px', margin: '40px auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Reject Submission: {rejectModalSub.name}</h3>
            <p style={{ fontSize: '0.85rem', color: '#6e7a72' }}>
              Please record a verifiable reason for rejection. This will be preserved in the audit log.
            </p>
            <div className="form-group">
              <label>Rejection Reason *</label>
              <textarea
                className="form-textarea"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Inaccurate location, duplicate of existing verified market #mkt-490-..., or defunct market yard."
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-mini btn-mini--danger"
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
              <button
                type="button"
                className="btn-mini"
                onClick={() => setRejectModalSub(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmissionsSection;
