// Sound effects & Spanish Voice synthesis service (El Cantador de Fichas)
import { getFichaLocucion } from '../data/locutorTranscripts';

class SoundAndSpeechService {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private soundEffectsEnabled: boolean = true;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  
  // 🆕 FIX BUG 2: Flag de elegibilidad del usuario
  private userEligibleForAudio: boolean = false;
  
  // 🆕 FIX BUG 3: Flag para evitar solapamiento
  private isSpeaking: boolean = false;
  
  // 🆕 FIX BUG 1: Registro de osciladores activos
  private activeOscillators: Set<OscillatorNode> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoice();
    }
  }

  // 🆕 FIX BUG 2: Método para configurar elegibilidad
  public setUserEligibleForAudio(eligible: boolean) {
    this.userEligibleForAudio = eligible;
    if (!eligible) {
      this.stopAll();
    }
  }

  public isUserEligibleForAudio(): boolean {
    return this.userEligibleForAudio;
  }

  // 🆕 FIX BUG 1: Método para detener TODO
  public stopAll() {
    // Detener voz
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    
    // Detener osciladores
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignorar si ya está detenido
      }
    });
    this.activeOscillators.clear();
    
    // Suspender AudioContext
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend().catch(() => {});
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

  // 🆕 FIX BUG 2 y 3: Verificar elegibilidad y evitar solapamiento
  public cantarFicha(nameOrPhrase: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    
    // FIX BUG 2: Bloquear si el usuario no es elegible
    if (!this.userEligibleForAudio) {
      return;
    }
    
    // FIX BUG 3: Evitar solapamiento
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
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

      utterance.onstart = () => { this.isSpeaking = true; };
      utterance.onend = () => { this.isSpeaking = false; };
      utterance.onerror = () => { this.isSpeaking = false; };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
    }
  }

  public cantarPremio(tipoPremio: string) {
    if (!this.userEligibleForAudio) return;
    this.playFanfare();
    this.cantarFicha(`¡Atención! ¡${tipoPremio}! ¡Felicidades!`);
  }

  // 🆕 FIX BUG 1: Registrar osciladores activos
  private registerOscillator(osc: OscillatorNode) {
    this.activeOscillators.add(osc);
    osc.onended = () => {
      this.activeOscillators.delete(osc);
    };
  }

  public playPop() {
    if (!this.soundEffectsEnabled || !this.userEligibleForAudio) return;
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

      this.registerOscillator(osc);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore audio failure
    }
  }

  public playCoin() {
    if (!this.soundEffectsEnabled || !this.userEligibleForAudio) return;
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

        this.registerOscillator(osc);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.26);
      });
    } catch {
      // Ignore audio failure
    }
  }

  public playFanfare() {
    if (!this.soundEffectsEnabled || !this.userEligibleForAudio) return;
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

        this.registerOscillator(osc);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.42);
      });
    } catch {
      // Ignore audio failure
    }
  }

  public playClick() {
    if (!this.soundEffectsEnabled || !this.userEligibleForAudio) return;
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

      this.registerOscillator(osc);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore audio failure
    }
  }

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
    if (!ficha || !this.userEligibleForAudio) return;
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
}
export const soundService = new SoundAndSpeechService();
