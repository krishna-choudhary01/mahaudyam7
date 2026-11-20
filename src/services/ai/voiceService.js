/**
 * MahaUdyam — AI Business Advisor Voice Service
 * 
 * Provides natural, hands-free voice conversations tailored for rural entrepreneurs:
 * - Speech-to-Text (STT) via Web Speech API (mr-IN, hi-IN, en-IN)
 * - Text-to-Speech (TTS) via SpeechSynthesis with language-matched Indian voices
 * - Real-time state machine: 'idle' | 'listening' | 'processing' | 'speaking'
 * - Instant interruption support: halts speech when user speaks or clicks
 * - Safe fallbacks for unsupported browsers / headless environments
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.currentUtterance = null;
    this.state = 'idle'; // 'idle' | 'listening' | 'processing' | 'speaking'
    this.listeners = new Set();
    this.currentLanguage = 'mr-IN'; // 'mr-IN' | 'hi-IN' | 'en-IN'
    this.isSpeechSupported = false;
    this.isRecognitionSupported = false;
    this.audioWaveData = [15, 20, 25, 18, 12];

    this.initRecognition();
  }

  initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.currentLanguage;

        this.recognition.onstart = () => {
          this.setState('listening');
        };

        this.recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          this.emit('transcript', {
            text: finalTranscript || interimTranscript,
            isFinal: Boolean(finalTranscript)
          });
        };

        this.recognition.onerror = (event) => {
          console.warn('Speech recognition event:', event.error);
          this.setState('idle');
          this.emit('error', event.error);
        };

        this.recognition.onend = () => {
          if (this.state === 'listening') {
            this.setState('idle');
          }
        };

        this.isRecognitionSupported = true;
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
        this.isRecognitionSupported = false;
      }
    }

    if (this.synthesis) {
      this.isSpeechSupported = true;
    }
  }

  setLanguage(langCode) {
    if (langCode === 'mr' || langCode === 'mr-IN') {
      this.currentLanguage = 'mr-IN';
    } else if (langCode === 'hi' || langCode === 'hi-IN') {
      this.currentLanguage = 'hi-IN';
    } else {
      this.currentLanguage = 'en-IN';
    }

    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
    }
  }

  startListening(onResultCallback) {
    if (this.state === 'speaking') {
      this.stopSpeaking();
    }

    if (!this.recognition) {
      this.emit('unsupported', 'Speech recognition not supported in this browser.');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      // If already started, ignore or restart
      try {
        this.recognition.stop();
        this.recognition.start();
        return true;
      } catch (e) {
        this.setState('idle');
        return false;
      }
    }
  }

  stopListening() {
    if (this.recognition && this.state === 'listening') {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.setState('idle');
  }

  speak(text, options = {}) {
    if (!this.synthesis) return;

    // Interrupt any ongoing speech immediately
    this.stopSpeaking();

    if (!text || typeof text !== 'string') return;

    // Clean markdown symbols for natural speech pronunciation
    const cleanText = text
      .replace(/[#*_`~>-]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate || 0.95; // Slightly measured pace for clarity
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // Select matched voice if available
    const voices = this.synthesis.getVoices() || [];
    const targetLang = (options.lang || this.currentLanguage).toLowerCase();

    // Prefer Indian voices matching target language
    const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLang.slice(0, 2))) ||
                         voices.find(v => v.lang.toLowerCase().includes('in')) ||
                         voices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      this.setState('speaking');
    };

    utterance.onend = () => {
      this.setState('idle');
      if (options.onComplete) options.onComplete();
    };

    utterance.onerror = () => {
      this.setState('idle');
    };

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    if (this.state === 'speaking') {
      this.setState('idle');
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('stateChange', newState);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (e) {
        console.error('Error in voiceService listener:', e);
      }
    }
  }
}

export const voiceService = new VoiceService();
