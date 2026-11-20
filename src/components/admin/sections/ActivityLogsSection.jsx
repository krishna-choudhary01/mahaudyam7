import React, { useState, useEffect } from 'react';
import { adminAuthService } from '../../../services/auth/adminAuthService.js';
import { useLanguage } from '../../../i18n/index.js';

export function ActivityLogsSection() {
  const { t, isMarathi } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  const isSuperAdmin = adminAuthService.hasPermission('VIEW_AUDIT_LOGS');

  useEffect(() => {
    if (isSuperAdmin) {
      loadLogs();
    }
  }, [isSuperAdmin]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const list = await adminAuthService.getAuditLogs(100);
      setLogs(list);
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="admin-section">
        <div className="admin-card" style={{ borderColor: '#ffcdd2', backgroundColor: '#ffebee' }}>
          <h3 style={{ color: '#c62828' }}>🚫 Access Restricted</h3>
          <p>
            Audit Logs are restricted strictly to <strong>SUPER_ADMIN</strong>.
            Your active role does not possess the <code>VIEW_AUDIT_LOGS</code> permission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.auditLogs')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'प्रशासकीय कृती, पडताळणी, संपादन व लॉगिन इतिहासाच्या अपरिवर्तनीय नोंदी'
              : 'Tamper-evident audit trail of administrative modifications, verifications, and logins'}
          </p>
        </div>
        <button type="button" className="btn-mini" onClick={loadLogs}>
          🔄 Refresh Logs
        </button>
      </div>

      <div className="admin-card">
        <h3 className="admin-card__title">Security & Action Audit Trail</h3>
        <p style={{ fontSize: '0.8rem', color: '#6e7a72', marginBottom: '12px' }}>
          Every market creation, status transition, submission review, and login attempt is cryptographically tracked with administrative user identity.
        </p>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Role</th>
                <th>Action</th>
                <th>Record Type</th>
                <th>Target ID</th>
                <th>Result</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#6e7a72' }}>
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <strong>{log.adminUsername || log.adminId}</strong>
                    </td>
                    <td>
                      <span className="status-pill badge-draft">
                        {log.adminRole}
                      </span>
                    </td>
                    <td>
                      <code>{log.action}</code>
                    </td>
                    <td>{log.recordType}</td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#6e7a72' }}>{log.recordId}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${log.result === 'SUCCESS' ? 'badge-verified' : 'badge-rejected'}`}>
                        {log.result}
                      </span>
                    </td>
                    <td>
                      {(log.previousValue || log.newValue) && (
                        <button
                          type="button"
                          className="btn-mini"
                          onClick={() => setSelectedLog(log)}
                        >
                          Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Modal */}
      {selectedLog && (
        <div className="admin-backdrop" onClick={() => setSelectedLog(null)}>
          <div
            className="admin-card"
            style={{ maxWidth: '540px', margin: '40px auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Audit Event: {selectedLog.action}</h3>
              <button type="button" className="btn-mini" onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.85rem' }}>
              <strong>Admin:</strong> {selectedLog.adminUsername} ({selectedLog.adminRole}) • <strong>Target:</strong> {selectedLog.recordId}
            </p>
            {selectedLog.previousValue && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c62828' }}>Previous State:</span>
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', overflowX: 'auto' }}>
                  {selectedLog.previousValue}
                </pre>
              </div>
            )}
            {selectedLog.newValue && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1b5e20' }}>New State:</span>
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '0.75rem', overflowX: 'auto' }}>
                  {selectedLog.newValue}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogsSection;
