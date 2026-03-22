// Sound files: served from /public if present, else CDN fallback
const BEEP_URL = "/beep.mp3";
const SIREN_URL = "/siren.mp3";
const BEEP_CDN = "https://www.soundjay.com/buttons/beep-07.mp3";
const SIREN_CDN = "https://www.soundjay.com/misc/sounds/siren-01.mp3";

function createAudio(primary: string, fallback: string): HTMLAudioElement {
  const a = new Audio(primary);
  a.onerror = () => {
    a.src = fallback;
  };
  return a;
}

const beep = createAudio(BEEP_URL, BEEP_CDN);
const siren = createAudio(SIREN_URL, SIREN_CDN);

/** Short beep for each new violation */
export function playViolationBeep(): void {
  const b = beep.cloneNode() as HTMLAudioElement;
  b.play().catch(() => {});
}

/** Alarm sound for multiple-violation threshold */
export function playAlarmSound(): void {
  const b = beep.cloneNode() as HTMLAudioElement;
  b.play().catch(() => {});
}

/** Long emergency alarm for accident/collision */
export function playEmergencyAlarm(): void {
  const s = siren.cloneNode() as HTMLAudioElement;
  s.play().catch(() => {});
}
