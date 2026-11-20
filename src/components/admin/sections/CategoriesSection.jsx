import React, { useState } from 'react';
import { DEFAULT_PRODUCT_CATEGORIES } from '../../../services/admin/marketManagementService.js';
import { adminAuthService } from '../../../services/auth/adminAuthService.js';
import { useLanguage } from '../../../i18n/index.js';

export function CategoriesSection() {
  const { t, isMarathi } = useLanguage();
  const [categories, setCategories] = useState(DEFAULT_PRODUCT_CATEGORIES);
  const [newCat, setNewCat] = useState('');
  const [msg, setMsg] = useState('');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCat.trim()) return;

    if (!adminAuthService.hasPermission('MANAGE_CATEGORIES')) {
      alert('Access Denied: You do not have permission to add categories.');
      return;
    }

    const trimmed = newCat.trim();
    if (categories.includes(trimmed)) {
      alert('Category already exists.');
      return;
    }

    setCategories([...categories, trimmed]);
    setNewCat('');
    setMsg(`✓ Added category "${trimmed}"`);
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{t('admin.nav.categories')}</h2>
          <p className="section-desc">
            {isMarathi
              ? 'आठवडे बाजार व कृषी उत्पन्न बाजारपेठांसाठी अधिकृत वस्तू व शेतमाल वर्ग व्यवस्थापन'
              : 'Authorized market trading commodity and product category governance'}
          </p>
        </div>
      </div>

      {msg && (
        <div className="admin-alert admin-alert--info">
          <span>{msg}</span>
        </div>
      )}

      <div className="admin-card">
        <h3 className="admin-card__title">
          {isMarathi ? 'सक्रिय शेतमाल व वस्तू वर्ग' : 'Active Product & Commodity Categories'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#6e7a72', marginBottom: '16px' }}>
          Categories enabled here are selectable when creating markets, calculating profit intelligence, and filtering BazaarPath markets.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {categories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px',
                border: '1px solid #d0d7d0',
                borderRadius: '8px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: 600 }}>📦 {cat}</span>
              <span className="status-pill badge-verified">Active</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddCategory} style={{ marginTop: '24px', display: 'flex', gap: '8px', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New Category (e.g. Organic Produce, Pottery)"
          />
          <button type="submit" className="btn-mini btn-mini--primary" style={{ minWidth: '120px' }}>
            ➕ Add Category
          </button>
        </form>
      </div>
    </div>
  );
}

export default CategoriesSection;
