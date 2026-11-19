import type {GameKind} from './practice-types';

export interface SoundPlyHint {
  from?: number;
  to?: number;
  piece?: string;
  action?: string;
  captures?: number[];
  effects?: {square: number; kind: string}[];
  check?: boolean;
}

let sharedCtx: AudioContext | null = null;
let sharedNoise: AudioBuffer | null = null;
let lastSoundAt = 0;

export function isSoundEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem('sc-sound') !== 'off';
  } catch {
    return false;
  }
}

function getAudio(): {ctx: AudioContext; noise: AudioBuffer} | null {
  if (!isSoundEnabled()) return null;
  try {
    const Ctx = window.AudioContext || (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctx();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => undefined);
    if (!sharedNoise || sharedNoise.sampleRate !== sharedCtx.sampleRate) {
      const length = Math.floor(sharedCtx.sampleRate * 1.2);
      const buf = sharedCtx.createBuffer(1, length, sharedCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      sharedNoise = buf;
    }
    return {ctx: sharedCtx, noise: sharedNoise};
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  gainPeak: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
  }
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + Math.min(0.008, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

function noiseBurst(
  ctx: AudioContext,
  noise: AudioBuffer,
  filterType: BiquadFilterType,
  freq: number,
  q: number,
  startTime: number,
  duration: number,
  gainPeak: number,
  endFreq?: number
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(freq, startTime);
  if (endFreq && endFreq !== freq) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), startTime + duration);
  }
  filter.Q.setValueAtTime(q, startTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + Math.min(0.01, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(startTime, Math.random() * 0.25);
  src.stop(startTime + duration + 0.02);
}

function playCommanderSound(ctx: AudioContext, noise: AudioBuffer, now: number, move?: SoundPlyHint | null) {
  const action = move?.action || 'move';
  const unit = move?.piece?.replace(/^[RB]/, '')?.[0] || 'I';
  const captures = (move?.captures?.length || 0) > 0;
  const burnt = Boolean(move?.effects?.some(e => e.kind === 'burnt'));
  const exploded = Boolean(move?.effects?.some(e => e.kind === 'explosion'));

  if (burnt) {
    // Anti-aircraft rapid flak cannon burst (4 staccato cracks + mid-air explosion)
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.065;
      noiseBurst(ctx, noise, 'bandpass', 1150, 2.2, t, 0.055, 0.22, 420);
      tone(ctx, 'sawtooth', 260, 75, t, 0.05, 0.14);
    }
    noiseBurst(ctx, noise, 'lowpass', 380, 0.9, now + 0.26, 0.42, 0.34, 55);
    tone(ctx, 'triangle', 120, 32, now + 0.26, 0.38, 0.26);
    return;
  }

  if (action.includes('bomb') || (unit === 'F' && (captures || exploded))) {
    // Air strike: jet dive roar + falling whistle + heavy bomb detonation
    noiseBurst(ctx, noise, 'bandpass', 620, 1.4, now, 0.24, 0.16, 220);
    tone(ctx, 'sine', 980, 240, now + 0.02, 0.22, 0.1);
    const impact = now + 0.21;
    noiseBurst(ctx, noise, 'lowpass', 420, 0.8, impact, 0.52, 0.38, 45);
    noiseBurst(ctx, noise, 'bandpass', 1400, 1.2, impact, 0.18, 0.2, 280);
    tone(ctx, 'sine', 110, 28, impact, 0.46, 0.32);
    return;
  }

  if (action.includes('fire') || (['A', 'T', 'M', 'N'].includes(unit) && (captures || exploded))) {
    // Artillery / Tank / Battleship cannon fire: sharp muzzle blast + shell whistle + impact boom
    noiseBurst(ctx, noise, 'bandpass', 950, 1.5, now, 0.09, 0.28, 260);
    tone(ctx, 'triangle', 185, 52, now, 0.11, 0.24);
    tone(ctx, 'sine', 760, 310, now + 0.05, 0.13, 0.07);
    const hit = now + 0.16;
    noiseBurst(ctx, noise, 'lowpass', 360, 0.85, hit, 0.42, 0.34, 48);
    tone(ctx, 'sine', 98, 30, hit, 0.38, 0.28);
    return;
  }

  if (captures || exploded) {
    // Ground combat / infantry assault: 3-round rifle burst + grenade thud
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.058;
      noiseBurst(ctx, noise, 'bandpass', 1650, 2.4, t, 0.045, 0.22, 520);
      tone(ctx, 'square', 320, 95, t, 0.04, 0.11);
    }
    const blast = now + 0.19;
    noiseBurst(ctx, noise, 'lowpass', 340, 0.9, blast, 0.3, 0.26, 60);
    tone(ctx, 'triangle', 115, 36, blast, 0.26, 0.22);
    return;
  }

  // Tactical march / vehicle tread / boarding
  if (['T', 'A', 'M'].includes(unit)) {
    noiseBurst(ctx, noise, 'lowpass', 280, 1.4, now, 0.11, 0.16, 110);
    tone(ctx, 'sawtooth', 92, 58, now, 0.1, 0.1);
  } else if (unit === 'F') {
    noiseBurst(ctx, noise, 'bandpass', 540, 1.8, now, 0.14, 0.13, 320);
  } else {
    noiseBurst(ctx, noise, 'bandpass', 720, 2.0, now, 0.06, 0.15, 280);
    tone(ctx, 'triangle', 150, 72, now, 0.065, 0.14);
    noiseBurst(ctx, noise, 'bandpass', 640, 2.0, now + 0.07, 0.05, 0.11, 240);
  }
}

