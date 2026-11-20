import React, { useState } from 'react';
import { adminAuthService, INITIAL_ADMIN_ACCOUNTS, ROLES } from '../../services/auth/adminAuthService.js';
import { Button } from '../common/Button.jsx';
import { AppIcon } from '../common/Icons.jsx';
import { useLanguage } from '../../i18n/index.js';
import './AdminLoginForm.css';

export function AdminLoginForm({ onSuccess, onNavigatePublic }) {
  const { t, isMarathi } = useLanguage();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!usernameOrEmail.trim()) {
      setError(isMarathi ? 'कृपया युजरनेम किंवा अधिकृत ईमेल टाका.' : 'Please enter your username or email.');
      return;
    }
    if (!password) {
      setError(isMarathi ? 'कृपया प्रशासकीय पासवर्ड टाका.' : 'Please enter your administrative password.');
      return;
    }

    setLoading(true);
    try {
      const result = await adminAuthService.loginAdmin({
        usernameOrEmail: usernameOrEmail.trim(),
        password
      });

      if (result.success) {
        if (onSuccess) onSuccess(result.user);
      } else {
        setError(result.error || (isMarathi ? 'प्रवेश अयशस्वी झाला.' : 'Authentication failed.'));
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during administrative login.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (acc) => {
    setUsernameOrEmail(acc.username);
    setPassword(acc.passwordPlain);
    setError('');
  };

  return (
    <div className="admin-login-card" role="region" aria-label={t('admin.loginTitle')}>
      <div className="admin-login-header">
        <div className="admin-badge-icon" aria-hidden="true">
          <AppIcon name="lock" size={28} color="#1b5e20" />
        </div>
        <h1 className="admin-login-title">{t('admin.loginTitle')}</h1>
        <p className="admin-login-sub">{t('admin.loginSubtitle')}</p>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <AppIcon name="info" size={16} color="#c62828" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="admin-form-group">
          <label htmlFor="admin-username" className="admin-label">
            {t('admin.usernameOrEmail')}
          </label>
          <div className="admin-input-wrap">
            <input
              id="admin-username"
              type="text"
              className="admin-input"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder={t('admin.usernamePlaceholder')}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label htmlFor="admin-password" className="admin-label">
            {t('admin.password')}
          </label>
          <div className="admin-input-wrap">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.passwordPlaceholder')}
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="admin-input-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (isMarathi ? 'लपवा' : 'Hide') : (isMarathi ? 'पहा' : 'Show')}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="admin-submit-btn"
          disabled={loading}
        >
          {loading ? t('admin.signingIn') : t('admin.loginBtn')}
        </Button>
      </form>

      {/* Security Notice */}
      <div className="admin-security-banner">
        <AppIcon name="info" size={14} color="#795548" />
        <span>{t('admin.securityNotice')}</span>
      </div>

      {/* Demo Credentials Quick-Fill (For Idea Lab Evaluation) */}
      <div className="admin-demo-box">
        <strong>{t('admin.demoNotice')}</strong>
        <div className="demo-account-chips">
          {INITIAL_ADMIN_ACCOUNTS.map((acc) => (
            <button
              key={acc.userId}
              type="button"
              className="demo-chip-btn"
              onClick={() => handleFillDemo(acc)}
              title={`Role: ${acc.role}`}
            >
              🔑 {acc.username} ({acc.role})
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="admin-back-btn"
        onClick={onNavigatePublic}
      >
        {t('admin.backToPublic')}
      </button>
    </div>
  );
}

export default AdminLoginForm;
