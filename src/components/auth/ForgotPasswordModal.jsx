import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';
import { Button } from '../common/Button';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import './ForgotPasswordModal.css';

export function ForgotPasswordModal({ onNavigateLogin, onCancel }) {
  const { t, isMarathi } = useLanguage();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cleanMobile = mobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError(t('auth.errValidMobile'));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.forgotPassword({ mobile: cleanMobile });
      if (res.success) {
        setMessage(res.message || (isMarathi ? 'पासवर्ड पुनर्प्राप्ती माहिती पाठवण्यात आली आहे.' : 'Password reset instructions dispatched.'));
      } else {
        setError(res.error || (isMarathi ? 'पासवर्ड पुनर्प्राप्ती अयशस्वी.' : 'Password recovery request failed.'));
      }
    } catch (err) {
      setError(`${t('common.error')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card" role="region" aria-label={t('auth.forgotTitle')}>
      <div className="auth-card__header">
        <h2 className="auth-card__title">{t('auth.forgotTitle')}</h2>
        <p className="auth-card__subtitle">
          {t('auth.forgotSub')}
        </p>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AppIcon name="close" size={16} color="#c62828" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="auth-success-banner" role="status">
          <AppIcon name="check" size={16} color="#2e7d32" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="forgot-mobile" className="form-label">
            {t('auth.mobileNumber')}:
          </label>
          <div className="input-with-prefix">
            <span className="mobile-prefix">+91</span>
            <input
              id="forgot-mobile"
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

        <Button
          type="submit"
          variant="primary"
          className="auth-submit-btn"
          disabled={loading}
        >
          {loading ? t('common.loading') : (isMarathi ? 'ओटीपी / सूचना मिळवा' : 'Request Password Help')}
        </Button>
      </form>

      <div className="auth-card__footer">
        <Button
          type="button"
          variant="outline"
          className="auth-switch-btn"
          onClick={onNavigateLogin}
        >
          {isMarathi ? '← प्रवेश पृष्ठावर परत जा' : '← Back to Login'}
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
