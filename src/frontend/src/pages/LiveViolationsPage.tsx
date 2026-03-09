import ChallanPreviewModal from "@/components/ChallanPreviewModal";
import EmptyState from "@/components/EmptyState";
import LatestViolationCard from "@/components/LatestViolationCard";
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
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  Siren,
  X,
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

/** Build a map of vehicleNo → total score across all violations */
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

export default function LiveViolationsPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Challan modal state
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState<string>("");

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState<string>("");

  // Paid vehicles set
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const previousViolationsRef = useRef<Set<string>>(new Set());
  const previousTotalScoreRef = useRef<number>(0);

  const loadViolations = async () => {
    try {
      setError(null);
      const data = await fetchViolations();

      const newViolations = data.filter((v) => {
        const key = `${v.vehicleNo}-${v.timestamp}`;
        return !previousViolationsRef.current.has(key);
      });

      if (newViolations.length > 0 && previousViolationsRef.current.size > 0) {
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

      const totalScore = data.reduce((sum, v) => sum + v.score, 0);

      if (
        totalScore >= 5 &&
        previousTotalScoreRef.current < 5 &&
        previousViolationsRef.current.size > 0
      ) {
        showNotification(
          "Multiple Violations Detected — Data Forwarded to Authorities",
          "report",
          "Total score ≥5. Challan auto-generated and forwarded to RTO.",
        );
      }

      const currentViolationKeys = new Set(
        data.map((v) => `${v.vehicleNo}-${v.timestamp}`),
      );
      previousViolationsRef.current = currentViolationKeys;
      previousTotalScoreRef.current = totalScore;

      setViolations(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch violations",
      );
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadViolations is stable
  useEffect(() => {
    loadViolations();
  }, []);

  useInterval(() => {
    loadViolations();
  }, 3000);

  const vehicleScoreMap = buildVehicleScoreMap(violations);
  const globalTotalScore = violations.reduce((sum, v) => sum + v.score, 0);

  const latestViolation =
    violations.length > 0
      ? violations.reduce((latest, current) =>
          new Date(current.timestamp as string).getTime() >
          new Date(latest.timestamp as string).getTime()
            ? current
            : latest,
        )
      : null;

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

  const handleViewVehicle = (vehicleNo: string) => {
    navigate({ to: "/vehicle-details", search: { vehicleNo } });
  };

  // Get total fine for the selected challan vehicle
  const challanVehicleFine = challanVehicleNo
    ? getVehicleTotalFine(challanVehicleNo, violations)
    : 0;
  const challanVehicleScore = challanVehicleNo
    ? (vehicleScoreMap.get(challanVehicleNo) ?? 0)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 pl-6" style={{ borderLeftColor: "#0B3D91" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#0B3D91" }}>
            Live Violation Monitoring
          </h1>
          <p className="text-gray-600 text-sm">
            Real-time traffic violations — Motor Vehicle Department Portal
          </p>
        </div>
        <div
          data-ocid="violations.loading_state"
          className="flex items-center justify-center py-16 border border-gray-200 bg-gray-50 rounded-lg"
        >
          <RefreshCw
            className="w-6 h-6 animate-spin"
            style={{ color: "#0B3D91" }}
          />
          <span className="ml-3 text-gray-600 font-medium">
            Connecting to enforcement network...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 pl-6" style={{ borderLeftColor: "#0B3D91" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#0B3D91" }}>
            Live Violation Monitoring
          </h1>
          <p className="text-gray-600 text-sm">
            Real-time traffic violations — Motor Vehicle Department Portal
          </p>
        </div>
        <div
          data-ocid="violations.error_state"
          className="bg-red-50 border border-red-300 p-6 flex items-start gap-3 rounded-lg"
        >
          <AlertCircle className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              System Connection Error
            </h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              type="button"
              onClick={loadViolations}
              className="mt-3 text-sm underline text-red-800 hover:text-red-900 font-medium"
            >
              Retry connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="border-l-4 pl-5" style={{ borderLeftColor: "#0B3D91" }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#0B3D91" }}>
          Live Violation Monitoring
        </h1>
        <p className="text-gray-600 text-sm">
          Real-time traffic violations — Motor Vehicle Department Portal
        </p>
      </div>

      {/* Status Bar */}
      {lastUpdated && (
        <div className="flex items-center justify-between text-xs text-gray-500 bg-white border border-gray-200 px-4 py-2.5 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: "#22c55e",
                boxShadow: "0 0 6px #22c55e",
                animation: "pulse 2s infinite",
              }}
            />
            <span className="font-semibold" style={{ color: "#16a34a" }}>
              Live
            </span>
            <span className="text-gray-400">—</span>
            <span>Auto-refreshing every 3 seconds</span>
          </div>
          <span className="font-mono">
            Last updated:{" "}
            <span className="font-semibold text-gray-700">
              {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          </span>
        </div>
      )}

      {/* Score ≥ 5 Critical Alert (global) */}
      {globalTotalScore >= 5 && (
        <div
          data-ocid="violations.score_alert.panel"
          className="flex items-start gap-4 px-5 py-4 rounded-lg shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)",
            border: "2px solid #ef4444",
            animation: "pulse 2s infinite",
          }}
          role="alert"
        >
          <Siren
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            style={{ color: "#fca5a5" }}
          />
          <div className="flex-1">
            <p className="font-extrabold text-white text-base leading-tight tracking-wide">
              ⚠ Multiple violations detected. Data forwarded to authorities.
            </p>
            <p
              className="text-sm font-semibold mt-1"
              style={{ color: "#fca5a5" }}
            >
              Challan Generated
            </p>
          </div>
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: "#fca5a5" }}
          />
        </div>
      )}

      {violations.length === 0 ? (
        <div data-ocid="violations.empty_state">
          <EmptyState message="No violations recorded yet. System is actively monitoring." />
        </div>
      ) : (
        <>
          {/* Latest Violation Card */}
          {latestViolation && (
            <LatestViolationCard
              violation={latestViolation}
              onViewChallan={() => handleViewChallan(latestViolation.vehicleNo)}
              onViewVehicle={() => handleViewVehicle(latestViolation.vehicleNo)}
            />
          )}

          {/* Violations Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
            {/* Table header bar */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#0B3D91" }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-white opacity-80" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  Violation Records
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "#93c5fd" }}>
                {violations.length} record{violations.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table data-ocid="violations.table">
                <TableHeader>
                  <TableRow
                    className="hover:bg-transparent border-b border-gray-200"
                    style={{ backgroundColor: "#eef2f9" }}
                  >
                    {[
                      "Vehicle Number",
                      "Violation Type",
                      "Score",
                      "Fine Amount",
                      "Time",
                      "Evidence Image",
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
                        data-ocid={`violations.row.${rowNum}`}
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

                        {/* Violation Type */}
                        <TableCell className="text-gray-800 text-sm py-3">
                          <span className="font-semibold">
                            {violation.violationType}
                          </span>
                        </TableCell>

                        {/* Score (per violation) */}
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

                        {/* Time */}
                        <TableCell className="text-gray-600 text-sm py-3 whitespace-nowrap font-mono text-xs">
                          {formatDateTime(violation.timestamp)}
                        </TableCell>

                        {/* Evidence Image */}
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

                        {/* Status — based on vehicle total score */}
                        <TableCell className="py-3">
                          {getStatusBadge(vehicleScore, isPaidVehicle)}
                        </TableCell>

                        {/* Action — based on vehicle total score */}
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
                                  data-ocid={`violations.download_challan_button.${rowNum}`}
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
                                  Download Challan
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
                                    data-ocid={`violations.pay_challan_button.${rowNum}`}
                                    onClick={() =>
                                      handleOpenPayment(violation.vehicleNo)
                                    }
                                    className="text-xs h-7 px-2 whitespace-nowrap transition-colors"
                                    style={{
                                      backgroundColor: "#047857",
                                      color: "#ffffff",
                                      borderRadius: "3px",
                                    }}
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    Pay Challan
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
          </div>
        </>
      )}

      {/* Challan Preview Modal */}
      <ChallanPreviewModal
        open={challanModalOpen}
        onOpenChange={setChallanModalOpen}
        violations={violations}
        vehicleNo={challanVehicleNo}
        totalScore={challanVehicleScore}
        totalFine={challanVehicleFine}
        isPaid={paidVehicles.has(challanVehicleNo)}
        data-ocid="violations.challan_modal.dialog"
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
          data-ocid="violations.evidence.modal"
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
            data-ocid="violations.evidence.close_button"
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
