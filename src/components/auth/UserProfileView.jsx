import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../../services/auth/authService';
import { locationService } from '../../services/location/locationService';
import { SearchableSelect } from '../common/SearchableSelect';
import { Button } from '../common/Button';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import './UserProfileView.css';

const LANGUAGES = [
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'en', name: 'English' }
];

export function UserProfileView({ onClose, onRequestLogout }) {
  const { t, isMarathi, setLanguage: setGlobalLanguage } = useLanguage();
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Personal data isolation stats
  const [isolatedStats, setIsolatedStats] = useState({
    opportunityCount: 0,
    savedAt: null
  });

  // Edit form state
  const [name, setName] = useState('');
  const [language, setLanguage] = useState(isMarathi ? 'mr' : 'en');
  const [districts] = useState(() => locationService.getAllDistricts());
  const [districtCode, setDistrictCode] = useState('');
  const [talukas, setTalukas] = useState([]);
  const [talukaCode, setTalukaCode] = useState('');
  const [villages, setVillages] = useState([]);
  const [villageCode, setVillageCode] = useState('');
  const [villageLoading, setVillageLoading] = useState(false);

  // Load user data & personal stats
  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const opps = await authService.getUserOpportunities();
      setIsolatedStats({
        opportunityCount: opps.length,
        savedAt: opps.length > 0 ? opps[opps.length - 1].updatedAt : null
      });
    } catch (e) {
      console.warn('Failed to fetch personal isolated stats', e);
    }
  }, [user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Sync edit form with user object
  const startEditing = async () => {
    if (!user) return;
    setName(user.name || '');
    setLanguage(user.language || (isMarathi ? 'mr' : 'en'));
    const dCode = user.districtCode ? Number(user.districtCode) : '';
    const tCode = user.talukaCode ? Number(user.talukaCode) : '';
    const vCode = user.villageCode ? Number(user.villageCode) : '';

    setDistrictCode(dCode);
    setTalukaCode(tCode);
    setVillageCode(vCode);

    if (dCode) {
      const tList = locationService.getTalukasForDistrict(dCode);
      setTalukas(tList);
      if (tCode) {
        setVillageLoading(true);
        try {
          const vList = await locationService.getVillagesForTaluka(dCode, tCode);
          setVillages(Array.isArray(vList) ? vList : vList.villages || []);
        } finally {
          setVillageLoading(false);
        }
      }
    }
    setIsEditing(true);
    setMessage('');
    setError('');
  };

  const handleDistrictChange = (newCode) => {
    const num = newCode ? Number(newCode) : '';
    setDistrictCode(num);
    setTalukaCode('');
    setVillageCode('');
    setVillages([]);
    if (num) {
      setTalukas(locationService.getTalukasForDistrict(num));
    } else {
      setTalukas([]);
    }
  };

  const handleTalukaChange = async (newCode) => {
    const num = newCode ? Number(newCode) : '';
    setTalukaCode(num);
    setVillageCode('');
    if (num && districtCode) {
      setVillageLoading(true);
      try {
        const vList = await locationService.getVillagesForTaluka(districtCode, num);
        setVillages(Array.isArray(vList) ? vList : vList.villages || []);
      } finally {
        setVillageLoading(false);
      }
    } else {
      setVillages([]);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name.trim()) {
      setError(t('auth.errEnterName'));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.updateProfile({
        name: name.trim(),
        language,
        districtCode: districtCode ? Number(districtCode) : null,
        talukaCode: talukaCode ? Number(talukaCode) : null,
        villageCode: villageCode ? Number(villageCode) : null
      });

      if (res.success && res.user) {
        setUser(res.user);
        setIsEditing(false);
        setMessage(t('auth.profileSavedSuccess'));
        // Sync global app language if changed
        if (language && (language === 'mr' || language === 'en')) {
          setGlobalLanguage(language);
        }
      } else {
        setError(res.error || (isMarathi ? 'माहिती अद्यतनित करण्यात त्रुटी.' : 'Failed to update profile.'));
      }
    } catch (err) {
      setError(`${t('common.error')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-card" role="region" aria-label="Profile">
        <p className="profile-empty">{isMarathi ? 'सक्रिय खाते नाही.' : 'No active user logged in.'}</p>
        <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
      </div>
    );
  }

  // Location display resolution
  const districtObj = districts.find(d => d.code === Number(user.districtCode));
  const talukaObj = districtObj ? locationService.getTalukasForDistrict(districtObj.code).find(t => t.code === Number(user.talukaCode)) : null;

  return (
    <div className="profile-container" role="region" aria-label={t('auth.profileTitle')}>
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-header__top">
            <div className="profile-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-titles">
              <h2 className="profile-name">{user.name}</h2>
              <span className="profile-mobile">+91 {user.mobile}</span>
            </div>
            {onClose && (
              <button 
                type="button" 
                className="profile-close-btn" 
                onClick={onClose}
                aria-label={t('common.close')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="profile-badges">
            {user.isDevDemoAccount ? (
              <span className="profile-badge badge-demo" title="Development-only demonstration account">
                🛠️ {t('auth.demoBannerTag')}
              </span>
            ) : (
              <span className="profile-badge badge-registered">
                ✓ {isMarathi ? 'नोंदणीकृत खाते' : 'Verified Entrepreneur'}
              </span>
            )}

            <span className="profile-badge badge-session">
              {navigator.onLine ? `🌐 ${t('common.online')}` : `📶 ${t('common.offline')}`}
            </span>
          </div>
        </div>

        {/* Alerts */}
        {message && (
          <div className="profile-banner success" role="status">
            <AppIcon name="check" size={16} color="#2e7d32" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="profile-banner error" role="alert">
            <AppIcon name="close" size={16} color="#c62828" />
            <span>{error}</span>
          </div>
        )}

        {/* View vs Edit Mode */}
        {!isEditing ? (
          <div className="profile-body">
            {/* Account Details Group */}
            <div className="profile-section">
              <h3 className="profile-section__title">{isMarathi ? 'खाते तपशील' : 'Account Details'}</h3>
              
              <div className="profile-grid">
                <div className="profile-field">
                  <span className="field-label">{t('auth.userIdLabel')}</span>
                  <span className="field-value mono-id">{user.userId}</span>
                </div>

                <div className="profile-field">
                  <span className="field-label">{t('auth.preferredLanguage')}:</span>
                  <span className="field-value">
                    {LANGUAGES.find(l => l.code === (user.language || user.preferredLanguage))?.name || (user.language || user.preferredLanguage || (isMarathi ? 'मराठी (Marathi)' : 'English'))}
                  </span>
                </div>

                <div className="profile-field">
                  <span className="field-label">{t('auth.accountCreatedDate')}</span>
                  <span className="field-value">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : (user.updatedAt ? new Date(user.updatedAt).toLocaleDateString(isMarathi ? 'mr-IN' : 'en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : t('common.na'))}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Hierarchy Group */}
            <div className="profile-section">
              <h3 className="profile-section__title">{isMarathi ? 'स्थान तपशील' : 'Official Location'}</h3>
              
              <div className="profile-grid">
                <div className="profile-field">
                  <span className="field-label">{isMarathi ? 'जिल्हा' : 'District'}:</span>
                  <span className="field-value">
                    {districtObj ? (isMarathi ? `${districtObj.marathiName} (${districtObj.name})` : `${districtObj.name} (${districtObj.marathiName})`) : (user.districtCode || t('common.na'))}
                    {districtObj && <small className="field-code"> • LGD {districtObj.code}</small>}
                  </span>
                </div>

                <div className="profile-field">
                  <span className="field-label">{isMarathi ? 'तालुका' : 'Taluka'}:</span>
                  <span className="field-value">
                    {talukaObj ? (isMarathi ? `${talukaObj.marathiName} (${talukaObj.name})` : `${talukaObj.name} (${talukaObj.marathiName})`) : (user.talukaCode || t('common.na'))}
                    {talukaObj && <small className="field-code"> • LGD {talukaObj.code}</small>}
                  </span>
                </div>

                <div className="profile-field">
                  <span className="field-label">{isMarathi ? 'महसूल गाव' : 'Revenue Village'}:</span>
                  <span className="field-value">
                    {user.villageCode ? `LGD: ${user.villageCode}` : (isMarathi ? 'सर्व गावे' : 'All Villages')}
                  </span>
                </div>
              </div>
            </div>

            {/* Strict Personal Data Isolation Status */}
            <div className="profile-section isolation-card">
              <div className="isolation-header">
                <AppIcon name="database" size={20} color="#2b5329" />
                <h3 className="isolation-title">{isMarathi ? 'वैयक्तिक डेटा अलगीकरण' : 'Personal Data Isolation'}</h3>
              </div>
              <p className="isolation-desc">
                {t('auth.personalDataIsolationNote')}
              </p>
              <div className="isolation-metrics">
                <div className="metric-box">
                  <span className="metric-val">{isolatedStats.opportunityCount}</span>
                  <span className="metric-lbl">{isMarathi ? 'जतन केलेल्या संधी' : 'Saved Opportunities'}</span>
                </div>
                <div className="metric-box">
                  <span className="metric-val">{isMarathi ? 'सक्रिय' : 'Active'}</span>
                  <span className="metric-lbl">{isMarathi ? 'सुरक्षित सत्र' : 'Isolated Session'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="profile-actions">
              <Button
                variant="primary"
                onClick={startEditing}
                className="profile-btn"
              >
                {isMarathi ? 'माहिती बदला' : 'Edit Profile'}
              </Button>
              <Button
                variant="outline"
                onClick={onRequestLogout}
                className="profile-btn btn-danger"
              >
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <h3 className="profile-section__title">{isMarathi ? 'माहिती बदला' : 'Edit Profile'}</h3>

            <div className="form-group">
              <label htmlFor="edit-name" className="form-label">
                {t('auth.fullName')}:
              </label>
              <input
                id="edit-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.preferredLanguage')}:</label>
              <div className="language-selector-group">
                {LANGUAGES.map((lang) => (
                  <label
                    key={lang.code}
                    className={`lang-option ${language === lang.code ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="editLanguage"
                      value={lang.code}
                      checked={language === lang.code}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                    <span>{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dependent Location Selectors */}
            <div className="form-group">
              <label className="form-label">{t('home.selectDistrict')}:</label>
              <SearchableSelect
                id="edit-district"
                options={districts.map(d => ({
                  value: d.code,
                  label: isMarathi ? d.marathiName : d.name,
                  marathiLabel: isMarathi ? d.name : d.marathiName,
                  keywords: `${d.name} ${d.marathiName}`
                }))}
                value={districtCode}
                onChange={handleDistrictChange}
                placeholder={t('home.selectDistrict')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('home.selectTaluka')}:</label>
              <SearchableSelect
                id="edit-taluka"
                options={talukas.map(t => ({
                  value: t.code,
                  label: isMarathi ? t.marathiName : t.name,
                  marathiLabel: isMarathi ? t.name : t.marathiName,
                  keywords: `${t.name} ${t.marathiName}`
                }))}
                value={talukaCode}
                onChange={handleTalukaChange}
                placeholder={districtCode ? t('home.selectTaluka') : t('home.chooseDistrictFirst')}
                disabled={!districtCode || talukas.length === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('home.selectVillage')}:
                {villageLoading && <span className="loading-tag"> • {t('common.loading')}</span>}
              </label>
              <SearchableSelect
                id="edit-village"
                options={(Array.isArray(villages) ? villages : []).map(v => ({
                  value: v.code || v.c,
                  label: isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n),
                  marathiLabel: isMarathi ? (v.name_en || v.n) : (v.name_mr || v.m),
                  code: `LGD ${v.code || v.c}`,
                  keywords: `${v.name_en || v.n} ${v.name_mr || v.m}`
                }))}
                value={villageCode}
                onChange={(code) => setVillageCode(code ? Number(code) : '')}
                placeholder={
                  !talukaCode
                    ? t('home.chooseTalukaFirst')
                    : villageLoading
                    ? t('common.loading')
                    : t('home.selectVillage')
                }
                disabled={!talukaCode || villageLoading}
              />
            </div>

            <div className="edit-form-actions">
              <Button
                type="submit"
                variant="primary"
                className="profile-btn"
                disabled={loading}
              >
                {loading ? t('common.loading') : t('common.saveChanges')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="profile-btn"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
