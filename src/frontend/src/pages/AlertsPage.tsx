import { Badge } from "@/components/ui/badge";
import { useInterval } from "@/hooks/useInterval";
import { type NodeViolation, fetchViolations } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { AlertCircle, AlertTriangle, Car, Loader2, Siren } from "lucide-react";
import { useEffect, useState } from "react";

function formatDateTime(timestamp: string | number): string {
  if (!timestamp) return "—";
  let d = new Date(timestamp as string);
  if (Number.isNaN(d.getTime()) && typeof timestamp === "string") {
    const asNum = Number(timestamp);
    if (!Number.isNaN(asNum)) d = new Date(asNum);
  }
  if (Number.isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AlertsPage() {
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchViolations();
      setViolations(data);
    } catch {
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable
  useEffect(() => {
    loadData();
  }, []);

  useInterval(() => {
    loadData();
  }, 3000);

  // Accident alerts = violations where violationType includes "accident"
  const accidentAlerts = violations.filter((v) =>
    v.violationType?.toLowerCase().includes("accident"),
  );

  // Severe alerts = score >= 5 (non-accident)
  const severeAlerts = violations.filter(
    (v) => v.score >= 5 && !v.violationType?.toLowerCase().includes("accident"),
  );

  return (
    <div className="space-y-6" data-ocid="alerts.page">
      {/* Page Header */}
      <div
        className="pl-5 py-4 border-l-4 rounded-r-lg"
        style={{
          borderLeftColor: "#dc2626",
          backgroundColor: "rgba(220,38,38,0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Siren className="w-5 h-5" style={{ color: "#dc2626" }} />
          <h1 className="text-2xl font-extrabold" style={{ color: "#dc2626" }}>
            Accident &amp; Severity Alerts
          </h1>
        </div>
        <p className="text-gray-500 text-sm">
          Critical alerts — Motor Vehicle Department Enforcement Portal
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="bg-white rounded-xl shadow-md p-5 border-l-4"
          style={{ borderLeftColor: "#dc2626" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Accident Alerts
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(220,38,38,0.1)" }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: "#dc2626" }} />
            </div>
          </div>
          <p className="text-4xl font-black" style={{ color: "#dc2626" }}>
            {loading ? (
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "#dc2626" }}
              />
            ) : (
              accidentAlerts.length
            )}
          </p>
        </div>

        <div
          className="bg-white rounded-xl shadow-md p-5 border-l-4"
          style={{ borderLeftColor: "#b45309" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Severe Violations
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(180,83,9,0.1)" }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: "#b45309" }} />
            </div>
          </div>
          <p className="text-4xl font-black" style={{ color: "#b45309" }}>
            {loading ? (
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "#b45309" }}
              />
            ) : (
              severeAlerts.length
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div
          data-ocid="alerts.loading_state"
          className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200 gap-2 text-gray-400"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading alerts...</span>
        </div>
      ) : accidentAlerts.length === 0 && severeAlerts.length === 0 ? (
        <div
          data-ocid="alerts.empty_state"
          className="bg-white rounded-xl border border-gray-200 py-14 text-center text-gray-400 text-sm"
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          No accident alerts recorded. All clear.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Accident Alerts */}
          {accidentAlerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-red-200 overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ backgroundColor: "#dc2626" }}
              >
                <AlertCircle className="w-4 h-4 text-white opacity-90" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  Accident Alerts
                </span>
                <span className="ml-auto text-xs font-mono text-red-200">
                  {accidentAlerts.length} record
                  {accidentAlerts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {accidentAlerts.map((v, i) => {
                  const imageUrl = normalizeImageUrl(v.imageUrl);
                  return (
                    <div
                      key={`${v.vehicleNo}-${v.timestamp}-${i}`}
                      data-ocid={`alerts.accident.item.${i + 1}`}
                      className="p-4 flex items-start gap-4"
                      style={{
                        backgroundColor: i % 2 === 0 ? "#fff5f5" : "#ffffff",
                      }}
                    >
                      {imageUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(imageUrl, "_blank")}
                          className="flex-shrink-0 focus:outline-none focus:ring-2 rounded"
                          aria-label="View accident image"
                        >
                          <img
                            src={imageUrl}
                            alt="Accident evidence"
                            className="w-20 h-14 object-cover border-2 border-red-200 hover:opacity-80 transition-opacity rounded"
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="56"%3E%3Crect fill="%23fee2e2" width="80" height="56"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23dc2626" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-20 h-14 flex-shrink-0 bg-red-50 border-2 border-red-200 rounded flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-red-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="font-mono font-bold text-sm"
                            style={{ color: "#0B3D91" }}
                          >
                            {v.vehicleNo}
                          </span>
                          <Badge
                            className="text-xs font-bold"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fca5a5",
                              borderRadius: "3px",
                            }}
                          >
                            ACCIDENT
                          </Badge>
                          <span
                            className="font-black text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                            }}
                          >
                            Score: {v.score}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">
                          {v.violationType}
                        </p>
                        {v.ownerName && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Car className="w-3 h-3" /> {v.ownerName}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          {formatDateTime(v.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Severe Violation Alerts */}
          {severeAlerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-orange-200 overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ backgroundColor: "#b45309" }}
              >
                <AlertTriangle className="w-4 h-4 text-white opacity-90" />
                <span className="text-white font-bold text-sm uppercase tracking-widest">
                  Severe Violations (Score ≥ 5)
                </span>
                <span className="ml-auto text-xs font-mono text-orange-200">
                  {severeAlerts.length} record
                  {severeAlerts.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {severeAlerts.map((v, i) => {
                  const imageUrl = normalizeImageUrl(v.imageUrl);
                  return (
                    <div
                      key={`${v.vehicleNo}-${v.timestamp}-${i}`}
                      data-ocid={`alerts.severe.item.${i + 1}`}
                      className="p-4 flex items-start gap-4"
                      style={{
                        backgroundColor: i % 2 === 0 ? "#fffbeb" : "#ffffff",
                      }}
                    >
                      {imageUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(imageUrl, "_blank")}
                          className="flex-shrink-0 focus:outline-none focus:ring-2 rounded"
                          aria-label="View violation image"
                        >
                          <img
                            src={imageUrl}
                            alt="Violation evidence"
                            className="w-20 h-14 object-cover border-2 border-orange-200 hover:opacity-80 transition-opacity rounded"
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="56"%3E%3Crect fill="%23fff7ed" width="80" height="56"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23b45309" font-size="8"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </button>
                      ) : (
                        <div className="w-20 h-14 flex-shrink-0 bg-orange-50 border-2 border-orange-200 rounded flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-orange-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="font-mono font-bold text-sm"
                            style={{ color: "#0B3D91" }}
                          >
                            {v.vehicleNo}
                          </span>
                          <Badge
                            className="text-xs font-bold"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fca5a5",
                              borderRadius: "3px",
                            }}
                          >
                            Severe Violation
                          </Badge>
                          <span
                            className="font-black text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "#fee2e2",
                              color: "#991b1b",
                            }}
                          >
                            Score: {v.score}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">
                          {v.violationType}
                        </p>
                        {v.ownerName && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Car className="w-3 h-3" /> {v.ownerName}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          {formatDateTime(v.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
