import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { bazaarPerformanceService } from '../../services/bazaar/bazaarPerformanceService.js';
import { locationService } from '../../services/location/locationService.js';
import { DAYS_OF_WEEK } from '../../data/bazaar/initialMarkets.js';

export function NewMarketProposalSection({ userId, onProposalSubmitted }) {
  const { t, isMarathi } = useLanguage();

  const districts = locationService.getAllDistricts();
  const [selectedDistrict, setSelectedDistrict] = useState(490); // Default Nashik
  const [talukas, setTalukas] = useState(() => locationService.getTalukasForDistrict(490));

  const [form, setForm] = useState({
    name: '',
    name_mr: '',
    districtCode: 490,
    talukaCode: '',
    villageName: '',
    villageName_mr: '',
    operatingDay: 'Sunday',
    marketType: 'weekly_rural_haat',
    stallFee: '50',
    facilitiesText: 'Water, Shaded Sheds',
    productCategoriesText: 'Vegetables, Fruits, Grains',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);

  // Load existing submissions
  const loadSubmissions = async () => {
    try {
      const all = await bazaarPerformanceService.getAdminMarketSubmissions(userId || 'admin');
      setSubmissionsList(all);
    } catch (e) {
      console.warn('Could not load submissions', e);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [userId]);

  // Handle District Change
  const handleDistrictChange = (dCode) => {
    const num = Number(dCode);
    setSelectedDistrict(num);
    const tList = locationService.getTalukasForDistrict(num);
    setTalukas(tList);
    setForm((prev) => ({
      ...prev,
      districtCode: num,
      talukaCode: tList[0]?.code || ''
    }));
  };

  // Submit Proposal
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      if (!form.name.trim()) throw new Error(isMarathi ? 'कृपया बाजाराचे नाव प्रविष्ट करा.' : 'Market name is required.');

      const facilities = form.facilitiesText.split(',').map((s) => s.trim()).filter(Boolean);
      const productCategories = form.productCategoriesText.split(',').map((s) => s.trim()).filter(Boolean);

      const res = await bazaarPerformanceService.submitNewMarketProposal(userId, {
        name: form.name,
        name_mr: form.name_mr,
        districtCode: form.districtCode,
        talukaCode: form.talukaCode,
        villageName: form.villageName,
        villageName_mr: form.villageName_mr,
        operatingDay: form.operatingDay,
        marketType: form.marketType,
        stallFee: Number(form.stallFee) || 0,
        facilities,
        productCategories,
        notes: form.notes
      });

      setSuccessMessage(isMarathi ? res.message_mr : res.message_en);
      setForm({
        name: '',
        name_mr: '',
        districtCode: selectedDistrict,
        talukaCode: talukas[0]?.code || '',
        villageName: '',
        villageName_mr: '',
        operatingDay: 'Sunday',
        marketType: 'weekly_rural_haat',
        stallFee: '50',
        facilitiesText: 'Water, Shaded Sheds',
        productCategoriesText: 'Vegetables, Fruits, Grains',
        notes: ''
      });

      await loadSubmissions();
      if (onProposalSubmitted) onProposalSubmitted();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-market-proposal-section">
      <div className="proposal-header-card">
        <div className="proposal-badge">
          <AppIcon name="map-pin" size={16} />
          <span>{isMarathi ? 'नागरिक व उद्योजक सहभाग' : 'Community Market Verification'}</span>
        </div>
        <h3>{isMarathi ? 'नवीन आठवडे बाजार नोंदणी प्रस्ताव' : 'Submit Newly Discovered Weekly Market'}</h3>
        <p>
          {isMarathi
            ? 'जर तुमच्या गावातील किंवा परिसरातील आठवडे बाजार यादीत दिसत नसेल, तर खालील माहिती भरा. प्रशासकीय क्षेत्रीय पडताळणीनंतर तो इतर सर्व उद्योजकांसाठी अधिकृतपणे प्रकाशित केला जाईल.'
            : 'If a local weekly haat or village market in your area is not listed, submit its details below. It will be verified by administrative field staff before being officially published.'}
        </p>
      </div>

      {successMessage && (
        <div className="proposal-success-banner">
          <AppIcon name="check-circle" size={18} color="#2e7d32" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="proposal-error-banner">
          <AppIcon name="alert-triangle" size={18} color="#d32f2f" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="proposal-content-layout">
        {/* Form Card */}
        <div className="proposal-form-card">
          <h4>{isMarathi ? 'बाजार तपशील नोंदवा' : 'Market Information'}</h4>
          <form onSubmit={handleSubmit} className="proposal-form">
            <div className="form-grid-two">
              <div className="form-field">
                <label>{isMarathi ? 'बाजाराचे नाव (English) *' : 'Market Name (English) *'}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ozar Friday Onion & Veg Haat"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>{isMarathi ? 'बाजाराचे नाव (मराठी)' : 'Market Name (Marathi)'}</label>
                <input
                  type="text"
                  placeholder="उदा. ओझर शुक्रवार कांदा व भाजीपाला हाट"
                  value={form.name_mr}
                  onChange={(e) => setForm({ ...form, name_mr: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid-three">
              <div className="form-field">
                <label>{isMarathi ? 'जिल्हा *' : 'District *'}</label>
                <select
                  value={form.districtCode}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                >
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {isMarathi ? d.name_mr : d.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{isMarathi ? 'तालुका' : 'Taluka'}</label>
                <select
                  value={form.talukaCode}
                  onChange={(e) => setForm({ ...form, talukaCode: e.target.value })}
                >
                  {talukas.map((t) => (
                    <option key={t.code} value={t.code}>
                      {isMarathi ? t.name_mr : t.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>{isMarathi ? 'आठवडे वार *' : 'Operating Day *'}</label>
                <select
                  value={form.operatingDay}
                  onChange={(e) => setForm({ ...form, operatingDay: e.target.value })}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-two">
              <div className="form-field">
                <label>{isMarathi ? 'गाव / परिसर' : 'Village / Location'}</label>
                <input
                  type="text"
                  placeholder="e.g. Ozar Mig"
                  value={form.villageName}
                  onChange={(e) => setForm({ ...form, villageName: e.target.value })}
                />
              </div>

              <div className="form-field">
                <label>{isMarathi ? 'अंदाजे ओटा फी (₹)' : 'Stall / Entry Fee (₹)'}</label>
                <input
                  type="number"
                  min="0"
                  value={form.stallFee}
                  onChange={(e) => setForm({ ...form, stallFee: e.target.value })}
                />
              </div>
            </div>

            <div className="form-field">
              <label>{isMarathi ? 'उपलब्ध सुविधा (स्वल्पविरामाने वेगळे करा)' : 'Available Facilities'}</label>
              <input
                type="text"
                placeholder="Drinking Water, Shaded Sheds, Weighbridge, Parking"
                value={form.facilitiesText}
                onChange={(e) => setForm({ ...form, facilitiesText: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{isMarathi ? 'विक्रीसाठी प्रमुख शेतमाल' : 'Primary Product Categories'}</label>
              <input
                type="text"
                placeholder="Vegetables, Fruits, Grains, Flowers"
                value={form.productCategoriesText}
                onChange={(e) => setForm({ ...form, productCategoriesText: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label>{isMarathi ? 'अतिरिक्त माहिती / संदर्भ' : 'Additional Verification Notes'}</label>
              <textarea
                rows={2}
                placeholder={isMarathi ? 'उदा. ग्रामपंचायतीच्या जागेवर भरतो, सकाळी ८ ते दुपारी ३ वेळेत...' : 'e.g. Operates on Gram Panchayat ground, active 8am to 3pm.'}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-submit-proposal"
              disabled={submitting}
            >
              <AppIcon name="send" size={16} />
              <span>{submitting ? (isMarathi ? 'सादर करत आहे...' : 'Submitting...') : (isMarathi ? 'प्रशासकीय पडताळणीसाठी सादर करा' : 'Submit for Admin Verification')}</span>
            </button>
          </form>
        </div>

        {/* Recent Submissions Status Card */}
        <div className="proposal-status-card">
          <h4>{isMarathi ? 'माझे सादर केलेले प्रस्ताव व स्थिती' : 'Submitted Proposals & Status'}</h4>
          {submissionsList.length === 0 ? (
            <p className="no-submissions-hint">
              {isMarathi ? 'अद्याप कोणताही प्रस्ताव सादर केलेला नाही.' : 'No proposals submitted yet.'}
            </p>
          ) : (
            <div className="submissions-list">
              {submissionsList.slice(0, 6).map((sub) => (
                <div key={sub.id} className="submission-item">
                  <div className="sub-header">
                    <strong>{isMarathi ? (sub.name_mr || sub.name) : sub.name}</strong>
                    <span className={`status-pill status-${sub.status}`}>
                      {sub.status === 'verified'
                        ? (isMarathi ? 'प्रमाणित व प्रकाशित' : 'Verified & Published')
                        : sub.status === 'rejected'
                        ? (isMarathi ? 'नाकारले' : 'Rejected')
                        : (isMarathi ? 'पडताळणी प्रलंबित' : 'Pending Field Audit')}
                    </span>
                  </div>
                  <div className="sub-meta">
                    <span>{sub.operatingDay} • {sub.villageName || 'Maharashtra'}</span>
                    <span className="sub-date">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                  {sub.adminNotes && (
                    <div className="sub-admin-notes">
                      <em>{isMarathi ? 'प्रशासक शेरा:' : 'Admin Note:'}</em> "{sub.adminNotes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
