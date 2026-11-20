import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { aiAdvisorService } from '../../services/ai/aiAdvisorService.js';
import { voiceService } from '../../services/ai/voiceService.js';
import { authService } from '../../services/auth/authService.js';
import { BusinessRealityScenarioCard } from './BusinessRealityScenarioCard.jsx';
import './AIBusinessAdvisor.css';

export function AIBusinessAdvisorModule({ onBack, onNavigateModule }) {
  const { language, setLanguage, isMarathi, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [selectedLang, setSelectedLang] = useState(language === 'mr' ? 'mr' : (language === 'hi' ? 'hi' : 'en'));
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    aiAdvisorService.init('default');
    const unsubAi = aiAdvisorService.subscribe((msgs) => {
      setMessages([...msgs]);
    });

    const unsubVoice = voiceService.subscribe((event, data) => {
      if (event === 'stateChange') {
        setVoiceState(data);
      } else if (event === 'transcript') {
        if (data.isFinal) {
          setInputText(data.text);
          setInterimVoiceText('');
          // Automatically send finalized voice input
          handleSendMessage(data.text);
        } else {
          setInterimVoiceText(data.text);
        }
      }
    });

    return () => {
      unsubAi();
      unsubVoice();
      voiceService.stopSpeaking();
      voiceService.stopListening();
    };
  }, [selectedLang]);

  useEffect(() => {
    voiceService.setLanguage(selectedLang);
  }, [selectedLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimVoiceText]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText;
    if (!textToSend || !textToSend.trim()) return;

    voiceService.stopSpeaking();
    voiceService.stopListening();
    setInputText('');
    setInterimVoiceText('');

    await aiAdvisorService.sendMessage(textToSend, 'ai-advisor', selectedLang);

    // Speak the advisor's response if user spoke it
    const updated = aiAdvisorService.messages;
    const latestModel = updated.filter(m => m.role === 'model' && !m.isLoading).slice(-1)[0];
    if (latestModel && latestModel.text) {
      voiceService.speak(latestModel.text, { lang: selectedLang });
    }
  };

  const handleToggleVoice = () => {
    if (voiceState === 'listening') {
      voiceService.stopListening();
    } else if (voiceState === 'speaking') {
      voiceService.stopSpeaking();
    } else {
      voiceService.startListening();
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInputText(prompt);
    handleSendMessage(prompt);
  };

  const starterPrompts = [
    { label_mr: '📊 हळद प्रक्रिया नफा व Break-Even', label_en: '📊 Turmeric Unit Reality Check', prompt: isMarathi ? 'हळद प्रक्रिया उद्योगाचे वास्तववादी भांडवल, खर्च आणि नफा-तोटा समतोल सांगा' : 'Analyze turmeric processing unit setup cost and break-even' },
    { label_mr: '🌱 लाकडी तेल घाणी वास्तववादी गणित', label_en: '🌱 Cold-Press Oil Ghani Reality', prompt: isMarathi ? 'लाकडी तेल घाणी सुरू करण्यासाठी एकूण भांडवल आणि मासिक नफा किती होईल?' : 'What is the capital requirement and monthly profit for cold-pressed oil ghani?' },
    { label_mr: '🏛️ PMFME ३५% अनुदान कसे मिळवावे?', label_en: '🏛️ How to get PMFME 35% subsidy?', prompt: isMarathi ? 'मला सूक्ष्म अन्न प्रक्रिया उद्योगासाठी PMFME ३५% अनुदान कसे मिळेल?' : 'How can I get PMFME 35% subsidy for micro food processing in Maharashtra?' },
    { label_mr: '🍅 टोमॅटो शिल्लक माल बचाव उपाय', label_en: '🍅 Rescue 200kg Unsold Tomatoes', prompt: isMarathi ? 'माझ्याकडे २०० किलो टोमॅटो शिल्लक आहेत, खराब होण्यापूर्वी काय उपाय करावा?' : 'I have 200kg unsold tomatoes, how to rescue value before spoilage?' },
    { label_mr: '🚚 आठवडे बाजार प्रवास व सुरक्षित विक्री दर', label_en: '🚚 Weekly Haat Travel Economics', prompt: isMarathi ? 'आठवडे बाजारात माल नेताना प्रवास खर्च जोडून सुरक्षित विक्री दर कसा ठरवावा?' : 'How to calculate travel expenses and minimum profitable selling price for weekly haats?' }
  ];

  return (
    <div className="ai-advisor-container">
      {/* Top Header Bar */}
      <header className="advisor-header">
        <div className="advisor-header__left">
          <button
            type="button"
            className="advisor-back-btn"
            onClick={onBack}
            aria-label={isMarathi ? 'मागे जा' : 'Back to Home'}
          >
            ← {isMarathi ? 'मुख्यपृष्ठ' : 'Home'}
          </button>
          <div>
            <h1 className="advisor-title">
              🎙️ {isMarathi ? 'महाउद्यम व्यवसाय सल्लागार' : 'MahaUdyam AI Business Advisor'}
            </h1>
            <p className="advisor-subtitle">
              {isMarathi
                ? 'महाराष्ट्र ग्रामीण उद्योजकांसाठी वास्तववादी, आकडेमोड-आधारित व आवाज-सक्षम सल्लागार'
                : 'Context-aware, voice-enabled rural intelligence and financial reality checks'}
            </p>
          </div>
        </div>

        {/* Language & Voice Selector */}
        <div className="advisor-lang-toggle" role="group" aria-label="Language selection">
          <button
            type="button"
            className={`lang-btn ${selectedLang === 'mr' ? 'lang-btn--active' : ''}`}
            onClick={() => setSelectedLang('mr')}
          >
            मराठी
          </button>
          <button
            type="button"
            className={`lang-btn ${selectedLang === 'hi' ? 'lang-btn--active' : ''}`}
            onClick={() => setSelectedLang('hi')}
          >
            हिंदी
          </button>
          <button
            type="button"
            className={`lang-btn ${selectedLang === 'en' ? 'lang-btn--active' : ''}`}
            onClick={() => setSelectedLang('en')}
          >
            English
          </button>
        </div>
      </header>

      {/* Voice Status & Waveform Visualizer */}
      <div className={`voice-visualizer-bar voice-visualizer-bar--${voiceState}`}>
        <div className="voice-visualizer-bar__inner">
          <div className="voice-status-indicator">
            <span className={`status-orb status-orb--${voiceState}`} />
            <span className="status-text">
              {voiceState === 'listening' ? (isMarathi ? 'मी तुमचे बोलणे ऐकत आहे... (मराठी)' : 'Listening to your voice...') :
               voiceState === 'speaking' ? (isMarathi ? 'सल्लागार बोलत आहे... (थांबवण्यासाठी क्लिक करा)' : 'Advisor speaking... (click mic to interrupt)') :
               voiceState === 'processing' ? (isMarathi ? 'स्थानिक बाजार आकडेमोड तपासत आहे...' : 'Analyzing local market data...') :
               (isMarathi ? 'माईक चालू करा किंवा थेट लिहा' : 'Speak or type any question')}
            </span>
          </div>

          <div className="audio-wave">
            <span className={`wave-bar ${voiceState !== 'idle' ? 'wave-bar--active' : ''}`} />
            <span className={`wave-bar ${voiceState !== 'idle' ? 'wave-bar--active' : ''}`} />
            <span className={`wave-bar ${voiceState !== 'idle' ? 'wave-bar--active' : ''}`} />
            <span className={`wave-bar ${voiceState !== 'idle' ? 'wave-bar--active' : ''}`} />
            <span className={`wave-bar ${voiceState !== 'idle' ? 'wave-bar--active' : ''}`} />
          </div>

          <button
            type="button"
            className={`main-mic-btn ${voiceState === 'listening' ? 'main-mic-btn--active' : ''}`}
            onClick={handleToggleVoice}
            aria-label={voiceState === 'listening' ? 'Stop listening' : 'Start voice conversation'}
            title={isMarathi ? 'आवाज सुरू/बंद करा' : 'Toggle voice'}
          >
            {voiceState === 'listening' ? (
              <span style={{ fontSize: '1.4rem' }}>⏹</span>
            ) : voiceState === 'speaking' ? (
              <span style={{ fontSize: '1.4rem' }}>🔇</span>
            ) : (
              <AppIcon name="advisor" size={32} color="#ffffff" />
            )}
          </button>
        </div>
      </div>

      {/* Conversation Stream */}
      <main className="advisor-chat-area">
        {messages.length === 0 ? (
          <div className="advisor-empty-state">
            <div className="empty-state-badge">🌾 {isMarathi ? 'थेट संभाषण सुरू करा' : 'Direct Conversation'}</div>
            <h2>{isMarathi ? 'कोणतीही अडचण किंवा व्यवसाय कल्पना सांगा' : 'Ask about any rural enterprise or problem'}</h2>
            <p>
              {isMarathi
                ? 'मी कोणत्याही फालतू कॅटेगरी न निवडता थेट तुमच्या प्रश्नाचे वास्तववादी गणित, भांडवल, सरकारी अनुदान आणि बाजाराचे दर सांगेन.'
                : 'No forced category menus. Ask directly using voice or text. Get instant financial simulations, unit margins, and verified schemes.'}
            </p>

            {/* Quick Starter Chips */}
            <div className="starter-chips-container">
              <span className="starter-label">{isMarathi ? '💡 त्वरित निवडा:' : '💡 Quick Starters:'}</span>
              <div className="starter-chips">
                {starterPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="starter-chip-btn"
                    onClick={() => handleQuickPrompt(p.prompt)}
                  >
                    {isMarathi ? p.label_mr : p.label_en}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                <div className="chat-message__avatar">
                  {msg.role === 'user' ? '👤' : '🌾'}
                </div>
                <div className="chat-message__content">
                  <div className="chat-message__header">
                    <strong>{msg.role === 'user' ? (currentUser?.name || (isMarathi ? 'उद्योजक' : 'Entrepreneur')) : (isMarathi ? 'महाउद्यम सल्लागार' : 'MahaUdyam Advisor')}</strong>
                    <small>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>

                  {msg.isLoading ? (
                    <div className="loading-dots">
                      <span>•</span><span>•</span><span>•</span>
                      <small style={{ marginLeft: 8 }}>{isMarathi ? 'विश्लेषण सुरू आहे...' : 'Analyzing data...'}</small>
                    </div>
                  ) : (
                    <div className="chat-message__text" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                    </div>
                  )}

                  {/* Embedded Business Reality Scenario Card */}
                  {msg.realityScenario && (
                    <div className="chat-message__card">
                      <BusinessRealityScenarioCard scenario={msg.realityScenario} />
                    </div>
                  )}

                  {/* Suggested Navigation Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="suggested-actions-row">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          className="action-nav-pill-btn"
                          onClick={() => onNavigateModule && onNavigateModule(action.moduleId)}
                        >
                          👉 {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Interim live speech transcript */}
            {interimVoiceText && (
              <div className="chat-message chat-message--user interim-message">
                <div className="chat-message__avatar">🎙️</div>
                <div className="chat-message__content">
                  <em>{interimVoiceText}...</em>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Bar */}
      <footer className="advisor-input-bar">
        <form
          className="advisor-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <button
            type="button"
            className={`input-mic-btn ${voiceState === 'listening' ? 'input-mic-btn--active' : ''}`}
            onClick={handleToggleVoice}
            title={isMarathi ? 'बोलून विचारा' : 'Speak'}
            aria-label="Toggle voice input"
          >
            {voiceState === 'listening' ? (
              <span style={{ fontSize: '1rem', fontWeight: 800 }}>⏹</span>
            ) : (
              <AppIcon name="advisor" size={20} color="#2e7d32" />
            )}
          </button>

          <input
            ref={inputRef}
            type="text"
            className="advisor-text-input"
            placeholder={
              isMarathi
                ? 'काहीही विचारा (उदा. हळद प्रक्रिया नफा, PMFME ३५% अनुदान, टोमॅटो बचाव...)'
                : 'Ask anything (e.g., Turmeric processing profit, PMFME subsidy, Tomato rescue...)'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <button
            type="submit"
            className="advisor-send-btn"
            disabled={!inputText.trim()}
            aria-label="Send message"
          >
            ➤
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              className="advisor-clear-btn"
              onClick={() => {
                aiAdvisorService.clearHistory();
                voiceService.stopSpeaking();
              }}
              title={isMarathi ? 'संभाषण साफ करा' : 'Clear history'}
              aria-label="Clear conversation history"
            >
              🗑️
            </button>
          )}
        </form>
      </footer>
    </div>
  );
}
