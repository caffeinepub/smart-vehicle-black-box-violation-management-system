import AlertModal, { type AlertModalType } from "@/components/AlertModal";
import CenterAlertPopup, {
  type AlertType,
} from "@/components/CenterAlertPopup";
import ChallanPreviewModal from "@/components/ChallanPreviewModal";
import PaymentModal from "@/components/PaymentModal";
import { showNotification } from "@/components/notifications/PopupNotifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInterval } from "@/hooks/useInterval";
import {
  type NodeViolation,
  fetchAccidents,
  fetchData,
  fetchScore,
  fetchStats,
  fetchVehicleScore,
  fetchViolations,
  getViolationFine,
  resetSession,
} from "@/lib/api";
import {
  playAlarmSound,
  playEmergencyAlarm,
  playViolationBeep,
} from "@/lib/sounds";
import {
  CHALLAN_THRESHOLD,
  type ViolationGroup,
  buildViolationGroups,
  getPaidGroupIds,
  isInsideCamViolation,
  markGroupPaid,
} from "@/lib/violationGroups";
import { normalizeImageUrl } from "@/lib/violations/images";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Camera,
  Car,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Loader2,
  MapPin,
  RotateCcw,
  Shield,
  Siren,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { useEffect, useRef, useState } from "react";

const BASE = "https://vehicle-blackbox-system-1.onrender.com";

// Score mapping
const VIOLATION_SCORE_MAP: Record<string, number> = {
  Seatbelt: 1,
  "Door Open": 1,
  "Harsh Braking": 3,
  "Alcohol Low": 3,
  "Alcohol High": 5,
  "Drowsy Driving": 5,
  "Harsh Driving": 5,
};

// Default owner info
const DEFAULT_OWNER = "Mark";
const DEFAULT_MOBILE = "+91 8520649127";

function formatDateTime(timestamp: string | number | undefined): string {
  if (!timestamp) return "—";
  let d = new Date(timestamp as string);
  if (Number.isNaN(d.getTime()) && typeof timestamp === "string") {
    const asNum = Number(timestamp);
    if (!Number.isNaN(asNum)) d = new Date(asNum);
  }
  if (Number.isNaN(d.getTime())) return String(timestamp);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

function getViolationDateTime(v: NodeViolation): string {
  const ts = (v as any).dateTime || v.timestamp;
  return formatDateTime(ts as string | number);
}

function buildVehicleScoreMap(
  violations: NodeViolation[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of violations) {
    map.set(v.vehicleNo, (map.get(v.vehicleNo) ?? 0) + v.score);
  }
  return map;
}

function _get12HourScore(violations: NodeViolation[]): number {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  return violations
    .filter((v) => {
      const t =
        typeof v.timestamp === "number"
          ? v.timestamp
          : Number(new Date(v.timestamp as string));
      return t >= cutoff;
    })
    .reduce((sum, v) => {
      const mapped = VIOLATION_SCORE_MAP[v.violationType];
      return sum + (mapped !== undefined ? mapped : v.score);
    }, 0);
}

function isVehicleFlagged(
  vehicleNo: string,
  violations: NodeViolation[],
): boolean {
  const vViolations = violations.filter((v) => v.vehicleNo === vehicleNo);
  const totalScore = vViolations.reduce((sum, v) => sum + v.score, 0);
  if (totalScore >= 5) return true;
  if (vViolations.length >= 3) {
    const times = vViolations
      .map((v) =>
        typeof v.timestamp === "number"
          ? v.timestamp
          : new Date(v.timestamp as string).getTime(),
      )
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
    for (let i = 0; i <= times.length - 3; i++) {
      if (times[i + 2] - times[i] <= 30 * 60 * 1000) return true;
    }
  }
  return false;
}

function getStatusBadge(
  vehicleScore: number,
  isPaid: boolean,
): React.ReactNode {
  if (isPaid) {
    return (
      <Badge
        className="font-semibold"
        style={{
          backgroundColor: "#dcfce7",
          color: "#16a34a",
          border: "1px solid #bbf7d0",
          borderRadius: "3px",
        }}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Paid ✓
      </Badge>
    );
  }
  if (vehicleScore >= 5) {
    return (
      <Badge
        className="font-semibold"
        style={{
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          border: "1px solid #fecaca",
          borderRadius: "3px",
        }}
      >
        Severe Violation
      </Badge>
    );
  }
  if (vehicleScore >= 3) {
    return (
      <Badge
        className="font-semibold"
        style={{
          backgroundColor: "#fef3c7",
          color: "#d97706",
          border: "1px solid #fde68a",
          borderRadius: "3px",
        }}
      >
        Warning
      </Badge>
    );
  }
  return (
    <Badge
      className="font-semibold"
      style={{
        backgroundColor: "#dcfce7",
        color: "#16a34a",
        border: "1px solid #bbf7d0",
        borderRadius: "3px",
      }}
    >
      Low Risk
    </Badge>
  );
}

function getRiskLevel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score <= 4)
    return { label: "LOW", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" };
  if (score <= 9)
    return {
      label: "MEDIUM",
      color: "#f97316",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  return { label: "HIGH", color: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
}

const CameraCard = React.memo(function CameraCard({
  label,
  streamSrc,
}: {
  label: string;
  streamSrc: string | null;
}) {
  const [status, setStatus] = React.useState<"online" | "offline">("offline");

  const handleLoad = () => setStatus("online");
  const handleError = () => setStatus("offline");

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md"
      style={{ border: "1px solid #bfdbfe", background: "#f8fafc" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-2"
        style={{ background: "#f1f5f9" }}
      >
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4" style={{ color: "#6b7280" }} />
          <span
            className="font-bold text-xs uppercase tracking-widest"
            style={{ color: "#374151" }}
          >
            {label}
          </span>
          {/* LIVE badge */}
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#fff",
              background: "#dc2626",
              borderRadius: 3,
              padding: "1px 5px",
            }}
          >
            LIVE (Local Network)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: status === "online" ? "#16a34a" : "#dc2626",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, color: "#6b7280" }}>
            {status === "online" ? "ACTIVE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Stream area — <img> tag for MJPEG stream, no fetch, no API */}
      <div
        style={{
          position: "relative",
          backgroundColor: "#111",
          aspectRatio: "16/9",
          overflow: "hidden",
        }}
      >
        {/* Always render the img; it streams continuously when on vehicle WiFi */}
        {streamSrc && (
          <img
            id="cam"
            src={streamSrc}
            alt="Live camera feed"
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: status === "online" ? "block" : "none",
            }}
          />
        )}
        {/* Fallback overlay shown when stream is offline */}
        {status === "offline" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "#111",
            }}
          >
            <Camera style={{ width: 32, height: 32, color: "#6b7280" }} />
            <p
              style={{
                color: "#9ca3af",
                fontSize: 13,
                textAlign: "center",
                padding: "0 16px",
              }}
            >
              Connect to vehicle WiFi to view live stream
            </p>
            <p
              style={{
                color: "#6b7280",
                fontSize: 11,
                textAlign: "center",
                padding: "0 16px",
              }}
            >
              Stream: {streamSrc}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

