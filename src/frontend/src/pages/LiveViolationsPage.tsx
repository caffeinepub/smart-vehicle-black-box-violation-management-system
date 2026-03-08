import ChallanPreviewModal from "@/components/ChallanPreviewModal";
import EmptyState from "@/components/EmptyState";
import LatestViolationCard from "@/components/LatestViolationCard";
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
  getViolationId,
  payViolation,
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
  RefreshCw,
  Siren,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function formatDateTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timestamp;
  }
}

function getStatusBadge(score: number, isPaid: boolean): React.ReactNode {
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
  if (score >= 5) {
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
        Critical
      </Badge>
    );
  }
  if (score >= 4) {
    return (
      <Badge
        className="font-semibold"
        style={{
          backgroundColor: "#ffedd5",
          color: "#9a3412",
          border: "1px solid #fed7aa",
          borderRadius: "3px",
        }}
      >
        Severe
      </Badge>
    );
  }
  if (score >= 3) {
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
        High
      </Badge>
    );
  }
  if (score >= 2) {
    return (
      <Badge
        className="font-semibold"
        style={{
          backgroundColor: "#fef9c3",
          color: "#854d0e",
          border: "1px solid #fde047",
          borderRadius: "3px",
        }}
      >
        Moderate
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
  const [selectedViolation, setSelectedViolation] =
    useState<NodeViolation | null>(null);
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());

  const previousViolationsRef = useRef<Set<string>>(new Set());
  const previousTotalScoreRef = useRef<number>(0);

  const loadViolations = async () => {
    try {
      setError(null);
      const data = await fetchViolations();

      // Detect new violations by vehicleNo+timestamp key
      const newViolations = data.filter((v) => {
        const key = `${v.vehicleNo}-${v.timestamp}`;
        return !previousViolationsRef.current.has(key);
      });

      // Show notification for each new violation (only after initial load)
      if (newViolations.length > 0 && previousViolationsRef.current.size > 0) {
        for (const v of newViolations) {
          showNotification(
            "Traffic Violation Detected",
            "alert",
            `Detected at ${new Date(v.timestamp).toLocaleTimeString("en-IN")}`,
            v.vehicleNo,
            v.violationType,
          );
        }
      }

      // Calculate total score
      const totalScore = data.reduce((sum, v) => sum + v.score, 0);

      // Show RTO notification if score threshold crossed
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

      // Update refs
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadViolations is stable (defined in component scope, refs used internally)
  useEffect(() => {
    loadViolations();
  }, []);

  useInterval(() => {
    loadViolations();
  }, 3000);

  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const latestViolation =
    violations.length > 0
      ? violations.reduce((latest, current) =>
          new Date(current.timestamp) > new Date(latest.timestamp)
            ? current
            : latest,
        )
      : null;

  const handleViewChallan = (violation: NodeViolation) => {
    setSelectedViolation(violation);
    setChallanModalOpen(true);
  };

  const handleViewVehicle = (vehicleNo: string) => {
    navigate({ to: "/vehicle-details", search: { vehicleNo } });
  };

  const handlePay = async (violation: NodeViolation, _rowIndex: number) => {
    const id = getViolationId(violation);
    if (!id) {
      toast.error("Payment failed: Violation ID not found");
      return;
    }

    setPayingIds((prev) => new Set(prev).add(id));
    try {
      await payViolation(id);
      setPaidIds((prev) => new Set(prev).add(id));
      toast.success("Challan Paid Successfully", {
        description: `Challan for ${violation.vehicleNo} has been paid`,
      });
    } catch (err) {
      toast.error("Payment failed", {
        description:
          err instanceof Error ? err.message : "Please try again later",
      });
    } finally {
      setPayingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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

      {/* Score ≥ 5 Critical Alert */}
      {totalScore >= 5 && (
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
              ⚠ Multiple Violations Detected — Data Forwarded to Authorities
            </p>
            <p className="text-sm mt-1" style={{ color: "#fca5a5" }}>
              Total violation score:{" "}
              <strong className="text-white">{totalScore} pts</strong> — Data
              has been forwarded to RTO and challan auto-generated.
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
              onViewChallan={() => handleViewChallan(latestViolation)}
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
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Vehicle Number
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Owner Name
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Violation Type
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Score
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Date &amp; Time
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Image
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Status
                    </TableHead>
                    <TableHead
                      className="font-bold text-xs uppercase tracking-wider py-3 whitespace-nowrap"
                      style={{ color: "#1e3a6e" }}
                    >
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation, index) => {
                    const imageUrl = normalizeImageUrl(violation.imageUrl);
                    const vid = getViolationId(violation);
                    const isPaid = vid ? paidIds.has(vid) : false;
                    const isPaying = vid ? payingIds.has(vid) : false;
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

                        {/* Owner Name */}
                        <TableCell className="text-gray-800 text-sm py-3 font-medium">
                          {violation.ownerName || (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
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
                                    : violation.score >= 2
                                      ? "#fef9c3"
                                      : "#dcfce7",
                              color:
                                violation.score >= 5
                                  ? "#991b1b"
                                  : violation.score >= 3
                                    ? "#c2410c"
                                    : violation.score >= 2
                                      ? "#854d0e"
                                      : "#166534",
                            }}
                          >
                            {violation.score}
                          </span>
                        </TableCell>

                        {/* Date & Time */}
                        <TableCell className="text-gray-600 text-sm py-3 whitespace-nowrap font-mono text-xs">
                          {formatDateTime(violation.timestamp)}
                        </TableCell>

                        {/* Image */}
                        <TableCell className="py-3">
                          {imageUrl ? (
                            <button
                              type="button"
                              onClick={() => window.open(imageUrl, "_blank")}
                              className="block focus:outline-none focus:ring-2 rounded"
                              style={
                                {
                                  focusRingColor: "#0B3D91",
                                } as React.CSSProperties
                              }
                              aria-label="View violation proof image"
                            >
                              <img
                                src={imageUrl}
                                alt="Proof"
                                className="w-16 h-12 object-cover border-2 border-gray-200 hover:opacity-80 hover:border-blue-400 transition-all"
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
                          {getStatusBadge(violation.score, isPaid)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Download Challan */}
                            <Button
                              size="sm"
                              variant="outline"
                              data-ocid={`violations.download_challan_button.${rowNum}`}
                              onClick={() => handleViewChallan(violation)}
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

                            {/* Pay Challan */}
                            <Button
                              size="sm"
                              data-ocid={`violations.pay_challan_button.${rowNum}`}
                              onClick={() => handlePay(violation, index)}
                              disabled={isPaid || isPaying}
                              className="text-xs h-7 px-2 whitespace-nowrap transition-colors"
                              style={{
                                backgroundColor: isPaid ? "#15803d" : "#047857",
                                color: "#ffffff",
                                borderRadius: "3px",
                                opacity: isPaid ? 0.85 : 1,
                              }}
                            >
                              {isPaying ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  Processing...
                                </>
                              ) : isPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Paid
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Pay Challan
                                </>
                              )}
                            </Button>
                          </div>
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
        violation={selectedViolation}
        data-ocid="violations.challan_modal.dialog"
      />
    </div>
  );
}
