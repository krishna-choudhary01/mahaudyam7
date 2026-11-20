import React from 'react';
import './ErrorBoundary.css';

/**
 * Top-Level React Error Boundary for MahaUdyam PWA
 * Prevents blank page crashes by rendering a resilient, bilingual recovery screen
 * with touch-friendly action buttons to reload or reset session.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MahaUdyam ErrorBoundary] Caught unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    try {
      window.location.reload();
    } catch (e) {
      window.location.href = window.location.origin;
    }
  };

  handleResetAndReload = () => {
    try {
      // Clear potentially corrupted transient session tokens or UI state,
      // but preserve permanent user data in IndexedDB
      sessionStorage.clear();
      localStorage.removeItem('mahaudyam_language');
    } catch (e) {
      // Ignore storage errors
    }
    this.handleReload();
  };

  render() {
    if (this.state.hasError) {
      const isMarathi = typeof localStorage !== 'undefined' && localStorage.getItem('mahaudyam_language') === 'mr';

      return (
        <div className="error-boundary" role="alert" aria-live="assertive">
          <div className="error-boundary__card">
            <div className="error-boundary__icon" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1 className="error-boundary__title">
              {isMarathi ? 'तांत्रिक त्रुटी आढळली' : 'Something Went Wrong'}
            </h1>
            <h2 className="error-boundary__subtitle">
              {isMarathi ? 'काहीतरी चूक झाली आहे' : 'MahaUdyam display error'}
            </h2>

            <p className="error-boundary__desc">
              {isMarathi
                ? 'महाउद्यम प्रणालीमध्ये अनपेक्षित समस्या आली आहे. तुमची IndexedDB स्थानिक साठ्यातील सर्व माहिती सुरक्षित आहे.'
                : 'MahaUdyam encountered an unexpected display issue. Your saved data in offline storage remains completely safe.'}
            </p>

            <div className="error-boundary__actions">
              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--primary"
                onClick={this.handleReload}
              >
                {isMarathi ? 'पुन्हा लोड करा (Refresh Application)' : 'Refresh Application'}
              </button>

              <button
                type="button"
                className="error-boundary__btn error-boundary__btn--secondary"
                onClick={this.handleResetAndReload}
              >
                {isMarathi ? 'सत्र रीसेट करा आणि उघडा' : 'Reset Session & Reload'}
              </button>
            </div>

            {this.state.error && (
              <details className="error-boundary__details">
                <summary className="error-boundary__summary">
                  {isMarathi ? 'तांत्रिक माहिती (Technical Details)' : 'Technical Details'}
                </summary>
                <pre className="error-boundary__pre">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
