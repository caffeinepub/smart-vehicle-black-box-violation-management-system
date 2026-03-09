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
import { type NodeViolation, fetchViolations } from "@/lib/api";
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

const FINE_AMOUNTS: Record<string, number> = {
  Overspeeding: 2000,
  "No Helmet": 1000,
  "Red Light Violation": 1000,
  "Wrong Side Driving": 5000,
  "No Seatbelt": 1000,
  "Mobile Usage": 1000,
  "Drunk Driving": 10000,
};

// Score mapping for 12-hour calculation
const VIOLATION_SCORE_MAP: Record<string, number> = {
  Seatbelt: 1,
  "Door Open": 1,
  "Harsh Braking": 3,
  "Alcohol Low": 3,
  "Alcohol High": 5,
  "Drowsy Driving": 5,
  "Harsh Driving": 5,
};

function formatDateTime(timestamp: string | number): string {
  if (!timestamp) return "—";
  let d = new Date(timestamp as string);
  if (Number.isNaN(d.getTime()) && typeof timestamp === "string") {
    const asNum = Number(timestamp);
    if (!Number.isNaN(asNum)) d = new Date(asNum);
  }
  if (Number.isNaN(d.getTime())) return String(timestamp);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-IN", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
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
    .reduce(
      (sum, v) => sum + (v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 1000),
      0,
    );
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
          color: "#166534",
          border: "1px solid #86efac",
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
          color: "#991b1b",
          border: "1px solid #fca5a5",
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
          backgroundColor: "#fff7ed",
          color: "#c2410c",
          border: "1px solid #fdba74",
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
        color: "#166534",
        border: "1px solid #86efac",
        borderRadius: "3px",
      }}
    >
      Low Risk Violation
    </Badge>
  );
}

