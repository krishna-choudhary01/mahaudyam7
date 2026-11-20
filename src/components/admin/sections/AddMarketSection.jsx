import React, { useState, useEffect } from 'react';
import {
  marketManagementService,
  MARKET_TYPES,
  OPERATING_DAYS,
  DEFAULT_PRODUCT_CATEGORIES,
  STANDARD_FACILITIES,
  VERIFICATION_STATUSES
} from '../../../services/admin/marketManagementService.js';
import { locationService } from '../../../services/location/locationService.js';
import { SearchableSelect } from '../../common/SearchableSelect.jsx';
import { Button } from '../../common/Button.jsx';
import { useLanguage } from '../../../i18n/index.js';

export function AddMarketSection({ editingMarket = null, onSaved, onCancel }) {
  const { t, isMarathi } = useLanguage();

  // Form State
  const [formData, setFormData] = useState(() => {
    if (editingMarket) {
      return {
        ...editingMarket,
        productCategories: editingMarket.productCategories || [],
        facilities: editingMarket.facilities || {}
      };
    }
    return {
      name: '',
      name_mr: '',
      marketType: MARKET_TYPES[0],
      description: '',
      district: '',
      districtCode: '',
      taluka: '',
      talukaCode: '',
      village: '',
      villageCode: '',
      address: '',
      landmark: '',
      lat: '',
      lng: '',
      operatingDay: 'Sunday',
      frequency: 'Weekly',
      openingTime: '08:00 AM',
      closingTime: '02:00 PM',
      specialSchedule: '',
      productCategories: ['Vegetables', 'Fruits'],
      facilities: {
        drinkingWater: false,
        parking: false,
        publicTransport: false,
        storage: false,
        electricity: false,
        toilets: false,
        loadingUnloading: false
      },
      stallFee: 50,
      entryFee: 0,
      contactNumber: '',
      officialWebsite: '',
      dataSource: 'Official Administration Entry',
      verificationStatus: 'pending_verification'
    };
  });

  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);
  const [villageLoading, setVillageLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dList = locationService.getAllDistricts();
    setDistricts(dList);

    if (formData.districtCode) {
      const tList = locationService.getTalukasForDistrict(formData.districtCode);
      setTalukas(tList);
      if (formData.talukaCode) {
        loadVillages(formData.districtCode, formData.talukaCode);
      }
    }
  }, []);

  const loadVillages = async (dCode, tCode) => {
    setVillageLoading(true);
    try {
      const res = await locationService.getVillagesForTaluka(dCode, tCode);
      const list = Array.isArray(res) ? res : (res?.villages || []);
      setVillages(list);
    } catch (e) {
      setVillages([]);
    } finally {
      setVillageLoading(false);
    }
  };

  const handleDistrictChange = (code) => {
    const num = code ? Number(code) : '';
    const distObj = districts.find((d) => d.code === num);
    setFormData((prev) => ({
      ...prev,
      districtCode: num,
      district: distObj ? distObj.name : '',
      talukaCode: '',
      taluka: '',
      villageCode: '',
      village: ''
    }));
    if (num) {
      setTalukas(locationService.getTalukasForDistrict(num));
    } else {
      setTalukas([]);
    }
    setVillages([]);
  };

  const handleTalukaChange = (code) => {
    const num = code ? Number(code) : '';
    const talukaObj = talukas.find((t) => t.code === num);
    setFormData((prev) => ({
      ...prev,
      talukaCode: num,
      taluka: talukaObj ? talukaObj.name : '',
      villageCode: '',
      village: ''
    }));
    if (num && formData.districtCode) {
      loadVillages(formData.districtCode, num);
    } else {
      setVillages([]);
    }
  };

  const handleVillageChange = (code) => {
    const num = code ? Number(code) : '';
    const vObj = villages.find((v) => (v.code || v.c) === num);
    setFormData((prev) => ({
      ...prev,
      villageCode: num,
      village: vObj ? (vObj.name_en || vObj.n) : ''
    }));
  };

  const handleCategoryToggle = (cat) => {
    setFormData((prev) => {
      const current = prev.productCategories || [];
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      return { ...prev, productCategories: updated };
    });
  };

  const handleFacilityToggle = (facId) => {
    setFormData((prev) => ({
      ...prev,
      facilities: {
        ...prev.facilities,
        [facId]: !prev.facilities?.[facId]
      }
    }));
  };

  const handleSubmit = async (e, forceDuplicate = false) => {
    if (e) e.preventDefault();
    setError('');
    setDuplicateWarning(null);

    if (!formData.name.trim()) {
      setError(isMarathi ? 'कृपया बाजाराचे नाव टाका.' : 'Market name is required.');
      return;
    }

    if (!formData.districtCode || !formData.talukaCode) {
      setError(isMarathi ? 'कृपया जिल्हा आणि तालुका निवडा.' : 'District and Taluka are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        stallFee: Number(formData.stallFee || 0),
        entryFee: Number(formData.entryFee || 0),
        timings: `${formData.openingTime} - ${formData.closingTime}`,
        coordinates: (formData.lat && formData.lng)
          ? { lat: Number(formData.lat), lng: Number(formData.lng) }
          : null,
        forceAllowDuplicate: forceDuplicate
      };

      let result;
      if (editingMarket) {
        result = await marketManagementService.updateMarket(editingMarket.id, payload);
      } else {
        result = await marketManagementService.addMarket(payload);
      }

      if (result.success) {
        if (onSaved) onSaved(result.market);
      } else if (result.isDuplicateWarning) {
        setDuplicateWarning(result);
      } else {
        setError(result.error || 'Failed to save market record.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving the market.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">
            {editingMarket
              ? (isMarathi ? `बाजार संपादन: ${editingMarket.name}` : `Edit Market: ${editingMarket.name}`)
              : t('admin.nav.addNewMarket')}
          </h2>
          <p className="section-desc">
            {isMarathi
              ? 'महाराष्ट्र राज्य अधिकृत स्थान सूचीनुसार अचूक व पडताळणीकृत बाजार माहिती भरा'
              : 'Add or modify weekly markets with official Maharashtra LGD location hierarchy and operational metadata'}
          </p>
        </div>
        <button type="button" className="btn-mini" onClick={onCancel}>
          ✕ {t('admin.actions.cancel')}
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span>⚠️ {error}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="admin-alert admin-alert--error" style={{ display: 'block', backgroundColor: '#fff3e0', borderColor: '#ffe082', color: '#e65100' }}>
          <strong>⚠️ Duplicate Market Detected:</strong>
          <p style={{ margin: '6px 0' }}>{duplicateWarning.error}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn-mini btn-mini--primary"
              onClick={() => handleSubmit(null, true)}
            >
              Confirm & Save Anyway
            </button>
            <button
              type="button"
              className="btn-mini"
              onClick={() => setDuplicateWarning(null)}
            >
              Revise Details
            </button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)}>
        {/* 1. BASIC INFORMATION */}
        <div className="admin-card">
          <h3 className="admin-card__title">1. Basic Information (प्राथमिक माहिती)</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Market Name in English *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sinnar Sunday Weekly Bazaar"
                required
              />
            </div>
            <div className="form-group">
              <label>Market Name in Marathi (मराठीत नाव)</label>
              <input
                type="text"
                className="form-input"
                value={formData.name_mr}
                onChange={(e) => setFormData({ ...formData, name_mr: e.target.value })}
                placeholder="उदा. सिन्नर रविवार आठवडे बाजार"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Market Type (प्रकार) *</label>
              <select
                className="form-select"
                value={formData.marketType}
                onChange={(e) => setFormData({ ...formData, marketType: e.target.value })}
              >
                {MARKET_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Verification Status *</label>
              <select
                className="form-select"
                value={formData.verificationStatus}
                onChange={(e) => setFormData({ ...formData, verificationStatus: e.target.value })}
              >
                {VERIFICATION_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {isMarathi ? s.label_mr : s.label_en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Short Description / Trading Focus</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Key commodities, local gathering points, trading notes..."
            />
          </div>
        </div>

        {/* 2. LOCATION HIERARCHY */}
        <div className="admin-card">
          <h3 className="admin-card__title">2. Official Location Hierarchy (महाराष्ट्र प्रशासकीय स्थान)</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>State</label>
              <input type="text" className="form-input" value="Maharashtra (महाराष्ट्र)" disabled />
            </div>

            <div className="form-group">
              <SearchableSelect
                id="form-district"
                label="District (जिल्हा) *"
                placeholder="Select District (36 Available)"
                options={districts.map((d) => ({
                  value: d.code,
                  label: isMarathi ? d.marathiName : d.name,
                  marathiLabel: isMarathi ? d.name : d.marathiName,
                  code: `LGD ${d.code}`
                }))}
                value={formData.districtCode}
                onChange={handleDistrictChange}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <SearchableSelect
                id="form-taluka"
                label="Taluka (तालुका) *"
                placeholder={formData.districtCode ? "Select Taluka" : "Choose District First"}
                options={talukas.map((t) => ({
                  value: t.code,
                  label: isMarathi ? t.marathiName : t.name,
                  marathiLabel: isMarathi ? t.name : t.marathiName,
                  code: `LGD ${t.code}`
                }))}
                value={formData.talukaCode}
                onChange={handleTalukaChange}
                disabled={!formData.districtCode}
              />
            </div>

            <div className="form-group">
              <SearchableSelect
                id="form-village"
                label="Village / Revenue Village (महसूल गाव)"
                placeholder={
                  !formData.talukaCode
                    ? "Choose Taluka First"
                    : villageLoading
                    ? "Loading villages..."
                    : `Select Village (${villages.length} in this taluka)`
                }
                options={(Array.isArray(villages) ? villages : []).map((v) => ({
                  value: v.code || v.c,
                  label: isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n),
                  marathiLabel: isMarathi ? (v.name_en || v.n) : (v.name_mr || v.m),
                  code: `LGD ${v.code || v.c}`
                }))}
                value={formData.villageCode}
                onChange={handleVillageChange}
                disabled={!formData.talukaCode || villageLoading}
                loading={villageLoading}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Full Address / Market Yard Location</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Near Bus Stand, Market Yard Road"
              />
            </div>
            <div className="form-group">
              <label>Nearby Prominent Landmark</label>
              <input
                type="text"
                className="form-input"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                placeholder="e.g. Opposite Panchayat Samiti"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Latitude (अक्षांश: 15.6° - 22.1°N)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                placeholder="e.g. 19.8465"
              />
            </div>
            <div className="form-group">
              <label>Longitude (रेखांश: 72.6° - 80.9°E)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                placeholder="e.g. 73.9965"
              />
            </div>
          </div>
        </div>

        {/* 3. SCHEDULE */}
        <div className="admin-card">
          <h3 className="admin-card__title">3. Schedule & Timings (वेळापत्रक)</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Weekly Operating Day (आठवडे वार) *</label>
              <select
                className="form-select"
                value={formData.operatingDay}
                onChange={(e) => setFormData({ ...formData, operatingDay: e.target.value })}
              >
                {OPERATING_DAYS.map((day) => (
                  <option key={day} value={day}>
                    {t(`bazaar.calendar.days.${day}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Frequency (वारंवारता)</label>
              <select
                className="form-select"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="Weekly">Weekly (साप्ताहिक)</option>
                <option value="Daily">Daily (दररोज)</option>
                <option value="Fortnightly">Fortnightly (पाक्षिक)</option>
                <option value="Monthly">Monthly (मासिक)</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Opening Time</label>
              <input
                type="text"
                className="form-input"
                value={formData.openingTime}
                onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                placeholder="e.g. 07:00 AM"
              />
            </div>
            <div className="form-group">
              <label>Closing Time</label>
              <input
                type="text"
                className="form-input"
                value={formData.closingTime}
                onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                placeholder="e.g. 03:00 PM"
              />
            </div>
          </div>
        </div>

        {/* 4. PRODUCT CATEGORIES */}
        <div className="admin-card">
          <h3 className="admin-card__title">4. Product Categories (उत्पादन वर्ग)</h3>
          <p style={{ fontSize: '0.8rem', color: '#6e7a72', marginBottom: '8px' }}>
            Select all categories actively sold at this weekly market or mandi:
          </p>
          <div className="checkbox-grid">
            {DEFAULT_PRODUCT_CATEGORIES.map((cat) => (
              <label key={cat} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={formData.productCategories?.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 5. FACILITIES */}
        <div className="admin-card">
          <h3 className="admin-card__title">5. Physical Facilities (सुविधा)</h3>
          <p style={{ fontSize: '0.8rem', color: '#6e7a72', marginBottom: '8px' }}>
            Only mark facilities that are verified and functional on ground:
          </p>
          <div className="checkbox-grid">
            {STANDARD_FACILITIES.map((fac) => (
              <label key={fac.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={Boolean(formData.facilities?.[fac.id])}
                  onChange={() => handleFacilityToggle(fac.id)}
                />
                <span>{fac.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 6. COMMERCIAL INFORMATION */}
        <div className="admin-card">
          <h3 className="admin-card__title">6. Commercial & Charges (व्यावसायिक माहिती)</h3>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Stall Fee (₹ अंदाजे बैठकीचा दर)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.stallFee}
                onChange={(e) => setFormData({ ...formData, stallFee: e.target.value })}
                placeholder="e.g. 50"
              />
            </div>
            <div className="form-group">
              <label>Entry Fee / Toll (₹ प्रवेश शुल्क)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Mandi Office Contact Number</label>
              <input
                type="text"
                className="form-input"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="e.g. 0253-2551234"
              />
            </div>
            <div className="form-group">
              <label>Official Reference / Document URL</label>
              <input
                type="text"
                className="form-input"
                value={formData.officialWebsite}
                onChange={(e) => setFormData({ ...formData, officialWebsite: e.target.value })}
                placeholder="e.g. https://msamb.com"
              />
            </div>
          </div>
        </div>

        {/* 7. VERIFICATION METADATA */}
        <div className="admin-card">
          <h3 className="admin-card__title">7. Governance & Verification Source (पडताळणी माहिती)</h3>
          <div className="form-group">
            <label>Information Source / Evidence Document *</label>
            <input
              type="text"
              className="form-input"
              value={formData.dataSource}
              onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
              placeholder="e.g. MSAMB Directory / APMC Official Notification / Field Inspection"
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            style={{ minHeight: '48px', minWidth: '180px' }}
          >
            {submitting ? 'Saving...' : (editingMarket ? 'Update Market' : t('admin.actions.save'))}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('admin.actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddMarketSection;
