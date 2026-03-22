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
  fetchVehicleScore,
  fetchViolations,
  fetchViolationsWithRetry,
  getViolationFine,
} from "@/lib/api";
import {
  buildViolationGroups,
  getPaidGroupIds,
  isInsideCamViolation,
  markGroupPaid,
} from "@/lib/violationGroups";
import { normalizeImageUrl } from "@/lib/violations/images";
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
import type * as React from "react";
import { useEffect, useRef, useState } from "react";

const BASE = "https://vehicle-blackbox-system-1.onrender.com";

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
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [_apiTotalScore, setApiTotalScore] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [challanVehicleNo, setChallanVehicleNo] = useState("");
  const [challanGroupViolations, setChallanGroupViolations] = useState<
    NodeViolation[] | undefined
  >(undefined);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentVehicleNo, setPaymentVehicleNo] = useState("");
  const [paymentGroupId, setPaymentGroupId] = useState<string | undefined>(
    undefined,
  );
  const [paidVehicles, setPaidVehicles] = useState<Set<string>>(new Set());
  const [paidGroupIds, setPaidGroupIds] = useState<Set<string>>(() =>
    getPaidGroupIds(),
  );

  const previousViolationsRef = useRef<Set<string>>(new Set());

  const loadViolations = () => {
    fetchViolations()
      .then((data) => {
        const newV = data.filter(
          (v) =>
            !previousViolationsRef.current.has(`${v.vehicleNo}-${v.timestamp}`),
        );
        if (newV.length > 0 && previousViolationsRef.current.size > 0) {
          for (const v of newV) {
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
        previousViolationsRef.current = new Set(
          data.map((v) => `${v.vehicleNo}-${v.timestamp}`),
        );
        setViolations(data);
        setError(null);
        // FIX: Supplement local score with backend /api/score/:vehicleId
        fetchVehicleScore("KL59AB1234").then((s) => {
          if (s >= 0) setApiTotalScore(s);
        });
      })
      .catch(() => {
        /* silent on poll failure - keep existing data visible */
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Initial connection with automatic retry (Render cold-start)
  useEffect(() => {
    let cancelled = false;
    const connect = async () => {
      try {
        const data = await fetchViolationsWithRetry(10, 3000, (attempt) => {
          if (!cancelled) {
            setConnecting(true);
            setRetryAttempt(attempt);
          }
        });
        if (cancelled) return;
        setViolations(data);
        setError(null);
      } finally {
        if (!cancelled) {
          setConnecting(false);
          setRetryAttempt(0);
          setLoading(false);
        }
      }
    };
    connect();
    return () => {
      cancelled = true;
    };
  }, []);
  useInterval(loadViolations, 2000);

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

  // Violation groups for current group progress
  const violationGroups = buildViolationGroups(violations, paidGroupIds);
  const currentGroup = violationGroups.find((g) => !g.isComplete);

  const handlePaymentSuccess = (vehicleNo: string) => {
    setPaidVehicles((prev) => new Set(prev).add(vehicleNo));
    setPaidGroupIds(getPaidGroupIds());
  };

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

  return (
    <div className="space-y-6">
      {/* Connecting to server banner */}
      {connecting && (
        <div
          data-ocid="violations.connecting.card"
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
          <button
            type="button"
            className="absolute top-4 right-4 p-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Violation evidence"
            className="max-w-full max-h-screen object-contain"
            style={{ borderRadius: "8px", padding: "1rem" }}
          />
        </div>
      )}

      {/* Page header */}
      <div className="border-l-4 pl-5 py-3" style={{ borderColor: "#0B0B60" }}>
        <h1
          className="text-2xl md:text-3xl font-extrabold mb-1"
          style={{ color: "#1f2937" }}
        >
          Live Violations
        </h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Real-time traffic violation monitoring · Auto-refresh every 2s
        </p>
      </div>

      {/* Current Group Progress Card */}
      <section data-ocid="violations.current_group.card">
        <div
          className="rounded-xl p-5 shadow-sm"
          style={{
            backgroundColor: "#f8fafc",
            border: "2px solid #e2e8f0",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#f97316" }} />
              <h2
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#374151" }}
              >
                Current Group Progress
              </h2>
            </div>
            <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
              {violationGroups.length} group
              {violationGroups.length !== 1 ? "s" : ""} total
            </span>
          </div>

          {currentGroup ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#374151" }}
                    >
                      Score Accumulation
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "#f97316" }}
                    >
                      {currentGroup.totalScore} / 5
                    </span>
                  </div>
                  <div
                    className="w-full h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#e2e8f0" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((currentGroup.totalScore / 5) * 100, 100)}%`,
                        backgroundColor:
                          currentGroup.totalScore >= 4
                            ? "#ef4444"
                            : currentGroup.totalScore >= 2
                              ? "#f97316"
                              : "#22c55e",
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-2xl font-black"
                  style={{
                    color:
                      currentGroup.totalScore >= 4
                        ? "#dc2626"
                        : currentGroup.totalScore >= 2
                          ? "#f97316"
                          : "#16a34a",
                  }}
                >
                  {currentGroup.totalScore}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentGroup.violations.map((v) => (
                  <span
                    key={`cv-${v.violationType}-${v.timestamp}`}
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: "#f1f5f9",
                      color: "#374151",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {v.violationType}
                    <span
                      className="ml-1 font-bold"
                      style={{ color: "#0B0B60" }}
                    >
                      +{v.score}
                    </span>
                  </span>
                ))}
              </div>

              <p className="text-xs" style={{ color: "#6b7280" }}>
                {5 - currentGroup.totalScore} more score point
                {5 - currentGroup.totalScore !== 1 ? "s" : ""} until challan is
                generated.
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: "#6b7280" }}>
                {violations.length === 0
                  ? "No violations recorded yet."
                  : "All violation groups have reached threshold. Awaiting new violations."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Latest violation card */}
      {sortedViolations.length > 0 && (
        <LatestViolationCard
          violation={sortedViolations[0]}
          onViewChallan={() => handleViewChallan(sortedViolations[0].vehicleNo)}
          onViewVehicle={() => {}}
        />
      )}

      {/* Violation table */}
      <section data-ocid="violations.table.section">
        {loading ? (
          <div
            data-ocid="violations.table.loading_state"
            className="flex items-center justify-center py-12 gap-2"
            style={{ color: "#6b7280" }}
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading violations...</span>
          </div>
        ) : error ? (
          <div
            data-ocid="violations.table.error_state"
            className="rounded-xl border p-6 text-center"
            style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
          >
            <AlertCircle
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: "#dc2626" }}
            />
            <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>
              {error}
            </p>
          </div>
        ) : sortedViolations.length === 0 ? (
          <EmptyState
            data-ocid="violations.table.empty_state"
            message="No violations recorded yet. The monitoring system is active."
          />
        ) : (
          <div
            className="rounded-xl shadow-md overflow-hidden"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ backgroundColor: "#f1f5f9" }}
            >
              <Siren className="w-4 h-4" style={{ color: "#0B0B60" }} />
              <span
                className="font-bold text-sm uppercase tracking-widest"
                style={{ color: "#374151" }}
              >
                Violation Records
              </span>
              <span
                className="ml-auto text-xs font-mono"
                style={{ color: "#6b7280" }}
              >
                {sortedViolations.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table data-ocid="violations.table">
                <TableHeader>
                  <TableRow
                    className="hover:bg-transparent"
                    style={{ backgroundColor: "#f8fafc" }}
                  >
                    {[
                      "#",
                      "Vehicle No.",
                      "Owner",
                      "Violation",
                      "Camera",
                      "Score",
                      "Fine",
                      "Date & Time",
                      "Image",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-xs font-bold uppercase tracking-wider py-3 whitespace-nowrap"
                        style={{ color: "#6b7280" }}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const violationTypeCounts = sortedViolations.reduce(
                      (acc, v) => {
                        const key = `${v.vehicleNo}::${v.violationType}`;
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>,
                    );
                    return sortedViolations.map((v, index) => {
                      const imageUrl = v.image
                        ? `${BASE}${v.image}`
                        : normalizeImageUrl(v.imageUrl);
                      const vehicleScore =
                        vehicleScoreMap.get(v.vehicleNo) ?? 0;
                      const isPaidVehicle = paidVehicles.has(v.vehicleNo);
                      const showActions = vehicleScore >= 5;
                      const inside = isInsideCamViolation(v.violationType);
                      const rowNum = index + 1;
                      const ownerName = v.ownerName || DEFAULT_OWNER;
                      const typeKey = `${v.vehicleNo}::${v.violationType}`;
                      const isRepeated =
                        (violationTypeCounts[typeKey] || 0) > 1;
                      const isHighScore = vehicleScore >= 5;

                      return (
                        <TableRow
                          key={`${v.vehicleNo}-${v.timestamp}-${index}`}
                          data-ocid={`violations.row.${rowNum}`}
                          className="border-b transition-colors"
                          style={{
                            backgroundColor: isHighScore
                              ? "#fff5f5"
                              : index % 2 === 0
                                ? "#ffffff"
                                : "#fafafa",
                            borderColor: "#e2e8f0",
                            borderLeft: isHighScore
                              ? "3px solid #dc2626"
                              : undefined,
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLTableRowElement
                            ).style.backgroundColor = isHighScore
                              ? "#ffe4e4"
                              : "#f0f4ff";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLTableRowElement
                            ).style.backgroundColor = isHighScore
                              ? "#fff5f5"
                              : index % 2 === 0
                                ? "#ffffff"
                                : "#fafafa";
                          }}
                        >
                          <TableCell
                            className="py-3 text-xs font-mono"
                            style={{ color: "#9ca3af" }}
                          >
                            {rowNum}
                          </TableCell>
                          <TableCell
                            className="font-bold font-mono tracking-wide py-3"
                            style={{ color: "#0B0B60" }}
                          >
                            {v.vehicleNo}
                          </TableCell>
                          <TableCell
                            className="py-3 text-sm"
                            style={{ color: "#374151" }}
                          >
                            <div className="font-medium">{ownerName}</div>
                            <div
                              className="text-xs"
                              style={{ color: "#6b7280" }}
                            >
                              {v.mobile || DEFAULT_MOBILE}
                            </div>
                          </TableCell>
                          <TableCell
                            className="py-3 font-semibold text-sm"
                            style={{ color: "#1f2937" }}
                          >
                            <div className="flex items-center gap-1.5">
                              {v.violationType}
                              {v.violationType?.toLowerCase() ===
                                "overspeed" && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    color: "#fff",
                                    background: "#c0392b",
                                    borderRadius: 4,
                                    padding: "1px 6px",
                                    fontSize: "0.7em",
                                    fontWeight: 700,
                                    letterSpacing: 1,
                                  }}
                                >
                                  CRITICAL
                                </span>
                              )}
                              {isRepeated && (
                                <span
                                  title="Repeated violation"
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: "#dc2626",
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
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
                              {inside ? "Inside" : "Outside"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <span
                              className="font-black text-xs px-2.5 py-1 rounded-full"
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
                          </TableCell>
                          <TableCell
                            className="py-3 font-semibold text-sm"
                            style={{ color: "#dc2626" }}
                          >
                            ₹{getViolationFine(v).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell
                            className="py-3 text-xs font-mono whitespace-nowrap"
                            style={{ color: "#374151" }}
                          >
                            {formatDateTime(v.timestamp)}
                          </TableCell>
                          <TableCell className="py-3">
                            {imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setLightboxUrl(imageUrl)}
                                className="block focus:outline-none"
                                aria-label="View evidence"
                              >
                                <img
                                  src={imageUrl}
                                  alt="Evidence"
                                  className="w-16 h-12 object-cover rounded cursor-zoom-in hover:opacity-80 transition"
                                  style={{ border: "1px solid #e2e8f0" }}
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="48"%3E%3Crect fill="%23f1f5f9" width="64" height="48"/%3E%3C/svg%3E';
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
                          </TableCell>
                          <TableCell className="py-3">
                            {getStatusBadge(vehicleScore, isPaidVehicle)}
                          </TableCell>
                          <TableCell className="py-3">
                            {showActions ? (
                              <div className="flex gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-ocid={`violations.download_button.${rowNum}`}
                                  onClick={() => handleViewChallan(v.vehicleNo)}
                                  className="text-xs h-7 px-2 whitespace-nowrap"
                                  style={{
                                    borderColor: "#16a34a",
                                    color: "#16a34a",
                                    borderRadius: "3px",
                                  }}
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Challan
                                </Button>
                                {!isPaidVehicle && (
                                  <Button
                                    size="sm"
                                    data-ocid={`violations.pay_button.${rowNum}`}
                                    onClick={() =>
                                      handleOpenPayment(v.vehicleNo)
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
                            ) : (
                              <span
                                className="text-xs italic"
                                style={{ color: "#9ca3af" }}
                              >
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
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
        totalScore={vehicleScoreMap.get(challanVehicleNo) ?? 0}
        totalFine={(vehicleScoreMap.get(challanVehicleNo) ?? 0) * 1000}
        isPaid={paidVehicles.has(challanVehicleNo)}
        groupViolations={challanGroupViolations}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        violations={violations}
        vehicleNo={paymentVehicleNo}
        challanId={`SMVB-${Date.now().toString().slice(-8)}`}
        totalFine={(vehicleScoreMap.get(paymentVehicleNo) ?? 0) * 1000}
        groupId={paymentGroupId}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