function getRiskLevel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score < 3) {
    return { label: "LOW", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" };
  }
  if (score <= 4) {
    return {
      label: "MEDIUM",
      color: "#c2410c",
      bg: "#fff7ed",
      border: "#fdba74",
    };
  }
  return { label: "HIGH", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" };
}

// Camera Card Component
function CameraCard({
  label,
  streamSrc,
}: { label: string; streamSrc: string }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md"
      style={{ border: "1px solid #1e3a6e", background: "#0a1628" }}
    >
      {/* Dark header bar */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "#0B3D91" }}
      >
        <Camera className="w-4 h-4 text-white opacity-80" />
        <span className="text-white font-bold text-xs uppercase tracking-widest">
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
      {/* Stream area */}
      <div
        className="relative flex items-center justify-center"
        style={{ minHeight: "200px", background: "#0d1b2a" }}
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
              className="w-8 h-8 opacity-30"
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

  // Challan modal
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState<string>("");

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState<string>("");

  // Paid vehicles
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const previousViolationsRef = useRef<Set<string>>(new Set());
  const notifiedThresholdRef = useRef<boolean>(false);

  // Request browser notification permission on mount
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

        // 12-hour score for browser notification
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
        // Reset threshold if score drops below 5
        if (score12h < 5) {
          notifiedThresholdRef.current = false;
        }

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

  const vehicleScoreMap = buildVehicleScoreMap(violations);
  const totalViolations = violations.length;
  const uniqueVehicles = new Set(violations.map((v) => v.vehicleNo)).size;
  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const score12h = get12HourScore(violations);
  const accidentCount = violations.filter((v) =>
    v.violationType?.toLowerCase().includes("accident"),
  ).length;

  const risk = getRiskLevel(score12h);

  // Emergency events: accident or collision
  const emergencyEvents = violations.filter(
    (v) =>
      v.violationType?.toLowerCase().includes("accident") ||
      v.violationType?.toLowerCase().includes("collision"),
  );

  const lastEventTime =
    violations.length > 0
      ? formatDateTime(violations[violations.length - 1].timestamp)
      : "No events yet";

  const statCards = [
    {
      label: "Total Violations",
      value: loading ? "—" : String(totalViolations),
      icon: Activity,
      accent: "#0B3D91",
      iconBg: "rgba(11,61,145,0.1)",
      ocid: "dashboard.total_violations.card",
      to: "/violations" as const,
    },
    {
      label: "Vehicles Flagged",
      value: loading ? "—" : String(uniqueVehicles),
      icon: Car,
      accent: "#b45309",
      iconBg: "rgba(245,158,11,0.12)",
      ocid: "dashboard.vehicles_flagged.card",
      to: "/vehicle-details" as const,
    },
    {
      label: "Total Score",
      value: loading ? "—" : String(totalScore),
      icon: TrendingUp,
      accent: totalScore >= 5 ? "#dc2626" : "#374151",
      iconBg: totalScore >= 5 ? "rgba(220,38,38,0.1)" : "rgba(107,114,128,0.1)",
      ocid: "dashboard.total_score.card",
      to: "/analytics" as const,
    },
    {
      label: "Accident Alerts",
      value: loading ? "—" : String(accidentCount),
      icon: AlertCircle,
      accent: "#dc2626",
      iconBg: "rgba(220,38,38,0.1)",
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
      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#0B3D91",
          backgroundColor: "rgba(11,61,145,0.04)",
        }}
      >
        <h1
          className="text-2xl md:text-3xl font-extrabold mb-1"
          style={{ color: "#0B3D91" }}
        >
          Motor Vehicle Department
        </h1>
        <p className="text-gray-500 text-sm font-medium mb-2">
          Smart Violation Monitoring System · Live Monitoring Dashboard
        </p>
        <p className="text-gray-600 leading-relaxed text-sm">
          The Smart Vehicle Blackbox Enforcement System monitors real-time
          traffic violations, generates challans automatically, and forwards
          repeat offenders to RTO authorities. Data updates every 2 seconds.
        </p>
      </div>

      {/* ── SECTION 1: Vehicle Monitoring ── */}
      <section data-ocid="dashboard.vehicle_monitoring.section">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4" style={{ color: "#0B3D91" }} />
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0B3D91" }}
          >
            Vehicle Monitoring
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CameraCard
            label="Inside Camera"
            streamSrc="http://ESP_INSIDE_IP:81/stream"
          />
          <CameraCard
            label="Front Camera"
            streamSrc="http://ESP_FRONT_IP:81/stream"
          />
        </div>
      </section>

      {/* ── SECTION 2: Stat Cards + Status Bar ── */}
      <section>
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm">
            {loading ? (
              <>
                <span
                  className="inline-block w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: "pulse 1s infinite" }}
                />
                <span className="text-gray-500 font-medium">
                  Loading live data...
                </span>
              </>
            ) : (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: "#22c55e",
                    boxShadow: "0 0 6px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="font-semibold" style={{ color: "#16a34a" }}>
                  Live Feed Active
                </span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 text-xs">
                  Auto-refresh every 2s
                </span>
              </>
            )}
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-400 font-mono">
              Updated: {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          )}
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  className="bg-white rounded-xl overflow-hidden relative transition-all duration-150 group-hover:shadow-xl group-hover:-translate-y-0.5"
                  style={{
                    borderLeft: `4px solid ${card.accent}`,
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                  }}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: "#9ca3af", letterSpacing: "0.1em" }}
                      >
                        {card.label}
                      </span>
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: card.iconBg }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: card.accent }}
                        />
                      </div>
                    </div>
                    <p
                      className="text-4xl font-black leading-none"
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
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 opacity-30"
                      style={{ backgroundColor: card.accent }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 3: Driver Risk Level + System Status ── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Driver Risk Level Card */}
          <div
            data-ocid="dashboard.driver_risk.card"
            className="bg-white rounded-xl shadow-md p-6"
            style={{
              border: `2px solid ${risk.border}`,
              background: risk.bg,
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
            <p className="text-xs text-gray-500">
              Based on 12-hour violation score: <strong>{score12h}</strong>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((score12h / 10) * 100, 100)}%`,
                    backgroundColor: risk.color,
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: risk.color }}>
                {score12h}/10
              </span>
            </div>
          </div>

          {/* System Status Card */}
          <div
            data-ocid="dashboard.system_status.card"
            className="bg-white rounded-xl shadow-md p-6"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4" style={{ color: "#0B3D91" }} />
              <h3
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#6b7280" }}
              >
                System Status
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">ESP Connection</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: "#22c55e",
                      boxShadow: "0 0 5px #22c55e",
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
                <span className="text-sm text-gray-600">Vehicle Status</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: "#22c55e",
                      boxShadow: "0 0 5px #22c55e",
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
              <div className="pt-2 border-t" style={{ borderColor: "#e5e7eb" }}>
                <p className="text-xs text-gray-400 mb-0.5">Last Event Time</p>
                <p className="text-sm font-semibold text-gray-700 font-mono">
                  {lastEventTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Live Violations Table ── */}
      <section data-ocid="dashboard.violations.section">
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#0B3D91" }}
          >
            Live Violations
          </h2>
          <Link
            to="/violations"
            className="text-xs font-semibold underline"
            data-ocid="dashboard.violations_view_all.link"
            style={{ color: "#0B3D91" }}
          >
            View All →
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          {/* Table header bar */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ backgroundColor: "#0B3D91" }}
          >
            <div className="flex items-center gap-2">
              <Siren className="w-4 h-4 text-white opacity-80" />
              <span className="text-white font-bold text-sm uppercase tracking-widest">
                Recent Violations
              </span>
            </div>
            <span className="text-xs font-mono" style={{ color: "#93c5fd" }}>
              {loading
                ? "Loading..."
                : `${violations.length} record${violations.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div
              data-ocid="dashboard.violations_table.loading_state"
              className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to enforcement network...</span>
            </div>
          ) : violations.length === 0 ? (
            <div
              data-ocid="dashboard.violations_table.empty_state"
              className="py-10 text-center text-gray-400 text-sm"
            >
              No violations recorded yet. System is actively monitoring.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="dashboard.violations.table">
                <TableHeader>
                  <TableRow
                    className="hover:bg-transparent border-b border-gray-200"
                    style={{ backgroundColor: "#eef2f9" }}
                  >
                    {[
                      "Vehicle Number",
                      "Owner Name",
                      "Violation Type",
                      "Score",
                      "Fine Amount",
                      "Date and Time",
                      "Violation Image",
                      "Status",
                      "Action",
                    ].map((col) => (
                      <TableHead
                        key={col}
                        className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                        style={{ color: "#1e3a6e" }}
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation, index) => {
                    const imageUrl = normalizeImageUrl(violation.imageUrl);
                    const vehicleScore =
                      vehicleScoreMap.get(violation.vehicleNo) ?? 0;
                    const isPaidVehicle = paidVehicles.has(violation.vehicleNo);
                    const showChallanActions = vehicleScore >= 5;
                    const rowNum = index + 1;

                    return (
                      <TableRow
                        key={`${violation.vehicleNo}-${violation.timestamp}-${index}`}
                        data-ocid={`dashboard.violations.row.${rowNum}`}
                        className="border-b border-gray-100 transition-colors"
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? "#ffffff" : "#f8faff",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLTableRowElement
                          ).style.backgroundColor =
                            index % 2 === 0 ? "#ffffff" : "#f8faff";
                        }}
                      >
                        {/* Vehicle Number */}
                        <TableCell
                          className="font-bold text-sm py-3 font-mono tracking-wide"
                          style={{ color: "#0B3D91" }}
                        >
                          {violation.vehicleNo}
                        </TableCell>

                        {/* Owner Name */}
                        <TableCell className="text-gray-700 text-sm py-3 font-medium">
                          {violation.ownerName || "—"}
                        </TableCell>

                        {/* Violation Type */}
                        <TableCell className="text-gray-800 text-sm py-3">
                          <span className="font-semibold">
                            {violation.violationType}
                          </span>
                        </TableCell>

                        {/* Score */}
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
                                  ? "#991b1b"
                                  : violation.score >= 3
                                    ? "#c2410c"
                                    : "#166534",
                            }}
                          >
                            {violation.score}
                          </span>
                        </TableCell>

                        {/* Fine Amount */}
                        <TableCell
                          className="py-3 font-semibold text-sm"
                          style={{ color: "#dc2626" }}
                        >
                          {violation.fineAmount != null
                            ? `₹${violation.fineAmount}`
                            : `₹${FINE_AMOUNTS[violation.violationType] ?? 1000}`}
                        </TableCell>

                        {/* Date and Time */}
                        <TableCell className="text-gray-600 text-sm py-3 whitespace-nowrap font-mono text-xs">
                          {formatDateTime(violation.timestamp)}
                        </TableCell>

                        {/* Violation Image */}
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
                                className="w-16 h-12 object-cover border-2 border-gray-200 hover:opacity-80 hover:border-blue-400 transition-all cursor-zoom-in"
                                style={{ borderRadius: "3px" }}
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect fill="%23f3f4f6" width="64" height="48"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              No image
                            </span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          {getStatusBadge(vehicleScore, isPaidVehicle)}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3">
                          {showChallanActions ? (
                            <div className="flex flex-col gap-1.5">
                              {!isPaidVehicle && (
                                <div>
                                  <p
                                    className="text-xs font-semibold leading-tight"
                                    style={{ color: "#b91c1c" }}
                                  >
                                    Multiple violations detected. Data forwarded
                                    to authorities.
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
                                    borderColor: "#0B3D91",
                                    color: "#0B3D91",
                                    borderRadius: "3px",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "#0B3D91";
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.color = "#ffffff";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.backgroundColor = "transparent";
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.color = "#0B3D91";
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
                                      color: "#166534",
                                      border: "1px solid #86efac",
                                    }}
                                  >
                                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                    Paid ✓
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
                                      backgroundColor: "#047857",
                                      color: "#ffffff",
                                      borderRadius: "3px",
                                    }}
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    Pay
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
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

      {/* ── SECTION 5: Emergency Events ── */}
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
            className="bg-white rounded-xl border border-gray-200 py-8 text-center"
          >
            <AlertCircle
              className="w-8 h-8 mx-auto mb-2 opacity-20"
              style={{ color: "#dc2626" }}
            />
            <p className="text-gray-400 text-sm">
              No emergency events recorded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {emergencyEvents.map((ev, idx) => (
              <div
                key={`${ev.vehicleNo}-${ev.timestamp}-${idx}`}
                data-ocid={`dashboard.emergency_events.item.${idx + 1}`}
                className="bg-white rounded-xl shadow-md overflow-hidden"
                style={{ border: "2px solid #fca5a5" }}
              >
                <div
                  className="px-4 py-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
                  }}
                >
                  <span className="text-white text-xs font-bold uppercase tracking-widest">
                    {ev.violationType}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <p
                    className="font-black text-base font-mono"
                    style={{ color: "#0B3D91" }}
                  >
                    {ev.vehicleNo}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {formatDateTime(ev.timestamp)}
                  </p>
                  {ev.lat != null && ev.lng != null ? (
                    <a
                      href={`https://www.google.com/maps?q=${ev.lat},${ev.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-ocid={`dashboard.emergency_events.map_marker.${idx + 1}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold underline"
                      style={{ color: "#0B3D91" }}
                    >
                      <MapPin className="w-3 h-3" />
                      View on Google Maps
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Location not available
                    </span>
                  )}
                </div>
              </div>
            ))}
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
          <Link
            to="/violations"
            className="block group"
            data-ocid="dashboard.violations.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <AlertCircle
                    className="w-5 h-5"
                    style={{ color: "#0B3D91" }}
                  />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Live Violations
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Monitor real-time traffic violations detected by vehicle black
                box systems.
              </p>
            </div>
          </Link>

          <Link
            to="/vehicle-details"
            className="block group"
            data-ocid="dashboard.vehicle_details.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <Car className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Vehicle Details
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Look up registered vehicle information and violation history.
              </p>
            </div>
          </Link>

          <Link
            to="/challans"
            className="block group"
            data-ocid="dashboard.challans.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <Shield className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Challan Management
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                View and manage traffic challans, fine amounts, and violation
                evidence.
              </p>
            </div>
          </Link>

          <Link
            to="/challan-preview"
            className="block group"
            data-ocid="dashboard.challan_preview.link"
          >
            <div
              className="bg-white border-2 p-5 rounded-xl h-full transition-all duration-200 group-hover:shadow-lg"
              style={{ borderColor: "transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "#0B3D91";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "transparent";
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(11,61,145,0.1)" }}
                >
                  <FileText className="w-5 h-5" style={{ color: "#0B3D91" }} />
                </div>
                <h2
                  className="text-sm font-bold leading-tight pt-1"
                  style={{ color: "#0B3D91" }}
                >
                  Challan Preview
                </h2>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Preview and download official traffic challan documents.
              </p>
            </div>
          </Link>
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

      {/* Fullscreen Image Lightbox */}
      {lightboxUrl && (
        <div
          data-ocid="dashboard.evidence.modal"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxUrl(null);
          }}
          tabIndex={-1}
          aria-modal="true"
          aria-label="Evidence image fullscreen view"
        >
          <button
            type="button"
            data-ocid="dashboard.evidence.close_button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white rounded-full p-2 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close fullscreen image"
          >
            <X className="w-7 h-7" />
          </button>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: propagation-stop only */}
          <img
            src={lightboxUrl}
            alt="Evidence fullscreen"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
