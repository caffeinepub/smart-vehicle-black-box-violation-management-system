const BEEP_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
const SIREN_URL = "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";

function playAudio(url: string): void {
  try {
    const audio = new Audio(url);
    audio.play().catch(() => {});
  } catch {}
}

/** Short beep for each new violation */
export function playViolationBeep(): void {
  playAudio(BEEP_URL);
}

/** Alarm sound for multiple-violation threshold */
export function playAlarmSound(): void {
  playAudio(BEEP_URL);
}

/** Long emergency alarm for accident/collision */
export function playEmergencyAlarm(): void {
  playAudio(SIREN_URL);
}
