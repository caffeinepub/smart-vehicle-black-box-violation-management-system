import { AlertCircle, Siren, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  type: "alert" | "report";
  detail?: string;
  vehicleNo?: string;
  violationType?: string;
  score?: number;
  fine?: number | string;
}

let notificationQueue: Notification[] = [];
let listeners: Array<(notifications: Notification[]) => void> = [];

function playAlertBeep() {
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (_e) {
    // Audio not available; silently ignore
  }
}

export function showNotification(
  message: string,
  type: "alert" | "report" = "alert",
  detail?: string,
  vehicleNo?: string,
  violationType?: string,
  score?: number,
  fine?: number | string,
) {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    message,
    type,
    detail,
    vehicleNo,
    violationType,
    score,
    fine,
  };

  if (type === "alert") {
    playAlertBeep();
  }

  notificationQueue = [...notificationQueue, notification];
  for (const listener of listeners) listener(notificationQueue);

  // Auto-dismiss after 7 seconds
  setTimeout(() => {
    dismissNotification(notification.id);
  }, 7000);
}

export function dismissNotification(id: string) {
  notificationQueue = notificationQueue.filter((n) => n.id !== id);
  for (const listener of listeners) listener(notificationQueue);
}

export default function PopupNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const listener = (newNotifications: Notification[]) => {
      setNotifications(newNotifications);
    };

    listeners.push(listener);

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-3 w-96 max-w-[calc(100vw-2rem)]"
      aria-live="polite"
      aria-atomic="false"
    >
      {notifications.map((notification) => {
        const isReport = notification.type === "report";
        const score = notification.score;

        // Determine color scheme based on score (for "alert" type) or report type
        let headerBg: string;
        let borderColor: string;
        let bodyBg: string;
        let scoreColor: string;
        let scoreBg: string;
        let scoreLabel: string;

        if (isReport) {
          headerBg = "#7f1d1d";
          borderColor = "#ef4444";
          bodyBg = "#450a0a";
          scoreColor = "#fca5a5";
          scoreBg = "rgba(239,68,68,0.2)";
          scoreLabel = "SEVERE";
        } else if (score !== undefined && score >= 5) {
          headerBg = "#7f1d1d";
          borderColor = "#ef4444";
          bodyBg = "#450a0a";
          scoreColor = "#fca5a5";
          scoreBg = "rgba(239,68,68,0.25)";
          scoreLabel = "SEVERE";
        } else if (score === 3) {
          headerBg = "#713f12";
          borderColor = "#ca8a04";
          bodyBg = "#422006";
          scoreColor = "#fde68a";
          scoreBg = "rgba(202,138,4,0.25)";
          scoreLabel = "WARNING";
        } else {
          // score === 1 or default
          headerBg = "#14532d";
          borderColor = "#16a34a";
          bodyBg = "#052e16";
          scoreColor = "#86efac";
          scoreBg = "rgba(22,163,74,0.25)";
          scoreLabel = "LOW RISK";
        }

        const badgeTextColor =
          isReport || (score !== undefined && score >= 5)
            ? "#fca5a5"
            : score === 3
              ? "#fde68a"
              : "#86efac";

        const violationTypeBorderColor =
          isReport || (score !== undefined && score >= 5)
            ? "rgba(239,68,68,0.4)"
            : score === 3
              ? "rgba(202,138,4,0.4)"
              : "rgba(22,163,74,0.4)";

        const messageColor =
          isReport || (score !== undefined && score >= 5)
            ? "#fecaca"
            : score === 3
              ? "#fef3c7"
              : "#bbf7d0";

        const detailColor =
          isReport || (score !== undefined && score >= 5)
            ? "rgba(252,165,165,0.7)"
            : score === 3
              ? "rgba(253,230,138,0.7)"
              : "rgba(134,239,172,0.75)";

        return (
          <div
            key={notification.id}
            data-ocid="violations.toast"
            className="shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
            style={{
              borderRadius: "4px",
              border: `2px solid ${borderColor}`,
            }}
          >
            {/* Header bar */}
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ backgroundColor: headerBg }}
            >
              {isReport ? (
                <AlertCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: badgeTextColor }}
                />
              ) : (
                <Siren
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: badgeTextColor }}
                />
              )}
              <p
                className="font-bold text-sm flex-1 leading-snug"
                style={{ color: "#ffffff" }}
              >
                {isReport
                  ? "⚠ Multiple Violations Alert"
                  : "🚨 Traffic Violation Detected"}
              </p>
              <button
                type="button"
                onClick={() => dismissNotification(notification.id)}
                className="flex-shrink-0 hover:opacity-70 transition-opacity ml-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" style={{ color: badgeTextColor }} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3" style={{ backgroundColor: bodyBg }}>
              {notification.vehicleNo && (
                <p
                  className="font-black text-lg font-mono tracking-widest mb-1"
                  style={{ color: "#ffffff" }}
                >
                  {notification.vehicleNo}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {notification.violationType && (
                  <span
                    className="inline-block text-xs font-bold uppercase px-2 py-0.5"
                    style={{
                      backgroundColor: scoreBg,
                      color: badgeTextColor,
                      border: `1px solid ${violationTypeBorderColor}`,
                      borderRadius: "2px",
                    }}
                  >
                    {notification.violationType}
                  </span>
                )}
                {score !== undefined && (
                  <span
                    className="inline-block text-xs font-bold px-2 py-0.5"
                    style={{
                      backgroundColor: scoreBg,
                      color: scoreColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: "2px",
                    }}
                  >
                    Score: {score} · {scoreLabel}
                  </span>
                )}
              </div>

              {notification.fine !== undefined &&
                notification.fine !== null && (
                  <p
                    className="text-sm font-bold mb-1.5"
                    style={{ color: "#fcd34d" }}
                  >
                    Fine: ₹{notification.fine}
                  </p>
                )}

              <p
                className="font-semibold text-sm leading-snug"
                style={{ color: messageColor }}
              >
                {notification.message}
              </p>
              {notification.detail && (
                <p
                  className="text-xs mt-1.5 leading-snug"
                  style={{ color: detailColor }}
                >
                  {notification.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
