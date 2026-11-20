import React, { useState, useEffect } from 'react';
import { getDbStatus } from '../../../services/db/index.js';
import { useLanguage } from '../../../i18n/index.js';

export function SettingsSection() {
  const { t, isMarathi } = useLanguage();
  const [dbState, setDbState] = useState(null);
  const [backendUrl, setBackendUrl] = useState(import.meta.env?.VITE_ADMIN_API_URL || 'http://localhost:8080');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    loadDb();
  }, []);

  const loadDb = async () => {
    const s = await getDbStatus();
    setDbState(s);
  };

  const handleTestBackend = async () => {
    setTestResult('Connecting to Central Spring Boot API...');
    try {
      const resp = await fetch(`${backendUrl}/api/v1/health`, { method: 'GET' }).catch(() => null);
      if (resp && resp.ok) {
        setTestResult(`✓ Central Backend Connected: ${backendUrl}`);
      } else {
        setTestResult(`○ Backend Offline / Not Yet Bound: Running in Offline-First Dexie Mode (Mock Provider Active).`);
      }
    } catch (e) {
      setTestResult(`○ Backend Unreachable: Using client-side IndexedDB persistence.`);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.settings')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'प्रणाली संरचना, स्थानिक IndexedDB डेटाबेस व केंद्रीय स्प्रिंग बूट बॅकएंड जोडणी'
              : 'System architecture, client-side database diagnostics, and central Spring Boot backend integration'}
          </p>
        </div>
      </div>

      {/* Central Backend Architecture Setting */}
      <div className="admin-card">
        <h3 className="admin-card__title">Central Java Spring Boot Backend Integration</h3>
        <p style={{ fontSize: '0.85rem', color: '#6e7a72', marginBottom: '12px' }}>
          MahaUdyam is built offline-first. When connected, central authoritative governance records synchronize with PostgreSQL.
        </p>

        <div className="form-group" style={{ maxWidth: '480px' }}>
          <label>Spring Boot REST API Endpoint</label>
          <input
            type="text"
            className="form-input"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://localhost:8080"
          />
        </div>

        <button
          type="button"
          className="btn-mini btn-mini--primary"
          onClick={handleTestBackend}
        >
          ⚡ Test Central Backend Connection
        </button>

        {testResult && (
          <p style={{ marginTop: '10px', fontSize: '0.85rem', color: testResult.startsWith('✓') ? '#1b5e20' : '#e65100' }}>
            {testResult}
          </p>
        )}
      </div>

      {/* Client-side IndexedDB Statistics */}
      <div className="admin-card">
        <h3 className="admin-card__title">Client-Side IndexedDB Storage Health</h3>
        {dbState ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
            <div><strong>Database Name:</strong> {dbState.name}</div>
            <div><strong>Schema Version:</strong> v{dbState.version}</div>
            <div><strong>Open Status:</strong> {dbState.isOpen ? '✓ Connected' : '✗ Closed'}</div>
            <div><strong>Weekly Markets:</strong> {dbState.counts?.bazaarMarkets ?? 0}</div>
            <div><strong>Admin Users:</strong> {dbState.counts?.adminUsers ?? 0}</div>
            <div><strong>Audit Logs:</strong> {dbState.counts?.auditLogs ?? 0}</div>
            <div><strong>Submissions:</strong> {dbState.counts?.marketSubmissions ?? 0}</div>
            <div><strong>Cached Villages:</strong> {dbState.counts?.cachedVillages ?? 0}</div>
          </div>
        ) : (
          <p>Loading database status...</p>
        )}
      </div>
    </div>
  );
}

export default SettingsSection;
