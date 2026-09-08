// Sound effects & Spanish Voice synthesis service (El Cantador de Fichas)

class SoundAndSpeechService {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private soundEffectsEnabled: boolean = true;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoice();
    }
  }

  private initAudioCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private getSpanishVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    // Prioritize natural Spanish voices (es-VE, es-MX, es-ES, es-US)
    const priorityVoice = voices.find(v => v.lang === 'es-VE') ||
      voices.find(v => v.lang === 'es-MX') ||
      voices.find(v => v.lang === 'es-US') ||
      voices.find(v => v.lang.startsWith('es-')) ||
      voices.find(v => v.lang.toLowerCase().includes('spanish'));
    return priorityVoice || voices[0] || null;
  }

  private initVoice() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = this.getSpanishVoice();
        if (v) {
          this.selectedVoice = v;
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setSoundEffectsEnabled(enabled: boolean) {
    this.soundEffectsEnabled = enabled;
  }

  public isSoundEffectsEnabled(): boolean {
    return this.soundEffectsEnabled;
  }

  // Sing out the name of a drawn Ficha in enthusiastic Spanish
  public cantarFicha(nameOrPhrase: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel(); // Stop any pending utterance

      const utterance = new SpeechSynthesisUtterance(nameOrPhrase);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // energetic cartoon tone
      utterance.volume = 1.0;

      const voice = this.selectedVoice || this.getSpanishVoice();
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silently if browser blocks speech without user interaction
    }
  }

  // Play celebratory phrase
  public cantarPremio(tipoPremio: string) {
    this.playFanfare();
    this.cantarFicha(`¡Atención! ¡${tipoPremio}! ¡Felicidades!`);
  }

  // Synthesized Arcade Sound: Ficha Draw / Ball Pop
  public playPop() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      const now = this.audioCtx.currentTime;
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio failure
    }
  }

  // Synthesized Sound: Coin clink / Purchase / Win
  public playCoin() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const freqs = [987.77, 1318.51]; // B5 to E6

      freqs.forEach((f, i) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      });
    } catch {
      // Ignore audio failure
    }
  }

  // Synthesized Sound: Big Winner Fanfare
  public playFanfare() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.42);
      });
    } catch {
      // Ignore audio failure
    }
  }

  // Synthesized Sound: Subtle UI click
  public playClick() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio failure
    }
  }

  // Aliases for compatibility
  public playPurchase() {
    this.playCoin();
  }

  public playWinner() {
    this.playFanfare();
  }

  public playBallDrop() {
    this.playPop();
  }

  public speakFicha(ficha: any) {
    if (!ficha) return;
    this.playBallDrop();
    if (typeof ficha === 'string') {
      this.cantarFicha(ficha);
    } else if (ficha && ficha.name) {
      const phrase = ficha.pronunciation ? ficha.pronunciation.replace(/^[¡!]+|[¡!]+$/g, '') : ficha.name;
      this.cantarFicha(`¡Número ${ficha.id}! ¡${phrase}!`);
    }
  }
}

export const soundService = new SoundAndSpeechService();
