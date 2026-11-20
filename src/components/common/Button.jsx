import React from 'react';
import './Button.css';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = ''
}) {
  return (
    <button
      type={type}
      className={`app-btn app-btn--${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
