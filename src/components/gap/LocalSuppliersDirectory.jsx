import React, { useState, useEffect } from 'react';
import { gapAnalyzerService } from '../../services/gap/gapAnalyzerService.js';
import { locationService } from '../../services/location/locationService.js';
import { DEMAND_CATEGORIES } from '../../data/demand/initialDemandSignals.js';
import { useLanguage } from '../../i18n/index.js';
import { AppIcon } from '../common/Icons.jsx';
import { Card } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';

export function LocalSuppliersDirectory({ defaultDistrictCode = 490, defaultTalukaCode = 4154 }) {
  const { t, isMarathi } = useLanguage();
  const [districtCode, setDistrictCode] = useState(defaultDistrictCode);
  const [talukaCode, setTalukaCode] = useState(defaultTalukaCode);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDistricts(locationService.getAllDistricts());
    if (districtCode) {
      setTalukas(locationService.getTalukasForDistrict(districtCode));
    }
  }, []);

  const handleDistrictChange = (e) => {
    const d = e.target.value ? Number(e.target.value) : '';
    setDistrictCode(d);
    setTalukaCode('');
    if (d) {
      setTalukas(locationService.getTalukasForDistrict(d));
    } else {
      setTalukas([]);
    }
  };

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const list = await gapAnalyzerService.getSuppliers({
        districtCode: districtCode || undefined,
        talukaCode: talukaCode || undefined,
        category: selectedCategory
      });

      let filtered = list;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.businessName.toLowerCase().includes(q) ||
            s.businessName_mr.toLowerCase().includes(q) ||
            s.village.toLowerCase().includes(q) ||
            s.taluka.toLowerCase().includes(q)
        );
      }
      setSuppliers(filtered);
    } catch (err) {
      console.warn('Could not load suppliers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [districtCode, talukaCode, selectedCategory, searchQuery]);

  return (
    <div className="local-suppliers-directory">
      <div className="suppliers-dir-header">
        <h3 className="suppliers-dir-title">{t('gapAnalyzer.suppliers.title')}</h3>
        <p className="suppliers-dir-subtitle">{t('gapAnalyzer.suppliers.subtitle')}</p>
      </div>

      {/* Filter Controls */}
      <Card className="suppliers-filter-card">
        <div className="suppliers-filter-grid">
          <div className="filter-col">
            <label className="filter-label">{isMarathi ? 'जिल्हा:' : 'District:'}</label>
            <select className="filter-select" value={districtCode} onChange={handleDistrictChange}>
              <option value="">{isMarathi ? 'सर्व जिल्हे' : 'All Districts'}</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>
                  {isMarathi ? d.marathiName : d.name} (LGD {d.code})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-col">
            <label className="filter-label">{isMarathi ? 'तालुका:' : 'Taluka:'}</label>
            <select
              className="filter-select"
              value={talukaCode}
              onChange={(e) => setTalukaCode(e.target.value ? Number(e.target.value) : '')}
              disabled={!districtCode}
            >
              <option value="">{isMarathi ? 'सर्व तालुके' : 'All Talukas'}</option>
              {talukas.map((t) => (
                <option key={t.code} value={t.code}>
                  {isMarathi ? t.marathiName : t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-col">
            <label className="filter-label">{isMarathi ? 'वर्गवारी:' : 'Category:'}</label>
            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">{isMarathi ? 'सर्व वर्गवारी' : 'All Categories'}</option>
              {DEMAND_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {isMarathi ? c.name_mr : c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-col">
            <label className="filter-label">{isMarathi ? 'शोधा:' : 'Search:'}</label>
            <input
              type="text"
              className="demand-search-input"
              placeholder={isMarathi ? 'व्यावसायिकाचे नाव, गाव...' : 'Business name, village...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Directory Grid */}
      <div className="suppliers-cards-grid">
        {loading ? (
          <div className="suppliers-loading">
            <div className="spinner"></div>
            <p>{isMarathi ? 'अधिकृत पुरवठादार यादी लोड होत आहे...' : 'Loading verified supplier directory...'}</p>
          </div>
        ) : suppliers.length === 0 ? (
          <Card className="suppliers-empty-card">
            <p>{isMarathi ? 'या निकषांवर कोणताही अधिकृत पुरवठादार आढळला नाही.' : 'No verified suppliers match the selected filters.'}</p>
          </Card>
        ) : (
          suppliers.map((sup) => (
            <Card key={sup.id} className="supplier-profile-card">
              <div className="supplier-profile-header">
                <div>
                  <span className="sup-badge-verified">✓ {isMarathi ? 'अधिकृत पडताळणी पूर्ण' : 'Verified Business'}</span>
                  <h4 className="sup-business-name">
                    {isMarathi ? sup.businessName_mr : sup.businessName}
                  </h4>
                  <span className="sup-location">📍 {sup.village}, {sup.taluka}, {sup.district}</span>
                </div>
              </div>

              <div className="sup-details-body">
                <div className="sup-detail-item">
                  <span className="detail-label">{t('gapAnalyzer.suppliers.verificationSource')}</span>
                  <span className="detail-value-license">{sup.verificationSource}</span>
                </div>

                <div className="sup-detail-item">
                  <span className="detail-label">{t('gapAnalyzer.suppliers.address')}</span>
                  <span className="detail-value">{sup.address}</span>
                </div>

                <div className="sup-detail-item">
                  <span className="detail-label">{t('gapAnalyzer.suppliers.suppliedItems')}</span>
                  <div className="sup-products-tags">
                    {(isMarathi ? sup.productsSupplied_mr : sup.productsSupplied)?.map((prod, idx) => (
                      <span key={idx} className="sup-prod-tag">• {prod}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
export default LocalSuppliersDirectory;
