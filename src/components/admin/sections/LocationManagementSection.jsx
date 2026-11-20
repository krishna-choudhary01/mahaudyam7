import React, { useState, useEffect } from 'react';
import { locationService } from '../../../services/location/locationService.js';
import { db } from '../../../services/db/index.js';
import { useLanguage } from '../../../i18n/index.js';

export function LocationManagementSection() {
  const { t, isMarathi } = useLanguage();
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [talukas, setTalukas] = useState([]);
  const [cachedDistrictMap, setCachedDistrictMap] = useState({});
  const [cachingStatus, setCachingStatus] = useState('');

  useEffect(() => {
    const list = locationService.getAllDistricts();
    setDistricts(list);
    checkCachedDistricts(list);
  }, []);

  const checkCachedDistricts = async (list) => {
    const map = {};
    for (const d of list) {
      const isCached = await locationService.isDistrictCached(d.code);
      map[d.code] = isCached;
    }
    setCachedDistrictMap(map);
  };

  const handleSelectDistrict = (d) => {
    setSelectedDistrict(d);
    const tList = locationService.getTalukasForDistrict(d.code);
    setTalukas(tList);
  };

  const handleCacheDistrict = async (dCode) => {
    setCachingStatus(`Downloading and caching district ${dCode} villages into IndexedDB...`);
    try {
      await locationService.refreshDistrict(dCode);
      setCachingStatus(`✓ District ${dCode} villages successfully stored offline.`);
      setTimeout(() => setCachingStatus(''), 4000);
      checkCachedDistricts(districts);
    } catch (e) {
      setCachingStatus(`✗ Failed to cache: ${e.message}`);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.locations')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'महाराष्ट्र राज्य अधिकृत ३६ जिल्हे, ३५८ तालुके व ४४,९२९ महसूल गावे स्थानिक साठा व्यवस्थापन'
              : 'Governance directory of 36 districts, 358 talukas, and 44,929 revenue villages with offline caching'}
          </p>
        </div>
      </div>

      {cachingStatus && (
        <div className="admin-alert admin-alert--info">
          <span>{cachingStatus}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-number">36</span>
            <span className="stat-label">Official Maharashtra Districts (LGD)</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-number">358</span>
            <span className="stat-label">Official Talukas / Sub-Districts</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-number">44,929</span>
            <span className="stat-label">Revenue Villages Mapped (100% Unique LGD)</span>
          </div>
        </div>
      </div>

      {/* Districts List & Offline Pre-cache Control */}
      <div className="admin-card">
        <h3 className="admin-card__title">
          {isMarathi ? 'जिल्हावार यादी व स्थानिक कॅश स्थिती' : 'Districts & Offline Pre-caching Status'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#6e7a72', marginBottom: '12px' }}>
          Districts can be pre-cached into IndexedDB so administrators and rural field officers can register markets and select villages even without cellular network.
        </p>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>LGD Code</th>
                <th>District (English)</th>
                <th>District (मराठी)</th>
                <th>Talukas</th>
                <th>Offline Cache Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d) => {
                const isCached = cachedDistrictMap[d.code];
                return (
                  <tr key={d.code} style={{ backgroundColor: selectedDistrict?.code === d.code ? '#f0f7f0' : 'transparent' }}>
                    <td><code>{d.code}</code></td>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.marathiName}</td>
                    <td>{d.talukaCount}</td>
                    <td>
                      <span className={`status-pill ${isCached ? 'badge-verified' : 'badge-pending'}`}>
                        {isCached ? '✓ Cached in IndexedDB' : '○ On-Demand Network'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-mini"
                          onClick={() => handleSelectDistrict(d)}
                        >
                          View Talukas ({d.talukaCount})
                        </button>
                        <button
                          type="button"
                          className="btn-mini btn-mini--primary"
                          onClick={() => handleCacheDistrict(d.code)}
                        >
                          📥 Cache Offline
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected District Talukas Drawer */}
      {selectedDistrict && (
        <div className="admin-card">
          <h3 className="admin-card__title">
            Talukas in {selectedDistrict.name} ({selectedDistrict.marathiName}) - {talukas.length} Talukas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {talukas.map((t) => (
              <div
                key={t.code}
                style={{
                  padding: '8px 12px',
                  background: '#f9fbf9',
                  border: '1px solid #d0d7d0',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}
              >
                <strong>{isMarathi ? t.marathiName : t.name}</strong>
                <div style={{ fontSize: '0.72rem', color: '#6e7a72' }}>
                  LGD: {t.code} • {isMarathi ? t.name : t.marathiName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationManagementSection;