export function playMoveSound(kind: GameKind, move?: SoundPlyHint | null): void {
  const stamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (stamp - lastSoundAt < 55) return;
  lastSoundAt = stamp;
  const audio = getAudio();
  if (!audio) return;
  const {ctx, noise} = audio;
  try {
    const now = ctx.currentTime;
    const captures = (move?.captures?.length || 0) > 0;
    const check = Boolean(move?.check);

    if (kind === 'commander') {
      playCommanderSound(ctx, noise, now, move);
      return;
    }

    switch (kind) {
      case 'chess': {
        // Warm carved wood thud; stronger knock on capture; brass bell on check
        noiseBurst(ctx, noise, 'bandpass', captures ? 520 : 380, 2.6, now, 0.055, captures ? 0.22 : 0.15);
        tone(ctx, 'triangle', captures ? 190 : 145, 62, now, 0.08, captures ? 0.22 : 0.16);
        if (captures) tone(ctx, 'sine', 340, 110, now + 0.02, 0.07, 0.14);
        if (check) tone(ctx, 'sine', 880, 660, now + 0.06, 0.18, 0.14);
        break;
      }
      case 'xiangqi': {
        // Crisp hardwood/bamboo clack ("tách") with hollow board resonance
        noiseBurst(ctx, noise, 'bandpass', 1420, 3.4, now, 0.042, captures ? 0.28 : 0.2);
        tone(ctx, 'triangle', captures ? 680 : 540, 195, now, 0.055, captures ? 0.24 : 0.17);
        if (captures) {
          noiseBurst(ctx, noise, 'bandpass', 980, 2.5, now + 0.035, 0.05, 0.18);
        }
        if (check) tone(ctx, 'sawtooth', 740, 520, now + 0.05, 0.16, 0.12);
        break;
      }
      case 'go': {
        // Slate & shell "kachi" high ceramic click on goban
        noiseBurst(ctx, noise, 'bandpass', 2450, 5.0, now, 0.028, 0.2);
        tone(ctx, 'sine', 1680, 620, now, 0.038, 0.16);
        tone(ctx, 'triangle', 310, 180, now + 0.01, 0.05, 0.09);
        break;
      }
      case 'caro':
      case 'tictactoe': {
        // Crisp pen/chalk pop — distinct pitch for X vs O
        const isX = move?.piece !== 'O';
        tone(ctx, 'sine', isX ? 620 : 440, isX ? 920 : 580, now, 0.06, 0.14);
        noiseBurst(ctx, noise, 'highpass', 1800, 1.5, now, 0.025, 0.07);
        break;
      }
      case 'reversi': {
        // Disc placement tap + smooth flip swoosh
        noiseBurst(ctx, noise, 'bandpass', 1100, 2.2, now, 0.05, 0.13, 480);
        tone(ctx, 'sine', 380, 640, now, 0.065, 0.13);
        tone(ctx, 'triangle', 520, 290, now + 0.07, 0.06, 0.12);
        break;
      }
      case 'connect4': {
        // Plastic disc slide + double bounce clatter at bottom of slot
        noiseBurst(ctx, noise, 'bandpass', 880, 2.0, now, 0.05, 0.09, 420);
        tone(ctx, 'triangle', 420, 240, now + 0.05, 0.05, 0.16);
        tone(ctx, 'triangle', 510, 310, now + 0.105, 0.04, 0.11);
        break;
      }
      case 'checkers': {
        // Wooden draughts slide + double-tap on jump/capture
        noiseBurst(ctx, noise, 'bandpass', 680, 2.0, now, 0.048, 0.15, 320);
        tone(ctx, 'triangle', 260, 120, now, 0.06, 0.15);
        if (captures) {
          tone(ctx, 'triangle', 340, 150, now + 0.075, 0.06, 0.16);
        }
        break;
      }
      case 'ludo': {
        // Playful wooden peg hop ("boing-tap")
        tone(ctx, 'sine', 360, 680, now, 0.075, 0.15);
        tone(ctx, 'triangle', 520, 260, now + 0.07, 0.055, 0.12);
        break;
      }
      case 'monopoly': {
        // Cash register / coin chime ("ting-ting")
        tone(ctx, 'sine', 1046, 1046, now, 0.08, 0.13);
        tone(ctx, 'sine', 1568, 1568, now + 0.065, 0.14, 0.15);
        break;
      }
      case 'coganh': {
        // Bamboo stone tap + resonant chord when carrying ("gánh/vây")
        noiseBurst(ctx, noise, 'bandpass', 1200, 3.0, now, 0.038, 0.16);
        tone(ctx, 'triangle', 460, 220, now, 0.055, 0.15);
        if (captures) {
          tone(ctx, 'sine', 580, 760, now + 0.05, 0.09, 0.14);
        }
        break;
      }
      case 'ataxx': {
        // Sci-fi organic gel pulse on clone/infect
        tone(ctx, 'sine', 280, 560, now, 0.085, 0.15);
        if (captures) tone(ctx, 'triangle', 440, 720, now + 0.06, 0.08, 0.13);
        break;
      }
      case 'breakthrough': {
        // Crisp marching snare tap
        noiseBurst(ctx, noise, 'bandpass', 920, 2.4, now, 0.045, 0.16);
        tone(ctx, 'triangle', 210, 95, now, 0.06, 0.16);
        break;
      }
      case 'loa': {
        // Metallic magnetic link chime
        tone(ctx, 'sine', 740, 480, now, 0.08, 0.14);
        tone(ctx, 'triangle', 1110, 740, now + 0.02, 0.07, 0.08);
        break;
      }
      case 'isolation': {
        // Step tap + heavy stone block slam
        tone(ctx, 'triangle', 320, 180, now, 0.05, 0.13);
        noiseBurst(ctx, noise, 'lowpass', 320, 1.2, now + 0.065, 0.09, 0.2, 85);
        tone(ctx, 'sine', 115, 48, now + 0.065, 0.09, 0.18);
        break;
      }
    }
  } catch {
    // Ignore audio context restrictions
  }
}

