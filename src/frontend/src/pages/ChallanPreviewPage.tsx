import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type NodeViolation, fetchViolations } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Shield } from "lucide-react";
import { useEffect, useState } from "react";

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
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ChallanPreviewPage() {
  const navigate = useNavigate();

  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchViolations();
        setViolations(data);
      } catch (err) {
        console.error("Failed to load violations:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalScore = violations.reduce((sum, v) => sum + v.score, 0);
  const totalFine = violations.reduce(
    (sum, v) => sum + (v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 1000),
    0,
  );

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/violations" })}
          style={{ borderRadius: "2px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <div
          data-ocid="challan.loading_state"
          className="flex items-center justify-center py-16 text-gray-500 gap-2 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "#0B3D91", borderTopColor: "transparent" }}
          />
          <span className="font-medium">Loading challan data...</span>
        </div>
      </div>
    );
  }

  // If total score < 5 — show empty state, no challan content
  if (totalScore < 5) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/violations" })}
          style={{ borderRadius: "2px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <div
          data-ocid="challan.empty_state"
          className="flex flex-col items-center justify-center py-20 border border-gray-200 rounded-xl bg-gray-50 text-center px-6"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: "#eff6ff" }}
          >
            <FileText
              className="w-8 h-8"
              style={{ color: "#0B3D91", opacity: 0.5 }}
            />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "#0B3D91" }}>
            No Challan Generated
          </h2>
          <p className="text-gray-500 text-sm max-w-md">
            No challan has been generated. Total violation score is{" "}
            <strong>{totalScore}</strong>, which is below the threshold of{" "}
            <strong>5</strong>. Challan is only generated when total score ≥ 5.
          </p>
          {totalScore > 0 && (
            <div
              className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: "#dcfce7", color: "#166534" }}
            >
              Current Status: Low Risk (Score: {totalScore})
            </div>
          )}
        </div>
      </div>
    );
  }

  // Total score >= 5 — show full challan
  if (violations.length === 0) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/violations" })}
          style={{ borderRadius: "2px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <div
          data-ocid="challan.empty_state"
          className="py-10 text-center text-gray-600 border border-gray-200 rounded-lg"
        >
          No challan data available
        </div>
      </div>
    );
  }

  const firstViolation = violations[0];
  const evidenceViolation =
    violations.find((v) => v.imageUrl) ?? firstViolation;
  const imageUrl = normalizeImageUrl(evidenceViolation.imageUrl);
  const challanNo = `SMVB-${new Date().getTime().toString().slice(-8)}`;
  const issuedAt = formatDateTime(firstViolation.timestamp);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/violations" })}
          style={{ borderRadius: "2px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <Button
          onClick={handleDownloadPDF}
          className="gap-2 text-white"
          style={{ borderRadius: "2px", backgroundColor: "#0B3D91" }}
          data-ocid="challan.download_button"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Challan Document */}
      <div
        id="challan-print-content"
        className="bg-white border border-gray-200 shadow-sm overflow-hidden"
        style={{ borderRadius: "4px" }}
      >
        {/* Official Header */}
        <div
          className="text-white p-6"
          style={{
            background: "linear-gradient(135deg, #082d6b 0%, #0B3D91 100%)",
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest opacity-75 mb-0.5">
                Government of Kerala
              </p>
              <p className="font-bold text-2xl leading-tight">
                Motor Vehicle Department
              </p>
              <p className="text-sm font-semibold" style={{ color: "#93c5fd" }}>
                Traffic Violation Challan
              </p>
            </div>
            <img
              src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
              alt="SAFeway"
              className="w-14 h-14 object-contain opacity-90"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div
            className="border-t pt-4 text-center"
            style={{ borderColor: "rgba(255,255,255,0.25)" }}
          >
            <p className="text-2xl font-bold uppercase tracking-widest">
              Traffic Violation Challan
            </p>
            <p className="text-xs opacity-75 mt-1 font-mono">
              Challan No: {challanNo}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle & Owner Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Vehicle Number
              </p>
              <p
                className="font-black text-2xl font-mono tracking-widest"
                style={{ color: "#0B3D91" }}
              >
                {firstViolation.vehicleNo}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Date &amp; Time
              </p>
              <p className="font-semibold text-gray-800">{issuedAt}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Owner Name
              </p>
              <p className="font-semibold text-gray-800 text-lg">
                {firstViolation.ownerName || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                Mobile Number
              </p>
              <p className="font-semibold text-gray-800 text-lg font-mono">
                {firstViolation.mobile || "N/A"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Violations Table */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Violation Details
            </p>
            <div
              className="overflow-hidden border rounded-lg"
              style={{ borderColor: "#bfdbfe" }}
            >
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#eef2f9" }}>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: "#1e3a6e",
                        borderBottom: "2px solid #bfdbfe",
                      }}
                    >
                      Violation Type
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: "#1e3a6e",
                        borderBottom: "2px solid #bfdbfe",
                      }}
                    >
                      Score
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: "#1e3a6e",
                        borderBottom: "2px solid #bfdbfe",
                      }}
                    >
                      Fine Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, i) => {
                    const fine =
                      v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 1000;
                    return (
                      <tr
                        key={`challanrow-${v.vehicleNo}-${v.timestamp}-${i}`}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8faff",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {v.violationType}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="font-bold text-sm px-2.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                v.score >= 5
                                  ? "#fee2e2"
                                  : v.score >= 3
                                    ? "#fff7ed"
                                    : "#dcfce7",
                              color:
                                v.score >= 5
                                  ? "#991b1b"
                                  : v.score >= 3
                                    ? "#c2410c"
                                    : "#166534",
                            }}
                          >
                            {v.score}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-right text-sm font-bold"
                          style={{ color: "#dc2626" }}
                        >
                          ₹{fine.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      backgroundColor: "#fff7ed",
                      borderTop: "2px solid #fdba74",
                    }}
                  >
                    <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="font-black text-sm px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
                      >
                        {totalScore}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right text-2xl font-extrabold"
                      style={{ color: "#dc2626" }}
                    >
                      ₹{totalFine.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Evidence Image */}
          {imageUrl && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Violation Evidence
              </p>
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto border-2 border-gray-300 rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Issuing Authority */}
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#0B3D91" }}
            >
              Issuing Authority
            </p>
            <p className="font-semibold text-gray-800">
              SAFEWAY Smart Vehicle Blackbox Monitoring System
            </p>
            <p className="text-xs text-gray-500 italic mt-0.5">
              Reported to Kerala Motor Vehicle Department for action.
            </p>
          </div>

          {/* Payment Instructions */}
          <div
            className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-lg"
            style={{ color: "#713f12" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#0B3D91" }}>
              Payment Instructions:
            </p>
            <p>
              Please pay the fine within 60 days to avoid additional penalties.
              Payment can be made online or at any authorized Kerala RTO office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
