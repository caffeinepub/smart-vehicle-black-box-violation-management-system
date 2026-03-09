import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { NodeViolation } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { Download, FileText, Shield } from "lucide-react";

interface ChallanPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: NodeViolation[];
  vehicleNo?: string;
  totalScore: number;
  totalFine: number;
  isPaid?: boolean;
  "data-ocid"?: string;
}

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
  // Format: "09 Mar 2026, 2:30 PM"
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

interface GroupedViolation {
  violationType: string;
  count: number;
  totalScore: number;
  totalFine: number;
}

function groupViolationsByType(
  violations: NodeViolation[],
): GroupedViolation[] {
  const map = new Map<string, GroupedViolation>();
  for (const v of violations) {
    const type = v.violationType;
    const fine = v.fineAmount ?? FINE_AMOUNTS[type] ?? 1000;
    const existing = map.get(type);
    if (existing) {
      existing.count += 1;
      existing.totalScore += v.score;
      existing.totalFine += fine;
    } else {
      map.set(type, {
        violationType: type,
        count: 1,
        totalScore: v.score,
        totalFine: fine,
      });
    }
  }
  return Array.from(map.values());
}

export default function ChallanPreviewModal({
  open,
  onOpenChange,
  violations,
  vehicleNo,
  totalScore,
  totalFine,
  isPaid = false,
  "data-ocid": _dataOcid,
}: ChallanPreviewModalProps) {
  if (violations.length === 0) return null;

  // Filter to just the relevant vehicle's violations if vehicleNo is provided
  const relevantViolations = vehicleNo
    ? violations.filter((v) => v.vehicleNo === vehicleNo)
    : violations;

  const firstViolation = relevantViolations[0] ?? violations[0];
  const evidenceViolation =
    relevantViolations.find((v) => v.imageUrl) ?? firstViolation;
  const imageUrl = normalizeImageUrl(evidenceViolation?.imageUrl);
  const challanNo = `SMVB-${Date.now().toString().slice(-8)}`;
  const issuedAt = formatDateTime(firstViolation.timestamp);

  const grouped = groupViolationsByType(relevantViolations);

  const handleDownloadPDF = () => {
    // Show print dialog — user can save as PDF
    window.print();
  };

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    color: "#1e3a6e",
    borderBottom: "2px solid #bfdbfe",
    textAlign: "left" as const,
  };

  const thCenterStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "center" as const,
  };
  const thRightStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: "right" as const,
  };

  const printChallan = (
    <div
      id="challan-print-content"
      style={{ display: "none", fontFamily: "Plus Jakarta Sans, sans-serif" }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#fff",
          border: "2px solid #0B3D91",
        }}
      >
        {/* Print Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #082d6b 0%, #0B3D91 100%)",
            color: "#fff",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            {/* SAFEWAY Logo */}
            <img
              src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
              alt="SAFeway"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "2px",
                  opacity: 0.75,
                  marginBottom: "2px",
                }}
              >
                Government of India
              </div>
              <div
                style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1.1 }}
              >
                Motor Vehicle Department
              </div>
              <div
                style={{
                  fontSize: "13px",
                  opacity: 0.85,
                  fontWeight: 700,
                  letterSpacing: "1px",
                }}
              >
                SAFeway Smart Enforcement System
              </div>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.25)",
              paddingTop: "12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "3px",
              }}
            >
              Traffic Violation Challan
            </div>
            <div style={{ fontSize: "12px", opacity: 0.75, marginTop: "4px" }}>
              Challan No:{" "}
              <span
                style={{ fontFamily: "monospace", color: "#fff", opacity: 1 }}
              >
                {challanNo}
              </span>{" "}
              · Issue Date: {issuedAt}
            </div>
          </div>
        </div>

        {/* Vehicle & Owner */}
        <div
          style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#9ca3af",
                  marginBottom: "4px",
                }}
              >
                Vehicle Number
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  fontFamily: "monospace",
                  letterSpacing: "3px",
                  color: "#0B3D91",
                }}
              >
                {firstViolation.vehicleNo}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#9ca3af",
                  marginBottom: "4px",
                }}
              >
                Issue Date &amp; Time
              </div>
              <div
                style={{ fontSize: "14px", fontWeight: 600, color: "#1f2937" }}
              >
                {issuedAt}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#9ca3af",
                  marginBottom: "4px",
                }}
              >
                Owner Name
              </div>
              <div
                style={{ fontSize: "15px", fontWeight: 600, color: "#1f2937" }}
              >
                {firstViolation.ownerName || "N/A"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "#9ca3af",
                  marginBottom: "4px",
                }}
              >
                Mobile Number
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#1f2937",
                  fontFamily: "monospace",
                }}
              >
                {firstViolation.mobile || "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Violations Table */}
        <div
          style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#9ca3af",
              marginBottom: "12px",
            }}
          >
            Violation Details (Grouped by Type)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#eef2f9" }}>
                <th style={thStyle}>Violation Type</th>
                <th style={thCenterStyle}>Count</th>
                <th style={thCenterStyle}>Total Score</th>
                <th style={thRightStyle}>Fine</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g, i) => (
                <tr
                  key={g.violationType}
                  style={{
                    background: i % 2 === 0 ? "#fff" : "#f8faff",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {g.violationType}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    {g.count}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      color:
                        g.totalScore >= 5
                          ? "#991b1b"
                          : g.totalScore >= 3
                            ? "#c2410c"
                            : "#166534",
                    }}
                  >
                    {g.totalScore}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    ₹{g.totalFine}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  background: "#fff7ed",
                  borderTop: "2px solid #fdba74",
                }}
              >
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1f2937",
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {relevantViolations.length}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                    color: "#991b1b",
                  }}
                >
                  {totalScore}
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#dc2626",
                  }}
                >
                  ₹{totalFine}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Evidence Image */}
        {imageUrl && (
          <div
            style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                color: "#9ca3af",
                marginBottom: "8px",
              }}
            >
              Violation Evidence
            </div>
            <img
              src={imageUrl}
              alt="Violation evidence"
              style={{
                maxWidth: "100%",
                maxHeight: "220px",
                height: "auto",
                border: "2px solid #e5e7eb",
                borderRadius: "4px",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        {/* Authority Footer */}
        <div
          style={{
            padding: "16px 24px",
            background: "#eff6ff",
            borderTop: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#0B3D91",
              marginBottom: "4px",
            }}
          >
            Issuing Authority
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e3a6e" }}>
            Motor Vehicle Department – SAFeway Smart Monitoring Unit
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
            Ministry of Road Transport &amp; Highways, Government of India
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginTop: "8px",
              borderTop: "1px solid #bfdbfe",
              paddingTop: "8px",
            }}
          >
            NOTICE: Please pay the fine within 60 days to avoid additional
            penalties and legal action. Payment can be made at any authorized
            RTO office or via the Parivahan portal (parivahan.gov.in).
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#9ca3af",
              marginTop: "6px",
              fontStyle: "italic",
            }}
          >
            Challan No: {challanNo} · Generated: {issuedAt} · Status:{" "}
            {isPaid ? "PAID" : "PENDING"}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Hidden challan content for print */}
      {printChallan}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-ocid="violations.challan_modal.dialog"
          className="max-w-2xl max-h-[90vh] overflow-y-auto p-0"
          style={{ borderRadius: "6px" }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" style={{ color: "#0B3D91" }} />
              Traffic Violation Challan
            </DialogTitle>
          </DialogHeader>

          {/* Official Government Challan Header */}
          <div
            className="text-white p-5"
            style={{
              background: "linear-gradient(135deg, #082d6b 0%, #0B3D91 100%)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
              >
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-0.5"
                  style={{ color: "#93c5fd" }}
                >
                  Government of India
                </p>
                <p className="font-extrabold text-lg leading-tight text-white">
                  Motor Vehicle Department
                </p>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#93c5fd" }}
                >
                  SAFeway Smart Enforcement System
                </p>
              </div>
              {/* SAFeway logo */}
              <img
                src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
                alt="SAFeway"
                className="ml-auto w-12 h-12 object-contain opacity-90"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div
              className="border-t pt-3 text-center"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              <p className="text-xl font-extrabold uppercase tracking-widest text-white">
                Traffic Violation Challan
              </p>
              <p className="text-xs mt-1" style={{ color: "#93c5fd" }}>
                Challan No:{" "}
                <span className="font-mono text-white">{challanNo}</span> ·
                Issue Date: <span className="text-white">{issuedAt}</span>
              </p>
            </div>
          </div>

          {/* Paid Banner */}
          {isPaid && (
            <div
              className="flex items-center gap-3 px-6 py-3"
              style={{
                backgroundColor: "#dcfce7",
                borderBottom: "2px solid #86efac",
              }}
              data-ocid="violations.challan_modal.success_state"
            >
              <span className="text-xl">✓</span>
              <p className="font-bold text-sm" style={{ color: "#166534" }}>
                Challan Paid Successfully — Status: PAID
              </p>
            </div>
          )}

          <div className="p-6 space-y-5">
            {/* Vehicle & Owner Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Vehicle Number
                </p>
                <p
                  className="font-black text-xl font-mono tracking-widest"
                  style={{ color: "#0B3D91" }}
                >
                  {firstViolation.vehicleNo}
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Issue Date &amp; Time
                </p>
                <p className="font-semibold text-gray-800 text-sm">
                  {issuedAt}
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Owner Name
                </p>
                <p className="font-semibold text-gray-800">
                  {firstViolation.ownerName || "N/A"}
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Mobile Number
                </p>
                <p className="font-semibold text-gray-800 font-mono">
                  {firstViolation.mobile || "N/A"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Grouped Violations Table */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#9ca3af" }}
              >
                Violation Details (Grouped by Type)
              </p>
              <div
                className="overflow-hidden border rounded-lg"
                style={{ borderColor: "#bfdbfe" }}
              >
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#eef2f9" }}>
                      {["Violation Type", "Count", "Score", "Fine"].map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${i === 0 ? "text-left" : i === 3 ? "text-right" : "text-center"}`}
                            style={{
                              color: "#1e3a6e",
                              borderBottom: "2px solid #bfdbfe",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g, i) => (
                      <tr
                        key={g.violationType}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8faff",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">
                          {g.violationType}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-bold text-gray-700">
                          {g.count}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className="font-bold text-sm px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor:
                                g.totalScore >= 5
                                  ? "#fee2e2"
                                  : g.totalScore >= 3
                                    ? "#fff7ed"
                                    : "#dcfce7",
                              color:
                                g.totalScore >= 5
                                  ? "#991b1b"
                                  : g.totalScore >= 3
                                    ? "#c2410c"
                                    : "#166534",
                            }}
                          >
                            {g.totalScore}
                          </span>
                        </td>
                        <td
                          className="px-4 py-2.5 text-right text-sm font-bold"
                          style={{ color: "#dc2626" }}
                        >
                          ₹{g.totalFine}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        backgroundColor: "#fff7ed",
                        borderTop: "2px solid #fdba74",
                      }}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        TOTAL ({relevantViolations.length} violations)
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                        {relevantViolations.length}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="font-black text-sm px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#991b1b",
                          }}
                        >
                          {totalScore}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right text-xl font-extrabold"
                        style={{ color: "#dc2626" }}
                      >
                        ₹{totalFine}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Evidence Image */}
            {imageUrl && (
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "#9ca3af" }}
                >
                  Violation Evidence
                </p>
                <img
                  src={imageUrl}
                  alt="Violation proof"
                  className="w-full h-auto max-h-48 object-cover border border-gray-300 rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Issuing Authority */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "#0B3D91" }}
              >
                Issuing Authority
              </p>
              <p className="font-semibold text-gray-800 text-sm">
                Motor Vehicle Department – SAFeway Smart Monitoring Unit
              </p>
              <p className="text-xs italic mt-0.5" style={{ color: "#6b7280" }}>
                Ministry of Road Transport &amp; Highways, Government of India
              </p>
            </div>

            {/* Authority Notice */}
            <div
              className="text-xs rounded-lg p-3"
              style={{
                backgroundColor: "#fefce8",
                border: "1px solid #fde68a",
                color: "#713f12",
              }}
            >
              <p className="font-bold mb-1">NOTICE TO VEHICLE OWNER:</p>
              <p>
                Please pay the fine within 60 days to avoid additional penalties
                and legal proceedings. Payment can be made online through the
                Parivahan portal (parivahan.gov.in) or at any authorized RTO
                office. Failure to pay may result in suspension of vehicle
                registration.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 gap-2 flex-wrap">
            <Button
              variant="outline"
              data-ocid="violations.challan_modal.close_button"
              onClick={() => onOpenChange(false)}
              style={{ borderRadius: "3px" }}
            >
              Close
            </Button>
            <Button
              data-ocid="violations.challan_modal.download_button"
              onClick={handleDownloadPDF}
              className="gap-2 text-white"
              style={{
                backgroundColor: "#0B3D91",
                borderRadius: "3px",
              }}
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