export function playDiceSound(kind: GameKind = 'ludo'): void {
  const audio = getAudio();
  if (!audio) return;
  const {ctx, noise} = audio;
  try {
    const now = ctx.currentTime;
    // 3 quick dice cup rattles
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.048;
      noiseBurst(ctx, noise, 'bandpass', 1750 + i * 220, 3.2, t, 0.032, 0.16);
      tone(ctx, 'triangle', 620 + i * 90, 340, t, 0.035, 0.11);
    }
    if (kind === 'monopoly') {
      tone(ctx, 'sine', 880, 1174, now + 0.15, 0.09, 0.11);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

export function playPurchaseSound(isAuction = false): void {
  const audio = getAudio();
  if (!audio) return;
  const {ctx, noise} = audio;
  try {
    const now = ctx.currentTime;
    if (isAuction) {
      // Auction gavel knock + triumphant golden chord
      noiseBurst(ctx, noise, 'bandpass', 520, 2.5, now, 0.045, 0.24);
      tone(ctx, 'triangle', 190, 82, now, 0.06, 0.22);
    }
    const start = isAuction ? now + 0.07 : now;
    tone(ctx, 'triangle', 523.25, 523.25, start, 0.12, 0.14);
    tone(ctx, 'triangle', 659.25, 659.25, start + 0.06, 0.14, 0.15);
    tone(ctx, 'sine', 783.99, 783.99, start + 0.12, 0.18, 0.16);
    tone(ctx, 'sine', 1046.5, 1046.5, start + 0.18, 0.26, 0.17);
  } catch {
    // Ignore audio context restrictions
  }
}

export function playBidSound(): void {
  const audio = getAudio();
  if (!audio) return;
  const {ctx} = audio;
  try {
    const now = ctx.currentTime;
    tone(ctx, 'sine', 660, 880, now, 0.09, 0.12);
    tone(ctx, 'triangle', 990, 1320, now + 0.05, 0.09, 0.09);
  } catch {
    // Ignore audio context restrictions
  }
}
