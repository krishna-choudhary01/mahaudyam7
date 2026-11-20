import React, { useState, useEffect } from 'react';
import { marketManagementService, OPERATING_DAYS, VERIFICATION_STATUSES } from '../../../services/admin/marketManagementService.js';
import { locationService } from '../../../services/location/locationService.js';
import { adminAuthService } from '../../../services/auth/adminAuthService.js';
import { useLanguage } from '../../../i18n/index.js';

export function MarketManagementSection({ onEditMarket, onAddNew }) {
  const { t, isMarathi } = useLanguage();
  const [markets, setMarkets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedMarketForView, setSelectedMarketForView] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const districts = locationService.getAllDistricts();

  useEffect(() => {
    loadMarkets();
  }, [page, search, selectedDistrict, selectedStatus, selectedDay]);

  const loadMarkets = async () => {
    setLoading(true);
    try {
      const res = await marketManagementService.getMarkets({
        search,
        districtCode: selectedDistrict,
        status: selectedStatus,
        operatingDay: selectedDay,
        page,
        limit: 15
      });
      setMarkets(res.items);
      setTotal(res.total);
    } catch (e) {
      console.warn('Failed to load markets', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (marketId, newStatus) => {
    try {
      const res = await marketManagementService.setMarketStatus(marketId, newStatus);
      if (res.success) {
        setActionMessage(isMarathi ? 'बाजार स्थिती अद्यतनित झाली.' : 'Market status updated successfully.');
        setTimeout(() => setActionMessage(''), 3000);
        loadMarkets();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.marketManagement')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'सर्व अधिकृत बाजार नोंदींचे व्यवस्थापन, पडताळणी, संपादन व नियंत्रण'
              : 'Add, verify, update, and manage official market records throughout Maharashtra'}
          </p>
        </div>
        <button
          type="button"
          className="btn-mini btn-mini--primary"
          onClick={onAddNew}
        >
          ➕ {t('admin.nav.addNewMarket')}
        </button>
      </div>

      {actionMessage && (
        <div className="admin-alert admin-alert--info">
          <span>✓ {actionMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-card">
        <div className="filter-bar">
          <div className="search-input-box">
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('admin.actions.search')}
            />
          </div>

          <select
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }}
            aria-label={t('admin.table.district')}
          >
            <option value="all">{isMarathi ? 'सर्व जिल्हे (३६)' : 'All Districts (36)'}</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>
                {isMarathi ? d.marathiName : d.name} (LGD {d.code})
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            aria-label={t('admin.table.status')}
          >
            <option value="all">{isMarathi ? 'सर्व स्थिती' : 'All Statuses'}</option>
            {VERIFICATION_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {isMarathi ? s.label_mr : s.label_en}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedDay}
            onChange={(e) => { setSelectedDay(e.target.value); setPage(1); }}
            aria-label={t('admin.table.operatingDay')}
          >
            <option value="all">{isMarathi ? 'सर्व वार' : 'All Operating Days'}</option>
            {OPERATING_DAYS.map((d) => (
              <option key={d} value={d}>
                {t(`bazaar.calendar.days.${d}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Markets Table */}
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.table.marketName')}</th>
                <th>{t('admin.table.district')}</th>
                <th>{t('admin.table.taluka')}</th>
                <th>{t('admin.table.marketType')}</th>
                <th>{t('admin.table.operatingDay')}</th>
                <th>{t('admin.table.status')}</th>
                <th>{t('admin.table.lastUpdated')}</th>
                <th>{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px' }}>
                    {t('common.loading')}
                  </td>
                </tr>
              ) : markets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#6e7a72' }}>
                    {isMarathi ? 'कोणतेही बाजार सापडले नाहीत.' : 'No markets matching the filter criteria.'}
                  </td>
                </tr>
              ) : (
                markets.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{isMarathi ? (m.name_mr || m.name) : m.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#6e7a72' }}>ID: {m.id}</div>
                    </td>
                    <td>{m.district}</td>
                    <td>{m.taluka}</td>
                    <td style={{ fontSize: '0.8rem' }}>{m.marketType || 'Weekly Bazaar'}</td>
                    <td>{t(`bazaar.calendar.days.${m.operatingDay}`) || m.operatingDay}</td>
                    <td>
                      <span className={`status-pill badge-${m.verificationStatus || 'pending'}`}>
                        {t(`admin.status.${m.verificationStatus || 'pending_verification'}`)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {m.lastUpdated ? new Date(m.lastUpdated).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-mini"
                          onClick={() => setSelectedMarketForView(m)}
                        >
                          👁️ {t('admin.actions.view')}
                        </button>
                        <button
                          type="button"
                          className="btn-mini btn-mini--primary"
                          onClick={() => onEditMarket(m)}
                        >
                          ✏️ {t('admin.actions.edit')}
                        </button>
                        {m.verificationStatus !== 'verified' && (
                          <button
                            type="button"
                            className="btn-mini"
                            style={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                            onClick={() => handleStatusChange(m.id, 'verified')}
                          >
                            ✓ {t('admin.actions.verify')}
                          </button>
                        )}
                        {m.verificationStatus !== 'inactive' ? (
                          <button
                            type="button"
                            className="btn-mini btn-mini--danger"
                            onClick={() => handleStatusChange(m.id, 'inactive')}
                          >
                            ✕ {t('admin.actions.deactivate')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-mini"
                            onClick={() => handleStatusChange(m.id, 'verified')}
                          >
                            ↺ {t('admin.actions.reactivate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '0.85rem', color: '#6e7a72' }}>
            {isMarathi ? `एकूण: ${total} बाजार` : `Total: ${total} markets`}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-mini"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← {isMarathi ? 'मागे' : 'Previous'}
            </button>
            <span style={{ fontSize: '0.85rem', padding: '4px 8px' }}>
              {page}
            </span>
            <button
              type="button"
              className="btn-mini"
              disabled={page * 15 >= total}
              onClick={() => setPage(page + 1)}
            >
              {isMarathi ? 'पुढे' : 'Next'} →
            </button>
          </div>
        </div>
      </div>

      {/* Market View Modal */}
      {selectedMarketForView && (
        <div className="admin-backdrop" onClick={() => setSelectedMarketForView(null)}>
          <div
            className="admin-card"
            style={{ maxWidth: '600px', margin: '40px auto', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{selectedMarketForView.name}</h3>
              <button
                type="button"
                className="btn-mini"
                onClick={() => setSelectedMarketForView(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#6e7a72', marginBottom: '12px' }}>
              ID: <code>{selectedMarketForView.id}</code>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.875rem' }}>
              <div><strong>{t('admin.table.district')}:</strong> {selectedMarketForView.district} (LGD {selectedMarketForView.districtCode})</div>
              <div><strong>{t('admin.table.taluka')}:</strong> {selectedMarketForView.taluka} (LGD {selectedMarketForView.talukaCode})</div>
              <div><strong>{t('admin.table.village')}:</strong> {selectedMarketForView.village || '—'}</div>
              <div><strong>{t('admin.table.operatingDay')}:</strong> {selectedMarketForView.operatingDay}</div>
              <div><strong>{t('admin.table.marketType')}:</strong> {selectedMarketForView.marketType}</div>
              <div><strong>Timings:</strong> {selectedMarketForView.timings || '—'}</div>
              <div><strong>Stall Fee:</strong> ₹{selectedMarketForView.stallFee || 0}</div>
              <div><strong>Coordinates:</strong> {selectedMarketForView.coordinates ? `${selectedMarketForView.coordinates.lat}, ${selectedMarketForView.coordinates.lng}` : '—'}</div>
              <div><strong>Verification Status:</strong> {selectedMarketForView.verificationStatus}</div>
              <div><strong>Verified By:</strong> {selectedMarketForView.verifiedBy || '—'}</div>
              <div><strong>Data Source:</strong> {selectedMarketForView.dataSource || '—'}</div>
              <div><strong>Last Updated:</strong> {new Date(selectedMarketForView.lastUpdated || Date.now()).toLocaleString()}</div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn-mini btn-mini--primary"
                onClick={() => {
                  const m = selectedMarketForView;
                  setSelectedMarketForView(null);
                  onEditMarket(m);
                }}
              >
                ✏️ Edit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketManagementSection;
