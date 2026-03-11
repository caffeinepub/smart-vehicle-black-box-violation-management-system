import AlertModal, { type AlertModalType } from "@/components/AlertModal";
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
  fetchViolations,
  getViolationFine,
} from "@/lib/api";
import {
  playAlarmSound,
  playEmergencyAlarm,
  playViolationBeep,
} from "@/lib/sounds";
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
  Shield,
  Siren,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function formatDateTime(timestamp: string | number): string {
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

function buildVehicleScoreMap(
  violations: NodeViolation[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const v of violations) {
    map.set(v.vehicleNo, (map.get(v.vehicleNo) ?? 0) + v.score);
  }
  return map;
}

function getVehicleTotalFine(
  vehicleNo: string,
  violations: NodeViolation[],
): number {
  return violations
    .filter((v) => v.vehicleNo === vehicleNo)
    .reduce((sum, v) => sum + getViolationFine(v), 0);
}

function get12HourScore(violations: NodeViolation[]): number {
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
  if (score <= 3)
    return { label: "LOW", color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" };
  if (score <= 7)
    return {
      label: "MEDIUM",
      color: "#f97316",
      bg: "#fff7ed",
      border: "#fed7aa",
    };
  return { label: "HIGH", color: "#dc2626", bg: "#fee2e2", border: "#fecaca" };
}

function CameraCard({
  label,
  streamSrc,
}: { label: string; streamSrc: string }) {
  const [hasError, setHasError] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden shadow-md"
      style={{ border: "1px solid #bfdbfe", background: "#f8fafc" }}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "#f1f5f9" }}
      >
        <Camera className="w-4 h-4" style={{ color: "#16a34a" }} />
        <span
          className="font-bold text-xs uppercase tracking-widest"
          style={{ color: "#374151" }}
        >
          {label}
        </span>
        <div
          className="ml-auto w-2 h-2 rounded-full"
          style={{
            backgroundColor: hasError ? "#ef4444" : "#22c55e",
            boxShadow: hasError ? "0 0 6px #ef4444" : "0 0 6px #22c55e",
          }}
        />
      </div>
      <div
        className="relative flex items-center justify-center"
        style={{ minHeight: "200px", background: "#f1f5f9" }}
      >
        {!hasError ? (
          <img
            src={streamSrc}
            alt={`${label} stream`}
            className="w-full object-contain"
            style={{ maxHeight: "240px", display: "block" }}
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <Camera
              className="w-8 h-8 opacity-20"
              style={{ color: "#6b7280" }}
            />
            <p className="text-sm font-medium" style={{ color: "#6b7280" }}>
              Camera unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState<string>("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState<string>("");
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const previousViolationsRef = useRef<Set<string>>(new Set());
  const notifiedThresholdRef = useRef<boolean>(false);
  const [alertModal, setAlertModal] = useState<{
    type: AlertModalType;
    vehicleNo: string;
  } | null>(null);
  const multipleAlertShownRef = useRef<boolean>(false);
  const emergencyAlertShownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const loadData = () => {
    fetchViolations()
      .then((data) => {
        const newViolations = data.filter((v) => {
          const key = `${v.vehicleNo}-${v.timestamp}`;
          return !previousViolationsRef.current.has(key);
        });
        if (
          newViolations.length > 0 &&
          previousViolationsRef.current.size > 0
        ) {
          for (const v of newViolations) {
            showNotification(
              "Traffic Violation Detected",
              "alert",
              `Detected at ${formatDateTime(v.timestamp)}`,
              v.vehicleNo,
              v.violationType,
              v.score,
              v.fineAmount,
            );
          }
        }
        const score12h = get12HourScore(data);
        if (
          score12h >= 5 &&
          !notifiedThresholdRef.current &&
          previousViolationsRef.current.size > 0
        ) {
          notifiedThresholdRef.current = true;
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("SAFEWAY ALERT", {
              body: "Multiple violations detected. Challan generated.",
            });
          }
        }
        if (score12h < 5) notifiedThresholdRef.current = false;
        const currentKeys = new Set(
          data.map((v) => `${v.vehicleNo}-${v.timestamp}`),
        );
        previousViolationsRef.current = currentKeys;
        setViolations(data);
        setLastUpdated(new Date());
      })
      .catch(() => setViolations([]))
      .finally(() => setLoading(false));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable
  useEffect(() => {
    loadData();
  }, []);
  useInterval(() => {
    loadData();
  }, 2000);

  // SSE
  useEffect(() => {
    const API_BASE = "https://vehicle-blackbox-system-1.onrender.com";
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    function connect() {
      es = new EventSource(`${API_BASE}/events`);
      es.onmessage = (event) => {
        try {
          const v: NodeViolation = JSON.parse(event.data);
          setViolations((prev) => {
            const key = `${v.vehicleNo}-${v.timestamp}`;
            if (prev.some((p) => `${p.vehicleNo}-${p.timestamp}` === key))
              return prev;

            // Sound: beep or emergency alarm
            const vType = (v.violationType || "").toLowerCase();
            if (vType.includes("accident") || vType.includes("collision")) {
              playEmergencyAlarm();
              const evKey = key;
              if (!emergencyAlertShownIdsRef.current.has(evKey)) {
                emergencyAlertShownIdsRef.current.add(evKey);
                setAlertModal({ type: "emergency", vehicleNo: v.vehicleNo });
              }
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("SAFEWAY EMERGENCY", {
                  body: `Possible accident/collision detected for ${v.vehicleNo}`,
                });
              }
            } else {
              playViolationBeep();
            }

            const next = [v, ...prev];
            const totalScore12h = get12HourScore(next);

            if (totalScore12h >= 5 && !multipleAlertShownRef.current) {
              multipleAlertShownRef.current = true;
              playAlarmSound();
              setAlertModal({ type: "multiple", vehicleNo: v.vehicleNo });
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("SAFEWAY ALERT", {
                  body: "Multiple violations detected. Challan generated.",
                });
              }
            }
            if (totalScore12h < 5) multipleAlertShownRef.current = false;

            return next;
          });
          setLastUpdated(new Date());
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }
    connect();
    return () => {
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

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
  const totalViolations = violations.length;
  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const accidentCount = violations.filter((v) =>
    v.violationType?.toLowerCase().includes("accident"),
  ).length;
  const totalFineCollected = violations.reduce(
    (sum, v) => sum + getViolationFine(v),
    0,
  );
  const uniqueVehicleNos = Array.from(
    new Set(violations.map((v) => v.vehicleNo)),
  );
  const flaggedVehicles = uniqueVehicleNos.filter((vNo) =>
    isVehicleFlagged(vNo, violations),
  ).length;
  const risk = getRiskLevel(totalScore);

  const emergencyEvents = sortedViolations.filter(
    (v) =>
      v.violationType?.toLowerCase().includes("accident") ||
      v.violationType?.toLowerCase().includes("collision"),
  );

  const lastEventTime =
    violations.length > 0
      ? formatDateTime(violations[violations.length - 1].timestamp)
      : "No events yet";

  const CARD_BG = "#f8fafc";
  const CARD_BORDER = "#e5e7eb";

  const statCards = [
    {
      label: "Total Violations",
      value: loading ? "—" : String(totalViolations),
      icon: Activity,
      accent: "#3b82f6",
      ocid: "dashboard.total_violations.card",
      to: "/violations" as const,
    },
    {
      label: "Vehicles Flagged",
      value: loading ? "—" : String(flaggedVehicles),
      icon: Car,
      accent: "#f97316",
      ocid: "dashboard.vehicles_flagged.card",
      to: "/vehicle-details" as const,
    },
    {
      label: "Total Score",
      value: loading ? "—" : String(totalScore),
      icon: TrendingUp,
      accent: totalScore >= 5 ? "#ef4444" : "#64748b",
      ocid: "dashboard.total_score.card",
      to: "/analytics" as const,
    },
    {
      label: "Total Fine Collected",
      value: loading ? "—" : `₹${totalFineCollected.toLocaleString("en-IN")}`,
      icon: CreditCard,
      accent: "#22c55e",
      ocid: "dashboard.total_fine.card",
      to: "/violations" as const,
    },
    {
      label: "Accident Alerts",
      value: loading ? "—" : String(accidentCount),
      icon: AlertCircle,
      accent: "#ef4444",
      ocid: "dashboard.accident_alerts.card",
      to: "/alerts" as const,
    },
  ];

  const handleViewChallan = (vehicleNo: string) => {
    setChallanVehicleNo(vehicleNo);
    setChallanModalOpen(true);
  };
  const handleOpenPayment = (vehicleNo: string) => {
    setPaymentVehicleNo(vehicleNo);
    setPaymentModalOpen(true);
  };
  const handlePaymentSuccess = (vehicleNo: string) => {
    setPaidVehicles((prev) => new Set(prev).add(vehicleNo));
  };

  const challanVehicleFine = challanVehicleNo
    ? getVehicleTotalFine(challanVehicleNo, violations)
    : 0;
  const challanVehicleScore = challanVehicleNo
    ? (vehicleScoreMap.get(challanVehicleNo) ?? 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxUrl(null)}
          aria-modal="true"
          aria-label="Evidence image"
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

      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#1d4ed8",
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
      </div>

      {/* SECTION 1: Vehicle Monitoring */}
      <section data-ocid="dashboard.vehicle_monitoring.section">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4" style={{ color: "#16a34a" }} />
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#16a34a" }}
          >
            Vehicle Monitoring
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CameraCard
            label="Driver Camera"
            streamSrc="http://ESP_INSIDE_CAM_IP:81/stream"
          />
          <CameraCard
            label="Road Camera"
            streamSrc="http://ESP_FRONT_CAM_IP:81/stream"
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
                    boxShadow: "none",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="font-semibold" style={{ color: "#16a34a" }}>
                  Live Feed Active
                </span>
                <span style={{ color: "#6b7280" }}>·</span>
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  Auto-refresh every 2s
                </span>
              </>
            )}
          </div>
          {lastUpdated && (
            <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
              Updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          )}
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
                    borderLeft: `4px solid ${card.accent}`,
                    border: "1px solid #e2e8f0",
                    borderLeftWidth: "4px",
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
                    <p
                      className="text-xs mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: card.accent }}
                    >
                      Click to view →
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
              <strong style={{ color: "#374151" }}>{totalScore}</strong>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: "#e2e8f0" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((totalScore / 15) * 100, 100)}%`,
                    backgroundColor: risk.color,
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: risk.color }}>
                {totalScore}/15+
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
                    style={{
                      backgroundColor: "#22c55e",
                      boxShadow: "none",
                    }}
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
                    style={{
                      backgroundColor: "#22c55e",
                      boxShadow: "none",
                    }}
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

      {/* SECTION 4: Violation Records Table */}
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
          ) : sortedViolations.length === 0 ? (
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
                      "Score",
                      "Fine Amount",
                      "Date & Time",
                      "Violation Image",
                      "Status",
                      "Action",
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
                  {sortedViolations.map((violation, index) => {
                    const imageUrl = normalizeImageUrl(violation.imageUrl);
                    const vehicleScore =
                      vehicleScoreMap.get(violation.vehicleNo) ?? 0;
                    const isPaidVehicle = paidVehicles.has(violation.vehicleNo);
                    const showChallanActions = isVehicleFlagged(
                      violation.vehicleNo,
                      violations,
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
                          style={{ color: "#1d4ed8" }}
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
                          {formatDateTime(violation.timestamp)}
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
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect fill="%23111827" width="64" height="48"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E';
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
                        <TableCell className="py-3">
                          {showChallanActions ? (
                            <div className="flex flex-col gap-1.5">
                              {!isPaidVehicle && (
                                <div>
                                  <p
                                    className="text-xs font-semibold leading-tight"
                                    style={{ color: "#dc2626" }}
                                  >
                                    Multiple Violations Detected – Data
                                    forwarded to authorities
                                  </p>
                                  <p
                                    className="text-xs font-medium mt-0.5 mb-1.5"
                                    style={{ color: "#dc2626" }}
                                  >
                                    Challan Generated
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-ocid={`dashboard.download_challan_button.${rowNum}`}
                                  onClick={() =>
                                    handleViewChallan(violation.vehicleNo)
                                  }
                                  className="text-xs h-7 px-2 whitespace-nowrap transition-colors"
                                  style={{
                                    borderColor: "#16a34a",
                                    color: "#16a34a",
                                    backgroundColor: "transparent",
                                    borderRadius: "3px",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#22c55e";
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.color = "#000";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "transparent";
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.color = "#22c55e";
                                  }}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Challan
                                </Button>
                                {isPaidVehicle ? (
                                  <span
                                    className="text-xs font-bold px-2 py-1 rounded"
                                    style={{
                                      backgroundColor: "#dcfce7",
                                      color: "#16a34a",
                                      border: "1px solid #bbf7d0",
                                    }}
                                  >
                                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                    Fine Paid
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    data-ocid={`dashboard.pay_challan_button.${rowNum}`}
                                    onClick={() =>
                                      handleOpenPayment(violation.vehicleNo)
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
                            </div>
                          ) : (
                            <span
                              className="text-xs italic"
                              style={{ color: "#6b7280" }}
                            >
                              —
                            </span>
                          )}
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

      {/* SECTION 5: Emergency Events */}
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
        {emergencyEvents.length === 0 ? (
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
            {emergencyEvents.map((ev, idx) => {
              const ownerName = ev.ownerName || DEFAULT_OWNER;
              const ownerMobile = ev.mobile || DEFAULT_MOBILE;
              const driverImg = normalizeImageUrl(
                (ev as NodeViolation & { driverImage?: string }).driverImage,
              );
              const outsideImg = normalizeImageUrl(
                (ev as NodeViolation & { outsideImage?: string })
                  .outsideImage || ev.imageUrl,
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
                  <div
                    className="px-4 py-2"
                    style={{
                      background: "#fee2e2",
                    }}
                  >
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
                      style={{ color: "#1d4ed8" }}
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
                      {formatDateTime(ev.timestamp)}
                    </p>
                    {ev.lat != null && ev.lng != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${ev.lat},${ev.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-ocid={`dashboard.emergency_events.map_marker.${idx + 1}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold underline"
                        style={{ color: "#16a34a" }}
                      >
                        <MapPin className="w-3 h-3" />
                        View on Google Maps
                      </a>
                    ) : (
                      <span
                        className="text-xs italic"
                        style={{ color: "#6b7280" }}
                      >
                        Location not available
                      </span>
                    )}
                    {(driverImg || outsideImg) && (
                      <div className="flex gap-2 mt-2">
                        {driverImg && (
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: "#6b7280" }}
                            >
                              Driver
                            </p>
                            <img
                              src={driverImg}
                              alt="Driver"
                              className="w-20 h-14 object-cover rounded"
                              style={{ border: "1px solid #e2e8f0" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        {outsideImg && (
                          <div>
                            <p
                              className="text-xs mb-1"
                              style={{ color: "#6b7280" }}
                            >
                              Outside
                            </p>
                            <img
                              src={outsideImg}
                              alt="Outside camera"
                              className="w-20 h-14 object-cover rounded"
                              style={{ border: "1px solid #e2e8f0" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
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
        onOpenChange={setChallanModalOpen}
        violations={violations}
        vehicleNo={challanVehicleNo}
        totalScore={challanVehicleScore}
        totalFine={challanVehicleFine}
        isPaid={paidVehicles.has(challanVehicleNo)}
        data-ocid="dashboard.challan_modal.dialog"
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
            ? getVehicleTotalFine(paymentVehicleNo, violations)
            : 0
        }
        onPaymentSuccess={handlePaymentSuccess}
      />
      {/* Alert Modal */}
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
