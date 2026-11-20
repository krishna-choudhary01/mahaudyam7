import React, { useState } from 'react';
import { authService } from '../../services/auth/authService';
import { Button } from '../common/Button';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import './LogoutConfirmModal.css';

export function LogoutConfirmModal({ onCancel, onLoggedOut }) {
  const { t, isMarathi } = useLanguage();
  const [loading, setLoading] = useState(false);
  const user = authService.getCurrentUser();

  const handleConfirmLogout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      if (onLoggedOut) {
        onLoggedOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div 
        className="logout-modal" 
        role="alertdialog" 
        aria-modal="true" 
        aria-labelledby="logout-title" 
        aria-describedby="logout-desc"
      >
        <div className="logout-icon-wrapper">
          <AppIcon name="lock" size={32} color="#c62828" />
        </div>

        <h2 id="logout-title" className="logout-title">
          {t('auth.logoutConfirmTitle')}
        </h2>

        <p id="logout-desc" className="logout-desc">
          {user ? (
            <>
              {isMarathi ? 'सध्याचे खाते: ' : 'You are currently signed in as '}
              <strong>{user.name}</strong> ({user.mobile}).
              <br /><br />
              <strong>{isMarathi ? 'डिव्हाइस सुरक्षा: ' : 'Shared Device Security: '}</strong>
              {t('auth.logoutConfirmDesc')}
            </>
          ) : (
            t('auth.logoutConfirmDesc')
          )}
        </p>

        <div className="logout-actions">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="modal-btn"
          >
            {t('auth.stayLoggedInBtn')}
          </Button>

          <Button
            variant="primary"
            onClick={handleConfirmLogout}
            disabled={loading}
            className="modal-btn modal-btn--danger"
          >
            {loading ? t('common.loading') : t('auth.logoutConfirmBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
