import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Zap } from "lucide-react";

export type AlertType = "multipleViolation" | "accident" | "collision";

interface CenterAlertPopupProps {
  open: boolean;
  type: AlertType;
  vehicleNo?: string;
  onClose: () => void;
  onViewChallan?: () => void;
  onPayNow?: () => void;
  imageUrl?: string;
  locationStr?: string;
  totalScore?: number;
}

const ALERT_CONFIG = {
  multipleViolation: {
    headerBg: "#dc2626",
    icon: AlertTriangle,
    title: "⚠ Multiple Violations Detected",
    lines: (vehicleNo?: string) =>
      [
        vehicleNo ? `Vehicle Number: ${vehicleNo}` : null,
        "🚨 ALERT 112 – Authorities notified.",
        "Violation threshold exceeded.",
        "Vehicle flagged for monitoring.",
        "Data forwarded to authorities.",
      ].filter(Boolean) as string[],
    showViewChallan: true,
  },
  accident: {
    headerBg: "#dc2626",
    icon: Zap,
    title: "🚨 Emergency Detected – Authorities Notified",
    lines: () => [
      "Emergency services have been alerted.",
      "Driver safety check required immediately.",
      "Emergency event recorded and logged.",
      "Location shared with monitoring system.",
    ],
    showViewChallan: false,
  },
  collision: {
    headerBg: "#dc2626",
    icon: AlertTriangle,
    title: "🚨 Emergency Detected – Authorities Notified",
    lines: () => [
      "Collision detected. Emergency services alerted.",
      "Driver safety check required immediately.",
      "Incident recorded and logged.",
    ],
    showViewChallan: false,
  },
};

export default function CenterAlertPopup({
  open,
  type,
  vehicleNo,
  onClose,
  onViewChallan,
  onPayNow,
  imageUrl,
  locationStr,
  totalScore,
}: CenterAlertPopupProps) {
  if (!open) return null;

  const cfg = ALERT_CONFIG[type];
  const lines = cfg.lines(vehicleNo);
  const isEmergency = type === "accident" || type === "collision";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999 }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden w-full max-w-md mx-4"
        style={{ backgroundColor: "#ffffff" }}
      >
        {/* Header — red for all types */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: cfg.headerBg }}
        >
          <h2 className="text-lg font-extrabold text-white leading-tight">
            {cfg.title}
          </h2>
          <button
            type="button"
            data-ocid="center-alert.close_button"
            onClick={onClose}
            className="text-white opacity-80 hover:opacity-100 transition-opacity ml-3 flex-shrink-0"
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {vehicleNo && type === "multipleViolation" && (
            <p
              className="text-xl font-black font-mono tracking-widest"
              style={{ color: "#0B0B60" }}
            >
              {vehicleNo}
            </p>
          )}
          {type === "multipleViolation" && totalScore !== undefined && (
            <p className="text-sm font-semibold" style={{ color: "#374151" }}>
              Total Score: {totalScore}
            </p>
          )}
          {lines.map((line, i) => (
            <p
              key={line}
              className="text-sm"
              style={{
                color: i === 0 && !vehicleNo ? "#1f2937" : "#374151",
                fontWeight: i === 0 ? 600 : 400,
              }}
            >
              {line}
            </p>
          ))}

          {/* Emergency extras: image + location */}
          {isEmergency && imageUrl && (
            <img
              src={imageUrl}
              alt="Evidence"
              style={{
                maxWidth: "100%",
                borderRadius: "8px",
                marginTop: "8px",
                border: "2px solid #fecaca",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {isEmergency && locationStr && (
            <p className="text-sm font-mono" style={{ color: "#dc2626" }}>
              📍 {locationStr}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 pb-5 flex gap-3"
          style={{
            justifyContent: cfg.showViewChallan ? "flex-start" : "flex-end",
          }}
        >
          {cfg.showViewChallan && onViewChallan && (
            <Button
              data-ocid="center-alert.view_challan_button"
              onClick={() => {
                onViewChallan();
                onClose();
              }}
              className="font-bold"
              style={{
                backgroundColor: "#0B0B60",
                color: "#ffffff",
                borderRadius: "6px",
              }}
            >
              View Challan
            </Button>
          )}
          {cfg.showViewChallan && onPayNow && (
            <Button
              data-ocid="center-alert.pay_now_button"
              onClick={() => {
                onPayNow();
                onClose();
              }}
              className="font-bold"
              style={{
                backgroundColor: "#16a34a",
                color: "#ffffff",
                borderRadius: "6px",
              }}
            >
              Pay Now
            </Button>
          )}
          <Button
            data-ocid="center-alert.close_button"
            onClick={onClose}
            variant="outline"
            className="font-semibold"
            style={{ borderRadius: "6px" }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
