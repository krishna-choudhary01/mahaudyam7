import React from 'react';
import './Card.css';

export function Card({ title, badge, children, className = '' }) {
  return (
    <article className={`app-card ${className}`}>
      {(title || badge) && (
        <header className="app-card__header">
          {title && <h2 className="app-card__title">{title}</h2>}
          {badge && <span className="app-card__badge">{badge}</span>}
        </header>
      )}
      <div className="app-card__body">{children}</div>
    </article>
  );
}
