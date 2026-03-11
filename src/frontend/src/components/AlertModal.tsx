import { useEffect } from "react";

export type AlertModalType = "multiple" | "emergency";

interface AlertModalProps {
  type: AlertModalType;
  vehicleNo: string;
  onClose: () => void;
  onViewChallan?: () => void;
}

export default function AlertModal({
  type,
  vehicleNo,
  onClose,
  onViewChallan,
}: AlertModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isEmergency = type === "emergency";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Enter") onClose();
      }}
      aria-modal="true"
      tabIndex={-1}
      data-ocid="alert.modal"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "36px 40px",
          maxWidth: 440,
          width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          textAlign: "center",
          fontFamily: "inherit",
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 8 }}>
          {isEmergency ? "🚨" : "⚠️"}
        </div>

        {/* Header */}
        <div
          style={{
            color: isEmergency ? "#b91c1c" : "#dc2626",
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: 0.5,
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          {isEmergency
            ? "EMERGENCY EVENT DETECTED"
            : "MULTIPLE VIOLATIONS DETECTED"}
        </div>

        {/* Body */}
        <div
          style={{
            color: "#374151",
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          {isEmergency ? (
            <>
              <strong>Possible Accident / Collision</strong>
              <br />
              Vehicle Number:{" "}
              <strong style={{ color: "#1e3a8a" }}>{vehicleNo}</strong>
              <br />
              <br />
              Immediate driver safety check required.
              <br />
              Location shared with monitoring system.
            </>
          ) : (
            <>
              Vehicle Number:{" "}
              <strong style={{ color: "#1e3a8a" }}>{vehicleNo}</strong>
              <br />
              <br />
              Violation threshold exceeded.
              <br />
              <strong>Vehicle flagged for enforcement.</strong>
              <br />
              <br />
              Challan has been generated.
              <br />
              Violation data forwarded to authorities.
            </>
          )}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {!isEmergency && onViewChallan && (
            <button
              type="button"
              onClick={onViewChallan}
              data-ocid="alert.challan.primary_button"
              style={{
                background: "#1e3a8a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: 0.3,
              }}
            >
              View Challan
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            data-ocid="alert.close_button"
            style={{
              background: isEmergency ? "#b91c1c" : "#e5e7eb",
              color: isEmergency ? "#fff" : "#374151",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: 0.3,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