// Module-level set — survives re-renders without causing them.
// Keys added here prevent the popup from re-opening after user closes it.
const _suppressedPopupKeys = new Set<string>();

export default function DashboardPage() {
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [apiTotalScore, setApiTotalScore] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [connecting, _setConnecting] = useState(false);
  const [retryAttempt, _setRetryAttempt] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState<string>("");
  const [challanGroupViolations, setChallanGroupViolations] = useState<
    NodeViolation[] | undefined
  >(undefined);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState<string>("");
  const [paymentGroupId, setPaymentGroupId] = useState<string | undefined>(
    undefined,
  );
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());
  const [paidGroupIds, setPaidGroupIds] = useState<Set<string>>(() =>
    getPaidGroupIds(),
  );
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [centerAlert, setCenterAlert] = useState<{
    type: AlertType;
    vehicleNo?: string;
    groupId?: string;
    totalScore?: number;
  } | null>(null);

  const previousViolationsRef = useRef<Set<string>>(new Set());
  const notifiedThresholdRef = useRef<boolean>(false);
  const popupShownRef = useRef(false);
  const POPUP_SHOWN_KEY = "challan_popup_shown_v2";
  const [alertModal, setAlertModal] = useState<{
    type: AlertModalType;
    vehicleNo: string;
  } | null>(null);
  const multipleAlertShownRef = useRef<boolean>(false);
  const _emergencyAlertShownIdsRef = useRef<Set<string>>(new Set());
  const _shownGroupAlertsRef = useRef<Set<string>>(new Set());
  const shownEmergencyAlertsRef = useRef<Set<string>>(new Set());
  // Tracks the timestamp of the last violation we showed a popup for
  // (prevents repeated popups on every 3s poll for the same latest record)
  const lastSeenViolationTimeRef = useRef<string>("");
  const [emergencyEvents, setEmergencyEvents] = useState<NodeViolation[]>([]);
  const [emergencyViolation, setEmergencyViolation] =
    useState<NodeViolation | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const lastReceivedAt = useRef<number>(0);
  const [systemOnline, setSystemOnline] = useState<boolean>(false);
  const [accidentAlerts, setAccidentAlerts] = useState<NodeViolation[]>([]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const INSIDE_STREAM_URL = "http://192.168.153.206:81/stream";

  // Set stream URL once on mount — never reload on data refresh or tab switch
  useEffect(() => {
    // Reset session on page load for fresh start
    resetSession();
    // Set stream URL once and never change it again
    setStreamUrl(INSIDE_STREAM_URL);
  }, []);

  // Derived: violation groups
  const violationGroups = buildViolationGroups(violations, paidGroupIds);

  // ─── Unified data loader (single /api/data endpoint) ────────────────────────
  const fetchAllData = () => {
    fetchData()
      .then((data) => {
        lastReceivedAt.current = Date.now();

        // Split: ACCIDENT/COLLISION → accidentAlerts; everything else → violations
        const emergencies = data.filter((v) => {
          const t = (v.violationType || "").toUpperCase();
          return t === "ACCIDENT" || t === "COLLISION";
        });
        const regularViolations = data.filter((v) => {
          const t = (v.violationType || "").toUpperCase();
          return t !== "ACCIDENT" && t !== "COLLISION";
        });

        // Trigger alerts for new emergencies
        for (const ev of emergencies) {
          const key = `emerg-${ev.vehicleNo}-${ev.timestamp}`;
          if (!shownEmergencyAlertsRef.current.has(key)) {
            shownEmergencyAlertsRef.current.add(key);
            const vType = (ev.violationType || "").toLowerCase();
            const alertType: "accident" | "collision" = vType.includes(
              "collision",
            )
              ? "collision"
              : "accident";
            playEmergencyAlarm();
            setEmergencyViolation(ev);
            setCenterAlert({ type: alertType, vehicleNo: ev.vehicleNo });
          }
        }

        setAccidentAlerts(emergencies);

        // Track new regular violations for sound/notification
        const newViolations = regularViolations.filter((v) => {
          const key = `${v.vehicleNo}-${v.timestamp}`;
          return !previousViolationsRef.current.has(key);
        });
        if (
          newViolations.length > 0 &&
          previousViolationsRef.current.size > 0
        ) {
          for (const v of newViolations) {
            playViolationBeep();
            showNotification(
              "Traffic Violation Detected",
              "alert",
              `Detected at ${getViolationDateTime(v)}`,
              v.vehicleNo,
              v.violationType,
              v.score,
              v.fineAmount,
            );
          }
        }

        const currentKeys = new Set(
          regularViolations.map((v) => `${v.vehicleNo}-${v.timestamp}`),
        );
        previousViolationsRef.current = currentKeys;

        // Per-group popup alert (once per completed group)
        if (regularViolations.length > 0) {
          const latest = regularViolations[0];
          const latestTime = String(latest.timestamp || latest.dateTime || "");
          if (latestTime && latestTime !== lastSeenViolationTimeRef.current) {
            lastSeenViolationTimeRef.current = latestTime;
            const paidIds = getPaidGroupIds();
            const groups = buildViolationGroups(regularViolations, paidIds);
            for (const g of groups) {
              if (g.isComplete && !_suppressedPopupKeys.has(g.groupId)) {
                _suppressedPopupKeys.add(g.groupId);
                playAlarmSound();
                setCenterAlert({
                  type: "multipleViolation",
                  vehicleNo: latest.vehicleNo,
                  groupId: g.groupId,
                  totalScore: g.totalScore,
                });
                break;
              }
            }
          }
        }

        setViolations((prev) => {
          const existingIds = new Set(
            prev.map((v) => v.id || String(v.timestamp)),
          );
          const newOnes = regularViolations.filter(
            (v) => !existingIds.has(v.id || String(v.timestamp)),
          );
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes].sort((a, b) => {
            const ta =
              typeof a.timestamp === "number"
                ? a.timestamp
                : new Date(a.timestamp as string).getTime();
            const tb =
              typeof b.timestamp === "number"
                ? b.timestamp
                : new Date(b.timestamp as string).getTime();
            return tb - ta;
          });
        });
        setLastUpdated(new Date());
        fetchScore().then((s) => {
          if (s >= 0) setApiTotalScore(s);
        });
      })
      .catch(() => {
        /* silent: keep existing data on polling failure */
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial fetch + ONLINE/OFFLINE status ticker
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run once
  useEffect(() => {
    fetchAllData();
    // ONLINE/OFFLINE: check every second
    const statusTicker = setInterval(() => {
      setSystemOnline(Date.now() - lastReceivedAt.current < 5000);
    }, 1000);
    return () => clearInterval(statusTicker);
  }, []);
  // Auto-refresh every 3 seconds (single endpoint)
  useInterval(() => {
    fetchAllData();
  }, 3000);

  // SSE removed — no longer needed with manual refresh

  // Sort violations newest first
  const sortedViolations = [...violations].sort((a, b) => {
    const ta =
      typeof a.timestamp === "number"
        ? a.timestamp
        : new Date(a.timestamp as string).getTime();
    const tb =
      typeof b.timestamp === "number"
        ? b.timestamp
        : new Date(b.timestamp as string).getTime();
    return tb - ta;
  });

  const vehicleScoreMap = buildVehicleScoreMap(violations);
  const nonEmergencyViolations = violations.filter(
    (v) =>
      !v.violationType?.toLowerCase().includes("accident") &&
      !v.violationType?.toLowerCase().includes("collision"),
  );
  const totalViolations = nonEmergencyViolations.length;
  const totalScore = nonEmergencyViolations.reduce(
    (sum, v) => sum + (Number(v.score) || 0),
    0,
  );
  const accidentCount = violations.filter(
    (v) =>
      v.violationType?.toLowerCase().includes("accident") ||
      v.violationType?.toLowerCase().includes("collision"),
  ).length;
  const _totalFineCollected = nonEmergencyViolations.reduce(
    (sum, v) => sum + (Number(getViolationFine(v)) || 0),
    0,
  );
  const uniqueVehicleNos = Array.from(
    new Set(nonEmergencyViolations.map((v) => v.vehicleNo)),
  );
  const flaggedVehicles = uniqueVehicleNos.filter((vNo) =>
    isVehicleFlagged(vNo, nonEmergencyViolations),
  ).length;
  // FIX: Use API score when available, fall back to local sum
  const effectiveTotalScore = apiTotalScore >= 0 ? apiTotalScore : totalScore;
  const risk = getRiskLevel(effectiveTotalScore);

  // emergencyEvents is fetched from /emergencies endpoint (see state above)
  // Also include violations with category === 'EVENT' from main violations list
  const categoryEventViolations = violations.filter(
    (v) => (v as any).category === "EVENT",
  );
  const allEmergencyEvents = [
    ...accidentAlerts,
    ...emergencyEvents.filter((ev) => {
      const key = `${ev.vehicleNo}-${ev.timestamp}`;
      return !accidentAlerts.some(
        (a) => `${a.vehicleNo}-${a.timestamp}` === key,
      );
    }),
    ...categoryEventViolations.filter((v) => {
      const key = `${v.vehicleNo}-${v.timestamp}`;
      return (
        !accidentAlerts.some((a) => `${a.vehicleNo}-${a.timestamp}` === key) &&
        !emergencyEvents.some((e) => `${e.vehicleNo}-${e.timestamp}` === key)
      );
    }),
  ];

  const tableViolations = sortedViolations.filter((v) => {
    const vType = v.violationType?.toLowerCase() || "";
    if (vType.includes("accident") || vType.includes("collision")) return false;
    // If category is set, only show "VIOLATION" category in main table
    if ((v as any).category && (v as any).category !== "VIOLATION")
      return false;
    return true;
  });

  const lastEventTime =
    violations.length > 0
      ? formatDateTime(
          (violations[violations.length - 1] as any).dateTime ||
            violations[violations.length - 1].timestamp,
        )
      : "No events yet";

  const CARD_BG = "#f8fafc";
  const CARD_BORDER = "#e5e7eb";

  const statCards = [
    {
      label: "Total Violations",
      value: loading && violations.length === 0 ? "—" : String(totalViolations),
      icon: Activity,
      accent: "#3b82f6",
      ocid: "dashboard.total_violations.card",
      to: "/violations" as const,
    },
    {
      label: "Vehicles Flagged",
      value: loading && violations.length === 0 ? "—" : String(flaggedVehicles),
      icon: Car,
      accent: "#f97316",
      ocid: "dashboard.vehicles_flagged.card",
      to: "/vehicle-details" as const,
    },
    {
      label: "Total Score",
      value:
        loading && violations.length === 0 ? "—" : String(effectiveTotalScore),
      icon: TrendingUp,
      accent: effectiveTotalScore >= CHALLAN_THRESHOLD ? "#ef4444" : "#64748b",
      ocid: "dashboard.total_score.card",
      to: "/analytics" as const,
    },
    {
      label: "Total Fine Collected",
      value:
        loading && violations.length === 0
          ? "—"
          : `₹${_totalFineCollected.toLocaleString("en-IN")}`,
      icon: CreditCard,
      accent: "#22c55e",
      ocid: "dashboard.total_fine.card",
      to: "/violations" as const,
    },
    {
      label: "Accident Alerts",
      value: loading && violations.length === 0 ? "—" : String(accidentCount),
      icon: AlertCircle,
      accent: "#ef4444",
      ocid: "dashboard.accident_alerts.card",
      to: "/alerts" as const,
    },
  ];

  const handleViewChallan = (
    vehicleNo: string,
    groupViolations?: NodeViolation[],
  ) => {
    setChallanVehicleNo(vehicleNo);
    setChallanGroupViolations(groupViolations);
    setChallanModalOpen(true);
  };
  const handleOpenPayment = (vehicleNo: string, gId?: string) => {
    setPaymentVehicleNo(vehicleNo);
    setPaymentGroupId(gId);
    setPaymentModalOpen(true);
  };
  const handlePaymentSuccess = (vehicleNo: string) => {
    setPaidVehicles((prev) => new Set(prev).add(vehicleNo));
    // Refresh paidGroupIds from localStorage
    setPaidGroupIds(getPaidGroupIds());
  };

  const challanVehicleScore = challanGroupViolations
    ? challanGroupViolations.reduce((s, v) => s + v.score, 0)
    : challanVehicleNo
      ? (vehicleScoreMap.get(challanVehicleNo) ?? 0)
      : 0;
  const challanVehicleFine = challanVehicleScore * 1000;

  const handleResetData = () => {
    if (
      !window.confirm(
        "Reset all local data? Payment statuses and popup history will be cleared.",
      )
    )
      return;
    localStorage.removeItem("lastShownChallanId");
    localStorage.removeItem("paidViolationGroups");
    localStorage.removeItem(POPUP_SHOWN_KEY);
    popupShownRef.current = false;
    setPaidGroupIds(new Set());
    setApiTotalScore(0);
    setViolations([]);
    setEmergencyEvents([]);
    setAccidentAlerts([]);
    setCenterAlert(null);
    lastSeenViolationTimeRef.current = "";
    previousViolationsRef.current = new Set();
    notifiedThresholdRef.current = false;
    multipleAlertShownRef.current = false;
    _emergencyAlertShownIdsRef.current = new Set();
    _shownGroupAlertsRef.current = new Set();
    shownEmergencyAlertsRef.current = new Set();
  };

  return (
    <div className="space-y-8">
      {/* Alert sound element */}
      {/* biome-ignore lint/a11y/useMediaCaption: alert sound has no captions needed */}
      <audio
        id="alertSound"
        src="https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
        preload="auto"
        style={{ display: "none" }}
      />
      {/* Connecting to server banner */}
      {connecting && (
        <div
          data-ocid="dashboard.connecting.card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 20px",
            borderRadius: 10,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "#1d4ed8" }}
          />
          <span>
            Connecting to server… please wait
            {retryAttempt > 0 && (
              <span
                style={{ fontWeight: 400, color: "#3b82f6", marginLeft: 8 }}
              >
                (attempt {retryAttempt} / 10)
              </span>
            )}
          </span>
        </div>
      )}
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxUrl(null)}
          aria-label="Close lightbox overlay"
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-2 right-2 z-10 p-1 rounded-full"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxUrl}
              alt="Violation evidence"
              className="max-w-full max-h-screen object-contain"
              style={{ borderRadius: "8px" }}
            />
          </div>
        </div>
      )}

      {/* Center Alert Popup */}
      {centerAlert && (
        <CenterAlertPopup
          open={!!centerAlert}
          type={centerAlert.type}
          vehicleNo={centerAlert.vehicleNo}
          totalScore={centerAlert.totalScore}
          onClose={() => {
            // Key already added to _suppressedPopupKeys before popup was shown
            setCenterAlert(null);
          }}
          onViewChallan={
            centerAlert.type === "multipleViolation" && centerAlert.vehicleNo
              ? () => {
                  const grpViolations = centerAlert.groupId
                    ? violationGroups.find(
                        (g) => g.groupId === centerAlert.groupId,
                      )?.violations
                    : undefined;
                  handleViewChallan(centerAlert.vehicleNo!, grpViolations);
                }
              : undefined
          }
          onPayNow={
            centerAlert.type === "multipleViolation"
              ? () => {
                  setCenterAlert(null);
                  handleOpenPayment("KL59AB1234");
                }
              : undefined
          }
          imageUrl={
            emergencyViolation?.image
              ? `${BASE}${emergencyViolation.path || emergencyViolation.image}`
              : emergencyViolation?.imageUrl
          }
          locationStr={
            emergencyViolation?.lat && emergencyViolation?.lng
              ? `N ${emergencyViolation.lat} / E ${emergencyViolation.lng}`
              : undefined
          }
        />
      )}

      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#0B0B60",
          backgroundColor: "rgba(22,163,74,0.05)",
        }}
      >
        <h1
          className="text-2xl md:text-3xl font-extrabold mb-1"
          style={{ color: "#1f2937" }}
        >
          Motor Vehicle Department
        </h1>
        <p className="text-sm font-medium mb-2" style={{ color: "#6b7280" }}>
          Smart Violation Monitoring System · Live Monitoring Dashboard
        </p>
        <p className="leading-relaxed text-sm" style={{ color: "#374151" }}>
          The Smart Vehicle Blackbox Enforcement System monitors real-time
          traffic violations, generates challans automatically, and forwards
          repeat offenders to RTO authorities. Data updates every 3 seconds.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            data-ocid="dashboard.reset_data.button"
            variant="outline"
            size="sm"
            onClick={handleResetData}
            className="text-xs gap-1.5"
            style={{ borderColor: "#d1d5db", color: "#6b7280" }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset Data
          </Button>
        </div>
      </div>

      {/* SECTION 1: Vehicle Monitoring */}
      <section data-ocid="dashboard.vehicle_monitoring.section">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4" style={{ color: "#16a34a" }} />
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#16a34a" }}
          >
            Live Vehicle Monitoring
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <CameraCard
            label="Driver Camera (Inside Camera)"
            streamSrc={streamUrl}
          />
        </div>
      </section>

      {/* SECTION 2: Stat Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            {loading ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                <span style={{ color: "#6b7280" }} className="font-medium">
                  Loading live data...
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: "#22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="font-semibold" style={{ color: "#16a34a" }}>
                  Live Feed Active
                </span>
                <span style={{ color: "#6b7280" }}>·</span>
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  Auto-refresh every 3s
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: systemOnline ? "#dcfce7" : "#fee2e2",
                color: systemOnline ? "#16a34a" : "#dc2626",
                border: `1px solid ${systemOnline ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: systemOnline ? "#16a34a" : "#dc2626",
                  display: "inline-block",
                }}
              />
              {systemOnline ? "ONLINE" : "OFFLINE"}
            </div>
            {lastUpdated && (
              <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
                Updated: {lastUpdated.toLocaleTimeString("en-IN")}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                to={card.to}
                data-ocid={card.ocid}
                className="block group"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="rounded-xl overflow-hidden relative transition-all duration-150 group-hover:shadow-xl group-hover:-translate-y-0.5"
                  style={{
                    backgroundColor: CARD_BG,
                    border: "1px solid #e2e8f0",
                    borderLeftWidth: "4px",
                    borderLeftColor: card.accent,
                    cursor: "pointer",
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className="text-xs font-bold uppercase tracking-widest leading-tight"
                        style={{ color: "#6b7280", letterSpacing: "0.08em" }}
                      >
                        {card.label}
                      </span>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${card.accent}20` }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: card.accent }}
                        />
                      </div>
                    </div>
                    <p
                      className="text-3xl font-black leading-none break-all"
                      style={{ color: card.accent }}
                    >
                      {card.value}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: Driver Risk + System Status */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            data-ocid="dashboard.driver_risk.card"
            className="rounded-xl shadow-md p-6"
            style={{
              backgroundColor: CARD_BG,
              border: `2px solid ${risk.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: risk.color }} />
              <h3
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#6b7280" }}
              >
                Driver Risk Level
              </h3>
            </div>
            <p
              className="text-5xl font-black tracking-tight mb-2"
              style={{ color: risk.color }}
            >
              {risk.label}
            </p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              Based on total violation score:{" "}
              <strong style={{ color: "#374151" }}>
                {effectiveTotalScore}
              </strong>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: "#e2e8f0" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((effectiveTotalScore / 15) * 100, 100)}%`,
                    backgroundColor: risk.color,
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: risk.color }}>
                {effectiveTotalScore}/15+
              </span>
            </div>
          </div>

          <div
            data-ocid="dashboard.system_status.card"
            className="rounded-xl shadow-md p-6"
            style={{
              backgroundColor: CARD_BG,
              border: "1px solid #e2e8f0",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: "#16a34a" }} />
              <h3
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#6b7280" }}
              >
                System Status
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#374151" }}>
                  ESP Connection
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#22c55e" }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#16a34a" }}
                  >
                    ACTIVE
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#374151" }}>
                  Vehicle Status
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#22c55e" }}
                  />
                  <span
                    className="text-sm font-bold"
                    style={{ color: "#16a34a" }}
                  >
                    ONLINE
                  </span>
                </div>
              </div>
              <div
                className="pt-2 border-t"
                style={{ borderColor: CARD_BORDER }}
              >
                <p className="text-xs mb-0.5" style={{ color: "#6b7280" }}>
                  Last Event Time
                </p>
                <p
                  className="text-sm font-semibold font-mono"
                  style={{ color: "#374151" }}
                >
                  {lastEventTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Violation Groups */}
      <section data-ocid="dashboard.violation_groups.section">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4" style={{ color: "#0B0B60" }} />
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0B0B60" }}
          >
            Violation Groups
          </h2>
          <span className="ml-auto text-xs" style={{ color: "#6b7280" }}>
            {violationGroups.length} group
            {violationGroups.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div
            data-ocid="dashboard.violation_groups.loading_state"
            className="flex items-center justify-center py-10 gap-2"
            style={{ color: "#6b7280" }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading groups...</span>
          </div>
        ) : violationGroups.length === 0 ? (
          <div
            data-ocid="dashboard.violation_groups.empty_state"
            className="rounded-xl border py-8 text-center"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <FileText
              className="w-8 h-8 mx-auto mb-2 opacity-20"
              style={{ color: "#6b7280" }}
            />
            <p className="text-sm" style={{ color: "#6b7280" }}>
              No violations yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {violationGroups.map((group: ViolationGroup, gIdx: number) => {
              const groupNum = gIdx + 1;
              const firstV = group.violations[0];
              const vehicleNo = firstV?.vehicleNo || "UNKNOWN";
              const isGroupPaid =
                paidGroupIds.has(group.groupId) || group.isPaid;
              return (
                <div
                  key={group.groupId}
                  data-ocid={`group-card.item.${groupNum}`}
                  className="rounded-xl overflow-hidden shadow-sm"
                  style={{
                    border: group.isComplete
                      ? isGroupPaid
                        ? "2px solid #bbf7d0"
                        : "2px solid #fecaca"
                      : "2px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                  }}
                >
                  {/* Group header */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{
                      backgroundColor: group.isComplete
                        ? isGroupPaid
                          ? "#f0fdf4"
                          : "#fef2f2"
                        : "#f8fafc",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="font-extrabold text-sm"
                        style={{ color: "#0B0B60" }}
                      >
                        Violation Group {groupNum}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: group.isComplete
                            ? isGroupPaid
                              ? "#dcfce7"
                              : "#fee2e2"
                            : "#f1f5f9",
                          color: group.isComplete
                            ? isGroupPaid
                              ? "#16a34a"
                              : "#dc2626"
                            : "#64748b",
                        }}
                      >
                        Score: {group.totalScore}
                      </span>
                      {group.isComplete && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: isGroupPaid
                              ? "#dcfce7"
                              : "#fee2e2",
                            color: isGroupPaid ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {isGroupPaid ? "PAID" : "Challan Generated"}
                        </span>
                      )}
                    </div>
                    <span
                      className="font-black font-mono text-sm"
                      style={{ color: "#0B0B60" }}
                    >
                      {vehicleNo}
                    </span>
                  </div>

                  {/* Violations table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          {[
                            "Violation Type",
                            "Location",
                            "Camera",
                            "Score",
                            "Fine",
                            "Date & Time",
                            "Image",
                          ].map((col) => (
                            <th
                              key={col}
                              className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wider"
                              style={{ color: "#6b7280" }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.violations.map((v, vIdx) => {
                          const inside = isInsideCamViolation(v.violationType);
                          const imgUrl = v.image
                            ? `${BASE}${v.path || v.image}`
                            : normalizeImageUrl(v.imageUrl);
                          return (
                            <tr
                              key={`${group.groupId}-v${vIdx}`}
                              style={{
                                backgroundColor:
                                  vIdx % 2 === 0 ? "#ffffff" : "#fafafa",
                                borderBottom: "1px solid #f1f5f9",
                              }}
                            >
                              <td
                                className="px-4 py-2 font-semibold"
                                style={{ color: "#1f2937" }}
                              >
                                {v.violationType}
                              </td>
                              <td
                                className="px-4 py-2 text-xs"
                                style={{ color: "#374151", maxWidth: 120 }}
                              >
                                {v.location ? (
                                  <span>
                                    📍 {v.location}
                                    <br />
                                    <span style={{ color: "#9ca3af" }}>
                                      ({v.lat ?? "—"}, {v.lng ?? "—"})
                                    </span>
                                  </span>
                                ) : v.lat && v.lng ? (
                                  <span>
                                    📍 ({v.lat}, {v.lng})
                                  </span>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>—</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className="text-xs font-bold px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: inside
                                      ? "#eff6ff"
                                      : "#f0fdf4",
                                    color: inside ? "#1d4ed8" : "#15803d",
                                    border: inside
                                      ? "1px solid #bfdbfe"
                                      : "1px solid #bbf7d0",
                                  }}
                                >
                                  {inside ? "Inside Cam" : "Inside Cam"}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className="font-black text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      v.score >= 5
                                        ? "#fee2e2"
                                        : v.score >= 3
                                          ? "#fff7ed"
                                          : "#dcfce7",
                                    color:
                                      v.score >= 5
                                        ? "#dc2626"
                                        : v.score >= 3
                                          ? "#d97706"
                                          : "#16a34a",
                                  }}
                                >
                                  {v.score}
                                </span>
                              </td>
                              <td
                                className="px-4 py-2 font-bold text-xs"
                                style={{ color: "#dc2626" }}
                              >
                                ₹{getViolationFine(v).toLocaleString("en-IN")}
                              </td>
                              <td
                                className="px-4 py-2 text-xs font-mono"
                                style={{ color: "#374151" }}
                              >
                                {getViolationDateTime(v)}
                              </td>
                              <td className="px-4 py-2">
                                {imgUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(imgUrl)}
                                    className="focus:outline-none"
                                    aria-label="View evidence image"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt="Evidence"
                                      className="w-14 h-10 object-cover rounded cursor-zoom-in hover:opacity-80 transition-opacity"
                                      style={{ border: "1px solid #e2e8f0" }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  </button>
                                ) : (
                                  <span
                                    className="text-xs italic"
                                    style={{ color: "#9ca3af" }}
                                  >
                                    No image
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Group footer */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{
                      borderTop: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div className="flex items-center gap-4 text-sm">
                      <span style={{ color: "#374151" }}>
                        <strong>Total Score:</strong>{" "}
                        <span
                          className="font-black"
                          style={{
                            color:
                              group.totalScore >= 5 ? "#dc2626" : "#374151",
                          }}
                        >
                          {group.totalScore}
                        </span>
                      </span>
                      <span style={{ color: "#374151" }}>
                        <strong>Total Fine:</strong>{" "}
                        <span
                          className="font-black"
                          style={{ color: "#dc2626" }}
                        >
                          ₹{group.totalFine.toLocaleString("en-IN")}
                        </span>
                      </span>
                      {!group.isComplete && (
                        <span className="text-xs" style={{ color: "#6b7280" }}>
                          Score: {group.totalScore}/5 – Accumulating
                          violations...
                        </span>
                      )}
                    </div>

                    {group.isComplete && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          data-ocid={`group.download_button.${groupNum}`}
                          onClick={() =>
                            handleViewChallan(vehicleNo, group.violations)
                          }
                          className="text-xs h-7 px-2 whitespace-nowrap"
                          style={{
                            borderColor: "#16a34a",
                            color: "#16a34a",
                            borderRadius: "3px",
                          }}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download Challan
                        </Button>
                        {isGroupPaid ? (
                          <span
                            className="text-xs font-black px-3 py-1 rounded"
                            style={{
                              backgroundColor: "#dcfce7",
                              color: "#16a34a",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            PAID ✓
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            data-ocid={`group.pay_button.${groupNum}`}
                            onClick={() =>
                              handleOpenPayment(vehicleNo, group.groupId)
                            }
                            className="text-xs h-7 px-2 whitespace-nowrap"
                            style={{
                              backgroundColor: "#15803d",
                              color: "#ffffff",
                              borderRadius: "3px",
                            }}
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            Pay Fine
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 5: Violation Records Table */}
      <section data-ocid="dashboard.violations.section">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#16a34a" }}
          >
            Violation Records
          </h2>
          <Link
            to="/violations"
            className="text-xs font-semibold underline"
            data-ocid="dashboard.violations_view_all.link"
            style={{ color: "#16a34a" }}
          >
            View All →
          </Link>
        </div>

        <div
          className="rounded-xl shadow-md overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ backgroundColor: "#f1f5f9" }}
          >
            <div className="flex items-center gap-2">
              <Siren className="w-4 h-4" style={{ color: "#16a34a" }} />
              <span
                className="font-bold text-sm uppercase tracking-widest"
                style={{ color: "#374151" }}
              >
                Recent Violations
              </span>
            </div>
            <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
              {loading
                ? "Loading..."
                : `${violations.length} record${violations.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div
              data-ocid="dashboard.violations_table.loading_state"
              className="flex items-center justify-center py-10 gap-2"
              style={{ color: "#6b7280" }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                Connecting to enforcement network...
              </span>
            </div>
          ) : tableViolations.length === 0 ? (
            <div
              data-ocid="dashboard.violations_table.empty_state"
              className="py-10 text-center text-sm"
              style={{ color: "#6b7280" }}
            >
              No violations recorded yet. System is actively monitoring.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="dashboard.violations.table">
                <TableHeader>
                  <TableRow
                    className="hover:bg-transparent border-b"
                    style={{
                      backgroundColor: "#f1f5f9",
                      borderColor: "#dbeafe",
                    }}
                  >
                    {[
                      "Vehicle Number",
                      "Owner Name",
                      "Violation Type",
                      "Camera",
                      "Score",
                      "Fine Amount",
                      "Date & Time",
                      "Violation Image",
                      "Status",
                    ].map((col) => (
                      <TableHead
                        key={col}
                        className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                        style={{ color: "#6b7280" }}
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableViolations.map((violation, index) => {
                    const imageUrl = violation.image
                      ? `${BASE}${violation.path || violation.image}`
                      : normalizeImageUrl(violation.imageUrl);
                    const vehicleScore =
                      vehicleScoreMap.get(violation.vehicleNo) ?? 0;
                    const isPaidVehicle = paidVehicles.has(violation.vehicleNo);
                    const inside = isInsideCamViolation(
                      violation.violationType,
                    );
                    const rowNum = index + 1;
                    const ownerName = violation.ownerName || DEFAULT_OWNER;

                    return (
                      <TableRow
                        key={`${violation.vehicleNo}-${violation.timestamp}-${index}`}
                        data-ocid={`dashboard.violations.row.${rowNum}`}
                        className="border-b transition-colors"
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#fafafa",
                          borderColor: "#e2e8f0",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.backgroundColor = "#f0f4ff";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.backgroundColor =
                            index % 2 === 0 ? "#ffffff" : "#fafafa";
                        }}
                      >
                        <TableCell
                          className="font-bold text-sm py-3 font-mono tracking-wide"
                          style={{ color: "#0B0B60" }}
                        >
                          {violation.vehicleNo}
                        </TableCell>
                        <TableCell
                          className="text-sm py-3 font-medium"
                          style={{ color: "#374151" }}
                        >
                          <div>{ownerName}</div>
                          <div className="text-xs" style={{ color: "#6b7280" }}>
                            {violation.mobile || DEFAULT_MOBILE}
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-sm py-3"
                          style={{ color: "#1f2937" }}
                        >
                          <span className="font-semibold">
                            {violation.violationType}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: inside ? "#eff6ff" : "#f0fdf4",
                              color: inside ? "#1d4ed8" : "#15803d",
                              border: inside
                                ? "1px solid #bfdbfe"
                                : "1px solid #bbf7d0",
                            }}
                          >
                            {inside ? "Inside" : "Inside"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span
                            className="font-black text-sm px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                violation.score >= 5
                                  ? "#fee2e2"
                                  : violation.score >= 3
                                    ? "#fff7ed"
                                    : "#dcfce7",
                              color:
                                violation.score >= 5
                                  ? "#dc2626"
                                  : violation.score >= 3
                                    ? "#d97706"
                                    : "#16a34a",
                            }}
                          >
                            {violation.score}
                          </span>
                        </TableCell>
                        <TableCell
                          className="py-3 font-semibold text-sm"
                          style={{ color: "#dc2626" }}
                        >
                          {`₹${getViolationFine(violation).toLocaleString("en-IN")}`}
                        </TableCell>
                        <TableCell
                          className="text-sm py-3 whitespace-nowrap font-mono text-xs"
                          style={{ color: "#374151" }}
                        >
                          {getViolationDateTime(violation)}
                        </TableCell>
                        <TableCell className="py-3">
                          {imageUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(imageUrl)}
                              className="block focus:outline-none focus:ring-2 rounded"
                              aria-label="View violation proof image fullscreen"
                            >
                              <img
                                src={imageUrl}
                                alt="Evidence"
                                className="w-16 h-12 object-cover border-2 hover:opacity-80 transition-all cursor-zoom-in"
                                style={{
                                  borderRadius: "3px",
                                  borderColor: "#e2e8f0",
                                }}
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect fill="%23f1f5f9" width="64" height="48"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </button>
                          ) : (
                            <span
                              className="text-xs italic"
                              style={{ color: "#6b7280" }}
                            >
                              No image
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(vehicleScore, isPaidVehicle)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: Emergency Events */}
      <section data-ocid="dashboard.emergency_events.section">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" style={{ color: "#dc2626" }} />
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#dc2626" }}
          >
            Emergency Events
          </h2>
        </div>
        {allEmergencyEvents.length === 0 ? (
          <div
            data-ocid="dashboard.emergency_events.empty_state"
            className="rounded-xl border py-8 text-center"
            style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
          >
            <AlertCircle
              className="w-8 h-8 mx-auto mb-2 opacity-20"
              style={{ color: "#dc2626" }}
            />
            <p className="text-sm" style={{ color: "#6b7280" }}>
              No emergency events recorded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allEmergencyEvents.map((ev, idx) => {
              const ownerName = ev.ownerName || DEFAULT_OWNER;
              const ownerMobile = ev.mobile || DEFAULT_MOBILE;
              const driverImg = normalizeImageUrl(
                (ev as NodeViolation & { driverImage?: string }).driverImage,
              );
              return (
                <div
                  key={`${ev.vehicleNo}-${ev.timestamp}-${idx}`}
                  data-ocid={`dashboard.emergency_events.item.${idx + 1}`}
                  className="rounded-xl shadow-md overflow-hidden"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "2px solid #991b1b",
                  }}
                >
                  <div className="px-4 py-2" style={{ background: "#fee2e2" }}>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#dc2626" }}
                    >
                      {ev.violationType}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <p
                      className="font-black text-base font-mono"
                      style={{ color: "#0B0B60" }}
                    >
                      {ev.vehicleNo}
                    </p>
                    <p className="text-xs" style={{ color: "#374151" }}>
                      <span style={{ color: "#6b7280" }}>Owner:</span>{" "}
                      {ownerName} &nbsp;·&nbsp; {ownerMobile}
                    </p>
                    <p
                      className="text-xs font-mono"
                      style={{ color: "#6b7280" }}
                    >
                      {getViolationDateTime(ev)}
                    </p>
                    {ev.location && (
                      <p
                        className="text-xs font-semibold"
                        style={{ color: "#374151" }}
                      >
                        📍 {ev.location}
                      </p>
                    )}
                    {(() => {
                      const emergencyLat =
                        ev.lat != null && ev.lat !== 0 ? ev.lat : 12.0978888;
                      const emergencyLng =
                        ev.lng != null && ev.lng !== 0 ? ev.lng : 75.5605588;
                      return (
                        <div className="space-y-1">
                          <div
                            className="text-xs font-mono font-semibold"
                            style={{ color: "#374151" }}
                          >
                            <span>N {emergencyLat}</span>
                            <br />
                            <span>E {emergencyLng}</span>
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${emergencyLat},${emergencyLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-ocid={`dashboard.emergency_events.map_marker.${idx + 1}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold underline"
                            style={{ color: "#16a34a" }}
                          >
                            <MapPin className="w-3 h-3" />
                            View on Google Maps
                          </a>
                        </div>
                      );
                    })()}
                    {ev.image || ev.imageUrl || driverImg ? (
                      <img
                        src={
                          ev.image
                            ? `${BASE}${ev.path || ev.image}`
                            : ev.imageUrl || driverImg
                        }
                        alt="Emergency evidence"
                        className="w-full h-24 object-cover rounded mt-2"
                        style={{ border: "1px solid #e2e8f0" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: 12 }}>
                        No Image Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Navigation */}
      <section>
        <h2
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "#6b7280" }}
        >
          Quick Navigation
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              to: "/violations",
              icon: AlertCircle,
              label: "Live Violations",
              desc: "Monitor real-time traffic violations.",
              ocid: "dashboard.violations.link",
            },
            {
              to: "/vehicle-details",
              icon: Car,
              label: "Vehicle Details",
              desc: "Look up vehicle info and violation history.",
              ocid: "dashboard.vehicle_details.link",
            },
            {
              to: "/challans",
              icon: Shield,
              label: "Challan Management",
              desc: "View and manage traffic challans.",
              ocid: "dashboard.challans.link",
            },
            {
              to: "/challan-preview",
              icon: FileText,
              label: "Challan Preview",
              desc: "Preview and download official challan documents.",
              ocid: "dashboard.challan_preview.link",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="block group"
                data-ocid={item.ocid}
              >
                <div
                  className="border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
                  style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "#22c55e";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "#e2e8f0";
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "#16a34a" }} />
                    </div>
                    <h2
                      className="text-sm font-bold leading-tight pt-1"
                      style={{ color: "#1f2937" }}
                    >
                      {item.label}
                    </h2>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#6b7280" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Challan Preview Modal */}
      <ChallanPreviewModal
        open={challanModalOpen}
        onOpenChange={(open) => {
          setChallanModalOpen(open);
          if (!open) setChallanGroupViolations(undefined);
        }}
        violations={violations}
        vehicleNo={challanVehicleNo}
        totalScore={challanVehicleScore}
        totalFine={challanVehicleFine}
        isPaid={paidVehicles.has(challanVehicleNo)}
        groupViolations={challanGroupViolations}
        data-ocid="dashboard.challan_modal.dialog"
        onPayNow={() => {
          setChallanModalOpen(false);
          setPaymentModalOpen(true);
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        violations={violations}
        vehicleNo={paymentVehicleNo}
        challanId={`SMVB-${Date.now().toString().slice(-8)}`}
        totalFine={
          paymentVehicleNo
            ? (vehicleScoreMap.get(paymentVehicleNo) ?? 0) * 1000
            : 0
        }
        groupId={paymentGroupId}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Legacy Alert Modal */}
      {alertModal && (
        <AlertModal
          type={alertModal.type}
          vehicleNo={alertModal.vehicleNo}
          onClose={() => setAlertModal(null)}
          onViewChallan={
            alertModal.type === "multiple"
              ? () => {
                  setAlertModal(null);
                  handleViewChallan(alertModal.vehicleNo);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
