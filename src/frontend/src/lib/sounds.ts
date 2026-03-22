const beep = new Audio("https://www.soundjay.com/buttons/beep-07.mp3");
const siren = new Audio("https://www.soundjay.com/misc/sounds/siren-01.mp3");

/** Short beep for each new violation */
export function playViolationBeep(): void {
  beep.play().catch(() => {});
}

/** Alarm sound for multiple-violation threshold */
export function playAlarmSound(): void {
  beep.play().catch(() => {});
}

/** Long emergency alarm for accident/collision */
export function playEmergencyAlarm(): void {
  siren.play().catch(() => {});
}
