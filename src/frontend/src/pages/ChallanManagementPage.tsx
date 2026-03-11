import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type NodeViolation,
  fetchViolations,
  getViolationFine,
} from "@/lib/api";
import {
  buildViolationGroups,
  getPaidGroupIds,
  markGroupPaid,
} from "@/lib/violationGroups";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
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

export default function ChallanManagementPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidGroupIds, setPaidGroupIds] = useState<Set<string>>(() =>
    getPaidGroupIds(),
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const data = await fetchViolations();
        setViolations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const groups = buildViolationGroups(violations, paidGroupIds);

  const handleMarkPaid = (groupId: string) => {
    markGroupPaid(groupId);
    setPaidGroupIds(getPaidGroupIds());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-gov-blue pl-6">
          <h1 className="text-3xl font-bold text-gov-blue mb-2">
            Challan Management
          </h1>
          <p className="text-gray-700">View and manage traffic challans</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gov-blue animate-spin" />
          <span className="ml-3 text-gray-600">Loading challans...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 pl-6" style={{ borderColor: "#0B0B60" }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#0B0B60" }}>
            Challan Management
          </h1>
          <p className="text-gray-700">View and manage traffic challans</p>
        </div>
        <div
          data-ocid="challans.error_state"
          className="rounded-xl border p-6 text-center"
          style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
        >
          <AlertCircle
            className="w-8 h-8 mx-auto mb-2"
            style={{ color: "#dc2626" }}
          />
          <p className="font-semibold text-sm" style={{ color: "#dc2626" }}>
            {error}
          </p>
          <Button
            className="mt-4"
            onClick={() => window.location.reload()}
            style={{ backgroundColor: "#0B0B60", color: "#fff" }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-l-4 pl-5 py-3" style={{ borderColor: "#0B0B60" }}>
        <h1
          className="text-2xl md:text-3xl font-extrabold mb-1"
          style={{ color: "#1f2937" }}
        >
          Challan Management
        </h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>
          Grouped violation challans · {groups.length} group
          {groups.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          data-ocid="challans.empty_state"
          message="No challans generated yet. Challans are generated when a vehicle's violation score reaches 5."
        />
      ) : (
        <div className="space-y-4" data-ocid="challans.list">
          {groups.map((group, gIdx) => {
            const groupNum = gIdx + 1;
            const isGroupPaid = paidGroupIds.has(group.groupId);
            const firstV = group.violations[0];
            const vehicleNo = firstV?.vehicleNo || "UNKNOWN";
            const ownerName = firstV?.ownerName || "Mark";
            const mobile = firstV?.mobile || "+91 8520649127";

            return (
              <div
                key={group.groupId}
                data-ocid={`challans.item.${groupNum}`}
                className="rounded-xl overflow-hidden shadow-sm"
                style={{
                  border: group.isComplete
                    ? isGroupPaid
                      ? "2px solid #bbf7d0"
                      : "2px solid #fecaca"
                    : "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Card header */}
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
                    <FileText
                      className="w-4 h-4"
                      style={{
                        color: group.isComplete
                          ? isGroupPaid
                            ? "#16a34a"
                            : "#dc2626"
                          : "#64748b",
                      }}
                    />
                    <span
                      className="font-extrabold"
                      style={{ color: "#0B0B60" }}
                    >
                      Violation Group {groupNum}
                    </span>
                    {group.isComplete && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: isGroupPaid ? "#dcfce7" : "#fee2e2",
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

                <div className="p-5 space-y-4">
                  {/* Owner info */}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        Owner
                      </p>
                      <p className="font-semibold" style={{ color: "#1f2937" }}>
                        {ownerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        Mobile
                      </p>
                      <p className="font-semibold" style={{ color: "#1f2937" }}>
                        {mobile}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        Violations
                      </p>
                      <p className="font-semibold" style={{ color: "#1f2937" }}>
                        {group.violations.length}
                      </p>
                    </div>
                  </div>

                  {/* Violation list */}
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid #e2e8f0" }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          {["Violation", "Date & Time", "Score", "Fine"].map(
                            (col) => (
                              <th
                                key={col}
                                className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wider"
                                style={{ color: "#6b7280" }}
                              >
                                {col}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.violations.map((v, vIdx) => (
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
                              className="px-4 py-2 text-xs font-mono"
                              style={{ color: "#6b7280" }}
                            >
                              {formatDateTime(v.timestamp)}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
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
                    </div>

                    <div className="flex items-center gap-2">
                      {group.isComplete ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            data-ocid={`challans.download_button.${groupNum}`}
                            onClick={() =>
                              navigate({
                                to: "/challan-preview",
                                search: { groupId: groupNum - 1 },
                              })
                            }
                            className="text-xs h-8 px-3"
                            style={{
                              borderColor: "#0B0B60",
                              color: "#0B0B60",
                              borderRadius: "4px",
                            }}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            View Challan
                          </Button>
                          {isGroupPaid ? (
                            <span
                              className="text-xs font-black px-3 py-1 rounded flex items-center gap-1"
                              style={{
                                backgroundColor: "#dcfce7",
                                color: "#16a34a",
                                border: "1px solid #bbf7d0",
                              }}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              PAID ✓
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              data-ocid={`challans.pay_button.${groupNum}`}
                              onClick={() => handleMarkPaid(group.groupId)}
                              className="text-xs h-8 px-3"
                              style={{
                                backgroundColor: "#15803d",
                                color: "#ffffff",
                                borderRadius: "4px",
                              }}
                            >
                              Pay Fine
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs" style={{ color: "#6b7280" }}>
                          Score: {group.totalScore}/5 – In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
