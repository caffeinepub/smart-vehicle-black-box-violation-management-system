import { AlertCircle, Siren, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  message: string;
  type: "alert" | "report";
  detail?: string;
  vehicleNo?: string;
  violationType?: string;
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
) {
  const notification: Notification = {
    id: `${Date.now()}-${Math.random()}`,
    message,
    type,
    detail,
    vehicleNo,
    violationType,
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

        return (
          <div
            key={notification.id}
            data-ocid="violations.toast"
            className="shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
            style={{
              borderRadius: "4px",
              border: isReport ? "2px solid #ef4444" : "2px solid #FF9933",
            }}
          >
            {/* Header bar */}
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{
                backgroundColor: isReport ? "#7f1d1d" : "#0B3D91",
              }}
            >
              {isReport ? (
                <AlertCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#fca5a5" }}
                />
              ) : (
                <Siren
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#FF9933" }}
                />
              )}
              <p
                className="font-bold text-sm flex-1 leading-snug"
                style={{
                  color: isReport ? "#fca5a5" : "#ffffff",
                }}
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
                <X
                  className="w-4 h-4"
                  style={{ color: isReport ? "#fca5a5" : "#93c5fd" }}
                />
              </button>
            </div>

            {/* Body */}
            <div
              className="px-4 py-3"
              style={{
                backgroundColor: isReport ? "#450a0a" : "#082d6b",
              }}
            >
              {notification.vehicleNo && (
                <p
                  className="font-black text-lg font-mono tracking-widest mb-1"
                  style={{ color: "#ffffff" }}
                >
                  {notification.vehicleNo}
                </p>
              )}
              {notification.violationType && (
                <span
                  className="inline-block text-xs font-bold uppercase px-2 py-0.5 mb-2"
                  style={{
                    backgroundColor: "rgba(239,68,68,0.2)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: "2px",
                  }}
                >
                  {notification.violationType}
                </span>
              )}
              <p
                className="font-semibold text-sm leading-snug"
                style={{ color: isReport ? "#fecaca" : "#bfdbfe" }}
              >
                {notification.message}
              </p>
              {notification.detail && (
                <p
                  className="text-xs mt-1.5 leading-snug"
                  style={{
                    color: isReport
                      ? "rgba(252,165,165,0.7)"
                      : "rgba(147,197,253,0.75)",
                  }}
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
