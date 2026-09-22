// Sound effects & Spanish Voice synthesis service (El Cantador de Fichas)
import { getFichaLocucion } from '../data/locutorTranscripts';

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

  // ============================================================
  // NUEVO: versión async que espera al onend del utterance
  // ============================================================
  public cantarFichaAsync(nameOrPhrase: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(nameOrPhrase);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;

        const voice = this.selectedVoice || this.getSpanishVoice();
        if (voice) {
          utterance.voice = voice;
        }

        // Timeout de seguridad: si el TTS se traba, forzamos resolve
        const safetyMs = 15000;
        const safetyTimer = setTimeout(() => {
          console.warn('[soundService] TTS timeout, forzando avance');
          try { window.speechSynthesis.cancel(); } catch {}
          resolve();
        }, safetyMs);

        utterance.onend = () => {
          clearTimeout(safetyTimer);
          resolve();
        };
        utterance.onerror = () => {
          clearTimeout(safetyTimer);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  // Versión original (sync) — la dejamos por compatibilidad
  public cantarFicha(nameOrPhrase: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(nameOrPhrase);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      const voice = this.selectedVoice || this.getSpanishVoice();
      if (voice) {
        utterance.voice = voice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Fallback silencioso
    }
  }

  public cantarPremio(tipoPremio: string) {
    this.playFanfare();
    this.cantarFicha(`¡Atención! ¡${tipoPremio}! ¡Felicidades!`);
  }

  // ============================================================
  // NUEVO: speakFichaAsync — espera pop + voz completa
  // ============================================================
  public async speakFichaAsync(ficha: any): Promise<void> {
    if (!ficha) return;
    this.playBallDrop();

    let phrase: string | null = null;
    if (typeof ficha === 'string') {
      phrase = ficha;
    } else if (ficha && ficha.id) {
      phrase = getFichaLocucion(ficha.id);
    } else if (ficha && ficha.name) {
      phrase = `¡${ficha.name}!`;
    }

    if (phrase) {
      await this.cantarFichaAsync(phrase);
    }
  }

  // Versión original (sync) — se mantiene
  public speakFicha(ficha: any) {
    if (!ficha) return;
    this.playBallDrop();
    if (typeof ficha === 'string') {
      this.cantarFicha(ficha);
    } else if (ficha && ficha.id) {
      const phrase = getFichaLocucion(ficha.id);
      this.cantarFicha(phrase);
    } else if (ficha && ficha.name) {
      this.cantarFicha(`¡${ficha.name}!`);
    }
  }

  // ... (resto de métodos playPop, playCoin, playFanfare, playClick, aliases se mantienen igual)
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
    } catch {}
  }

  public playCoin() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const freqs = [987.77, 1318.51];

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
    } catch {}
  }

  public playFanfare() {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initAudioCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];

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
    } catch {}
  }

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
    } catch {}
  }

  public playPurchase() { this.playCoin(); }
  public playWinner() { this.playFanfare(); }
  public playBallDrop() { this.playPop(); }
}

export const soundService = new SoundAndSpeechService();
