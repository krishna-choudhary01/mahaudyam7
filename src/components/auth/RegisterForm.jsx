import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';
import { locationService } from '../../services/location/locationService';
import { SearchableSelect } from '../common/SearchableSelect';
import { Button } from '../common/Button';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import './RegisterForm.css';

const LANGUAGES = [
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'en', name: 'English' }
];

export function RegisterForm({ onNavigateLogin, onSuccess, onCancel, authNotice }) {
  const { t, isMarathi } = useLanguage();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(isMarathi ? 'mr' : 'en');

  // Location hierarchy state
  const [districts] = useState(() => locationService.getAllDistricts());
  const [districtCode, setDistrictCode] = useState(490); // default Nashik
  const [talukas, setTalukas] = useState(() => locationService.getTalukasForDistrict(490));
  const [talukaCode, setTalukaCode] = useState(4154); // default Sinnar
  const [villages, setVillages] = useState([]);
  const [villageCode, setVillageCode] = useState('');
  const [villageLoading, setVillageLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load villages when taluka changes
  const handleDistrictChange = (dCode) => {
    const num = dCode ? Number(dCode) : '';
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

  const handleTalukaChange = async (tCode) => {
    const num = tCode ? Number(tCode) : '';
    setTalukaCode(num);
    setVillageCode('');
    if (num && districtCode) {
      setVillageLoading(true);
      try {
        const res = await locationService.getVillagesForTaluka(districtCode, num);
        setVillages(Array.isArray(res) ? res : res.villages || []);
      } finally {
        setVillageLoading(false);
      }
    } else {
      setVillages([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Form validations
    if (!name.trim()) {
      setError(t('auth.errEnterName'));
      return;
    }

    const cleanMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(t('auth.errValidMobile'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('auth.errPasswordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.errPasswordMatch'));
      return;
    }

    if (!districtCode || !talukaCode) {
      setError(isMarathi ? 'कृपया आपला जिल्हा आणि तालुका निवडा.' : 'Please select your District and Taluka.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register({
        name: name.trim(),
        mobile: cleanMobile,
        password,
        preferredLanguage: selectedLanguage,
        districtCode,
        talukaCode,
        villageCode: villageCode || 0
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.user);
      } else {
        setError(res.error || (isMarathi ? 'नोंदणी अयशस्वी.' : 'Registration failed.'));
      }
    } catch (err) {
      setError(`${t('common.error')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = districts.map((d) => ({
    value: d.code,
    label: isMarathi ? d.marathiName : d.name,
    marathiLabel: isMarathi ? d.name : d.marathiName
  }));

  const talukaOptions = talukas.map((t) => ({
    value: t.code,
    label: isMarathi ? t.marathiName : t.name,
    marathiLabel: isMarathi ? t.name : t.marathiName
  }));

  const villageOptions = (Array.isArray(villages) ? villages : []).map((v) => ({
    value: v.code || v.c,
    label: isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n),
    marathiLabel: isMarathi ? (v.name_en || v.n) : (v.name_mr || v.m),
    code: `LGD ${v.code || v.c}`,
    keywords: `${v.name_en || v.n} ${v.name_mr || v.m} ${v.code || v.c}`
  }));

  return (
    <div className="auth-card" role="region" aria-label={t('auth.registerTitle')}>
      <div className="auth-card__header">
        <h2 className="auth-card__title">{t('auth.registerTitle')}</h2>
        <p className="auth-card__subtitle">
          {t('auth.registerSub')}
        </p>
      </div>

      {authNotice && (
        <div className="auth-notice-banner" role="status">
          <span className="auth-notice-icon">🔒</span>
          <div className="auth-notice-content">
            <strong>{authNotice.title}</strong>
            <p>{authNotice.message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="auth-error-banner" role="alert">
          <AppIcon name="close" size={16} color="#c62828" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="reg-name" className="form-label">
            {t('auth.fullName')}:
          </label>
          <input
            id="reg-name"
            type="text"
            className={`form-input ${error && !name.trim() ? 'form-input--error' : ''}`}
            placeholder={t('auth.fullNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Mobile Number */}
        <div className="form-group">
          <label htmlFor="reg-mobile" className="form-label">
            {t('auth.mobileNumber')}:
          </label>
          <div className={`input-with-prefix ${error && !/^[6-9]\d{9}$/.test(mobile.trim()) ? 'input-with-prefix--error' : ''}`}>
            <span className="mobile-prefix">+91</span>
            <input
              id="reg-mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="form-input"
              placeholder={t('auth.mobilePlaceholder')}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
        </div>

        {/* Preferred Language */}
        <div className="form-group">
          <label className="form-label">
            {t('auth.preferredLanguage')}:
          </label>
          <div className="lang-radio-group">
            {LANGUAGES.map((lang) => (
              <label key={lang.code} className={`lang-radio-label ${selectedLanguage === lang.code ? 'lang-radio--active' : ''}`}>
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  checked={selectedLanguage === lang.code}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                />
                <span>{lang.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Passwords */}
        <div className="form-row">
          <div className="form-group form-col">
            <label htmlFor="reg-password" className="form-label">
              {t('auth.password')}:
            </label>
            <div className={`input-with-action ${error && (!password || password.length < 6) ? 'input-with-action--error' : ''}`}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? (isMarathi ? 'संकेतशब्द लपवा' : 'Hide password') : (isMarathi ? 'संकेतशब्द दाखवा' : 'Show password')}
              >
                {showPassword ? (isMarathi ? 'लपवा' : 'Hide') : (isMarathi ? 'दाखवा' : 'Show')}
              </button>
            </div>
          </div>

          <div className="form-group form-col">
            <label htmlFor="reg-confirm" className="form-label">
              {t('auth.confirmPassword')}:
            </label>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${error && password !== confirmPassword ? 'form-input--error' : ''}`}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location Selection */}
        <div className="reg-location-group">
          <span className="location-group-title">
            {isMarathi ? 'आपले स्थानिक कार्यक्षेत्र:' : 'Your Local Business Jurisdiction:'}
          </span>
          <div className="location-inputs-wrap">
            <SearchableSelect
              id="reg-district"
              label={t('home.selectDistrict') + ':'}
              options={districtOptions}
              value={districtCode}
              onChange={handleDistrictChange}
              placeholder={t('home.selectDistrict')}
            />
            <SearchableSelect
              id="reg-taluka"
              label={t('home.selectTaluka') + ':'}
              options={talukaOptions}
              value={talukaCode}
              onChange={handleTalukaChange}
              placeholder={t('home.selectTaluka')}
              disabled={!districtCode}
            />
            <SearchableSelect
              id="reg-village"
              label={t('home.selectVillage') + ' (' + (isMarathi ? 'पर्यायी' : 'Optional') + '):'}
              options={villageOptions}
              value={villageCode}
              onChange={(val) => setVillageCode(val)}
              placeholder={villageLoading ? t('common.loading') : t('home.selectVillage')}
              disabled={!talukaCode || villageLoading}
              loading={villageLoading}
            />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? t('common.loading') : t('auth.registerBtn')}
        </Button>
      </form>

      <div className="auth-card__footer">
        <p className="auth-footer__prompt">
          {t('auth.haveAccount')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="auth-switch-btn"
          onClick={onNavigateLogin}
        >
          {t('auth.loginHere')}
        </Button>

        {onCancel && (
          <button type="button" className="auth-cancel-link" onClick={onCancel}>
            ← {t('home.welcomeTitle')}
          </button>
        )}
      </div>
    </div>
  );
}
