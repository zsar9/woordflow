/**
 * Tiny feedback sounds for the study screen, synthesized with the Web Audio
 * API — no audio asset files to ship or license. A single shared
 * AudioContext is created lazily on first use (creating one eagerly at
 * module load can be blocked by the browser's autoplay policy before the
 * user has interacted with the page).
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  // Browsers can suspend the context until a user gesture resumes it; a
  // correct answer/incorrect answer is itself the result of user input
  // (typing + Enter), so this resume is safe to call unconditionally.
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  ac: AudioContext,
  {
    freq,
    start,
    duration,
    type = 'sine',
    peakGain = 0.18,
  }: {
    freq: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peakGain?: number;
  },
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** A short, bright two-note "ping" for a correct answer. */
export function playCorrectSound() {
  const ac = getContext();
  if (!ac) return;
  const t0 = ac.currentTime;
  tone(ac, { freq: 880, start: t0, duration: 0.11, type: 'sine', peakGain: 0.16 });
  tone(ac, { freq: 1318.5, start: t0 + 0.07, duration: 0.16, type: 'sine', peakGain: 0.16 });
}

/** A short, low "buzz" for a wrong answer. */
export function playIncorrectSound() {
  const ac = getContext();
  if (!ac) return;
  const t0 = ac.currentTime;
  tone(ac, { freq: 160, start: t0, duration: 0.16, type: 'sawtooth', peakGain: 0.12 });
  tone(ac, { freq: 110, start: t0 + 0.02, duration: 0.22, type: 'sawtooth', peakGain: 0.12 });
}
