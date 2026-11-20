import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { voiceService } from '../../services/ai/voiceService.js';
import './AIBusinessAdvisor.css';

export function FloatingAdvisorButton({ onOpenAdvisor, activeModuleId }) {
  const { isMarathi } = useLanguage();
  const [voiceState, setVoiceState] = useState('idle');

  useEffect(() => {
    const unsub = voiceService.subscribe((event, data) => {
      if (event === 'stateChange') {
        setVoiceState(data);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="floating-advisor-container" aria-label="MahaUdyam AI Business Advisor">
      <button
        type="button"
        className={`floating-advisor-btn ${voiceState !== 'idle' ? `floating-advisor-btn--${voiceState}` : ''}`}
        onClick={onOpenAdvisor}
        title={isMarathi ? 'महाउद्यम व्यवसाय सल्लागार उघडा' : 'Open AI Business Advisor'}
        aria-label={isMarathi ? 'महाउद्यम व्यवसाय सल्लागार उघडा' : 'Open AI Business Advisor'}
      >
        <div className="advisor-btn-inner">
          <span className="advisor-icon" role="img" aria-label="advisor">🎙️</span>
          <span className="advisor-pulse-ring" />
        </div>
        <span className="advisor-btn-label">
          {voiceState === 'listening' ? (isMarathi ? 'ऐकत आहे...' : 'Listening...') :
           voiceState === 'speaking' ? (isMarathi ? 'बोलत आहे...' : 'Speaking...') :
           (isMarathi ? 'AI सल्लागार' : 'AI Advisor')}
        </span>
      </button>
    </div>
  );
}
