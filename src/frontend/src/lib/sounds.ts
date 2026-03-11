/**
 * Sound utilities for SAFEWAY alert system.
 * Uses Web Audio API to synthesize sounds without external files.
 */

function getAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

/** Short beep for each new violation */
export function playViolationBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/** Alarm sound for multiple-violation threshold */
export function playAlarmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const times = [0, 0.3, 0.6, 0.9, 1.2];
  for (const t of times) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(660, ctx.currentTime + t);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + t + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.25);
  }
}

/** Long emergency alarm repeated 3 times for accident/collision */
export function playEmergencyAlarm(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const pattern = [0, 0.5, 1.0, 1.8, 2.3, 2.8];
  for (const t of pattern) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(t % 1 < 0.5 ? 440 : 880, ctx.currentTime + t);
    gain.gain.setValueAtTime(0.5, ctx.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.4);
  }
}
