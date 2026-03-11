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
import {
  type NodeViolation,
  fetchViolations,
  getViolationFine,
} from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  Siren,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

function getStatusBadge(
  vehicleScore: number,
  isPaid: boolean,
): React.ReactNode {
  if (isPaid)
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
        Fine Paid ✓
      </Badge>
    );
  if (vehicleScore >= 5)
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
  if (vehicleScore >= 3)
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

export default function LiveViolationsPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState<string>("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState<string>("");
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const previousViolationsRef = useRef<Set<string>>(new Set());
  const previousTotalScoreRef = useRef<number>(0);

  const loadViolations = async () => {
    try {
      setError(null);
      const data = await fetchViolations();
      const newViolations = data.filter(
        (v) =>
          !previousViolationsRef.current.has(`${v.vehicleNo}-${v.timestamp}`),
      );
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
          "Multiple Violations Detected – Data Forwarded to Authorities",
          "report",
          "Total score ≥5. Challan auto-generated.",
        );
      }
      previousViolationsRef.current = new Set(
        data.map((v) => `${v.vehicleNo}-${v.timestamp}`),
      );
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

  // Sort descending by timestamp
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

  const latestViolation = sortedViolations[0] ?? null;
  const challanVehicleFine = challanVehicleNo
    ? getVehicleTotalFine(challanVehicleNo, violations)
    : 0;
  const challanVehicleScore = challanVehicleNo
    ? (vehicleScoreMap.get(challanVehicleNo) ?? 0)
    : 0;

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

  const CARD_BG = "#f8fafc";
  const CARD_BORDER = "#e2e8f0";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 pl-6" style={{ borderLeftColor: "#1d4ed8" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#1f2937" }}>
            Live Violation Monitoring
          </h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Real-time traffic violations — SAFEWAY Smart Monitoring System
          </p>
        </div>
        <div
          data-ocid="violations.loading_state"
          className="flex items-center justify-center py-16 rounded-lg"
          style={{
            backgroundColor: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
          }}
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: "#16a34a" }}
          />
          <span className="ml-3 font-medium" style={{ color: "#6b7280" }}>
            Connecting to enforcement network...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 pl-6" style={{ borderLeftColor: "#1d4ed8" }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#1f2937" }}>
            Live Violation Monitoring
          </h1>
        </div>
        <div
          data-ocid="violations.error_state"
          className="p-6 flex items-start gap-3 rounded-lg"
          style={{ backgroundColor: "#fee2e2", border: "1px solid #fecaca" }}
        >
          <AlertCircle
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            style={{ color: "#dc2626" }}
          />
          <div>
            <h3 className="font-semibold mb-1" style={{ color: "#dc2626" }}>
              System Connection Error
            </h3>
            <p className="text-sm" style={{ color: "#dc2626" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={loadViolations}
              className="mt-3 text-sm underline font-medium"
              style={{ color: "#dc2626" }}
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
      <div className="border-l-4 pl-5" style={{ borderLeftColor: "#1d4ed8" }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#1f2937" }}>
          Live Violation Monitoring
        </h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Real-time traffic violations — SAFEWAY Smart Monitoring System
        </p>
      </div>

      {/* Status Bar */}
      {lastUpdated && (
        <div
          className="flex items-center justify-between text-xs px-4 py-2.5 rounded-lg"
          style={{
            backgroundColor: CARD_BG,
            border: `1px solid ${CARD_BORDER}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: "#22c55e",
                boxShadow: "none",
                animation: "pulse 2s infinite",
              }}
            />
            <span className="font-semibold" style={{ color: "#16a34a" }}>
              Live
            </span>
            <span style={{ color: "#e2e8f0" }}>—</span>
            <span style={{ color: "#6b7280" }}>
              Auto-refreshing every 3 seconds
            </span>
          </div>
          <span className="font-mono" style={{ color: "#6b7280" }}>
            Last updated:{" "}
            <span className="font-semibold" style={{ color: "#374151" }}>
              {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          </span>
        </div>
      )}

      {/* Multiple violation alert */}
      {globalTotalScore >= 5 && (
        <div
          data-ocid="violations.score_alert.panel"
          className="flex items-start gap-4 px-5 py-4 rounded-lg shadow-lg"
          style={{
            background: "#fee2e2",
            border: "2px solid #dc2626",
          }}
          role="alert"
        >
          <Siren
            className="w-6 h-6 flex-shrink-0 mt-0.5"
            style={{ color: "#dc2626" }}
          />
          <div className="flex-1">
            <p
              className="font-extrabold text-base leading-tight tracking-wide"
              style={{ color: "#dc2626" }}
            >
              ⚠ Multiple Violations Detected – Data forwarded to authorities
            </p>
            <p
              className="text-sm font-semibold mt-1"
              style={{ color: "#dc2626" }}
            >
              Challan Generated
            </p>
          </div>
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: "#dc2626" }}
          />
        </div>
      )}

      {violations.length === 0 ? (
        <div data-ocid="violations.empty_state">
          <EmptyState message="No violations recorded yet. System is actively monitoring." />
        </div>
      ) : (
        <>
          {latestViolation && (
            <LatestViolationCard
              violation={latestViolation}
              onViewChallan={() => handleViewChallan(latestViolation.vehicleNo)}
              onViewVehicle={() => handleViewVehicle(latestViolation.vehicleNo)}
            />
          )}

          <div
            className="rounded-xl shadow-md overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${CARD_BORDER}`,
            }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ backgroundColor: "#f1f5f9" }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: "#16a34a" }} />
                <span
                  className="font-bold text-sm uppercase tracking-widest"
                  style={{ color: "#374151" }}
                >
                  Violation Records
                </span>
              </div>
              <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
                {violations.length} record{violations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table data-ocid="violations.table">
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
                    const showChallanActions = vehicleScore >= 5;
                    const rowNum = index + 1;
                    const ownerName = violation.ownerName || DEFAULT_OWNER;
                    const ownerMobile = violation.mobile || DEFAULT_MOBILE;

                    return (
                      <TableRow
                        key={`${violation.vehicleNo}-${violation.timestamp}-${index}`}
                        data-ocid={`violations.row.${rowNum}`}
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
                            {ownerMobile}
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
                        >{`₹${getViolationFine(violation).toLocaleString("en-IN")}`}</TableCell>
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
                              className="block focus:outline-none rounded"
                              aria-label="View evidence"
                            >
                              <img
                                src={imageUrl}
                                alt="Evidence"
                                className="w-16 h-12 object-cover cursor-zoom-in transition-all hover:opacity-80"
                                style={{
                                  borderRadius: "3px",
                                  border: "1px solid #e2e8f0",
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
                                  data-ocid={`violations.download_challan_button.${rowNum}`}
                                  onClick={() =>
                                    handleViewChallan(violation.vehicleNo)
                                  }
                                  className="text-xs h-7 px-2 whitespace-nowrap"
                                  style={{
                                    borderColor: "#22c55e",
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
                                    data-ocid={`violations.pay_challan_button.${rowNum}`}
                                    onClick={() =>
                                      handleOpenPayment(violation.vehicleNo)
                                    }
                                    className="text-xs h-7 px-2 whitespace-nowrap"
                                    style={{
                                      backgroundColor: "#15803d",
                                      color: "#fff",
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
          </div>
        </>
      )}

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
        >
          <button
            type="button"
            data-ocid="violations.evidence.close_button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white rounded-full p-2"
            aria-label="Close"
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
