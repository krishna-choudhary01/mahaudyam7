import React, { useState } from 'react';
import { authService, DEMO_USER_CONFIG } from '../../services/auth/authService';
import { AppIcon } from '../common/Icons';
import { Button } from '../common/Button';
import { useLanguage } from '../../i18n';
import './LoginForm.css';

export function LoginForm({ onNavigateRegister, onNavigateForgot, onSuccess, onCancel, authNotice }) {
  const { t, isMarathi } = useLanguage();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanMobile = mobile.trim();
    if (!cleanMobile) {
      setError(t('auth.errEnterMobile'));
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(t('auth.errValidMobile'));
      return;
    }

    if (!password) {
      setError(t('auth.errEnterPassword'));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.login({ mobile: cleanMobile, password });
      if (res.success) {
        if (onSuccess) onSuccess(res.user);
      } else {
        setError(res.error || (isMarathi ? 'प्रवेश अयशस्वी. कृपया तपशील तपासा.' : 'Authentication failed. Please check your credentials.'));
      }
    } catch (err) {
      setError(`${t('common.error')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoAccount = () => {
    setMobile(DEMO_USER_CONFIG.mobile);
    setPassword(DEMO_USER_CONFIG.password);
    setError('');
  };

  return (
    <div className="auth-card" role="region" aria-label={t('auth.loginTitle')}>
      <div className="auth-card__header">
        <h2 className="auth-card__title">{t('auth.loginTitle')}</h2>
        <p className="auth-card__subtitle">
          {t('auth.loginSub')}
        </p>
      </div>

      {/* Conditional Auth Requirement Notice */}
      {authNotice && (
        <div className="auth-notice-banner" role="status">
          <span className="auth-notice-icon">🔒</span>
          <div className="auth-notice-content">
            <strong>{authNotice.title}</strong>
            <p>{authNotice.message}</p>
          </div>
        </div>
      )}

      {/* Prominent Demo Entrepreneur Banner */}
      <div className="demo-notice-card" role="note">
        <div className="demo-notice__tag">
          <AppIcon name="opportunity" size={14} color="#e65100" />
          <span>{t('auth.demoBannerTag')}</span>
        </div>
        <p className="demo-notice__text">
          {t('auth.demoBannerText')}
          <br />
          <strong>{t('auth.mobileNumber')}:</strong> <code>9999999999</code> • <strong>{t('auth.password')}:</strong> <code>Maha@123</code>
        </p>
        <button
          type="button"
          className="demo-notice__quick-fill"
          onClick={handleUseDemoAccount}
        >
          {t('auth.useDemoBtn')}
        </button>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AppIcon name="close" size={16} color="#c62828" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Mobile Number */}
        <div className="form-group">
          <label htmlFor="login-mobile" className="form-label">
            {t('auth.mobileNumber')}:
          </label>
          <div className={`input-with-prefix ${error && !/^[6-9]\d{9}$/.test(mobile.trim()) ? 'input-with-prefix--error' : ''}`}>
            <span className="mobile-prefix">+91</span>
            <input
              id="login-mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="form-input"
              placeholder={t('auth.mobilePlaceholder')}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              autoComplete="username"
              required
            />
          </div>
        </div>

        {/* Password with Visibility Toggle */}
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">
              {t('auth.password')}:
            </label>
            <button
              type="button"
              className="forgot-link-btn"
              onClick={onNavigateForgot}
            >
              {t('auth.forgotLink')}
            </button>
          </div>
          <div className={`input-with-action ${error && (!password || password.length < 6) ? 'input-with-action--error' : ''}`}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? t('common.loading') : t('auth.loginBtn')}
        </Button>
      </form>

      {/* Switch to Registration */}
      <div className="auth-card__footer">
        <p className="auth-footer__prompt">
          {t('auth.noAccount')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="auth-switch-btn"
          onClick={onNavigateRegister}
        >
          {t('auth.createOne')}
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
