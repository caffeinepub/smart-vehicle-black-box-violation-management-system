function playAudio(primary: string, fallback: string): void {
  try {
    const audio = new Audio(primary);
    audio.play().catch(() => {
      try {
        const fallbackAudio = new Audio(fallback);
        fallbackAudio.play().catch(() => {});
      } catch {}
    });
  } catch {}
}

const BEEP_FALLBACK =
  "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
const SIREN_FALLBACK =
  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg";

/** Short beep for each new violation */
export function playViolationBeep(): void {
  playAudio("/beep.mp3", BEEP_FALLBACK);
}

/** Alarm sound for multiple-violation threshold */
export function playAlarmSound(): void {
  playAudio("/beep.mp3", BEEP_FALLBACK);
}

/** Long emergency alarm for accident/collision */
export function playEmergencyAlarm(): void {
  playAudio("/siren.mp3", SIREN_FALLBACK);
}
