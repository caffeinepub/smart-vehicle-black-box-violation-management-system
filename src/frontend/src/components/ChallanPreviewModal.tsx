import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type NodeViolation, getViolationFine } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { Download } from "lucide-react";
import { useState } from "react";

const DEFAULT_OWNER = "Mark";
const DEFAULT_MOBILE = "+91 8520649127";

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

function formatDDMMYYYY(timestamp: string | number): string {
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

function formatIssueDateOnly(d: Date): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
    const fine = getViolationFine(v); // uses v.fine first
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

async function generatePDF(
  vehicleNo: string,
  grouped: GroupedViolation[],
  totalScore: number,
  totalFine: number,
  isPaid: boolean,
  ownerName: string,
  ownerMobile: string,
  location: string,
  violationDateTime: string,
  issueDate: string,
  challanNo: string,
  violationCount: number,
) {
  // Load jsPDF from CDN
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(script);
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsPDF = (window as any).jspdf.jsPDF;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  }) as any;

  const pageW = 210;
  const margin = 16;
  let y = 0;

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("GOVERNMENT OF KERALA – MOTOR VEHICLE DEPARTMENT", pageW / 2, 10, {
    align: "center",
  });
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TRAFFIC VIOLATION CHALLAN", pageW / 2, 20, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Challan No: ${challanNo}`, pageW / 2, 28, { align: "center" });
  doc.text(
    "Generated via SAFEWAY Smart Vehicle Blackbox Monitoring System",
    pageW / 2,
    34,
    { align: "center" },
  );

  y = 44;

  if (isPaid) {
    doc.setFillColor(220, 252, 231);
    doc.rect(0, y, pageW, 10, "F");
    doc.setTextColor(22, 101, 52);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("✓  CHALLAN PAID – STATUS: PAID", pageW / 2, y + 7, {
      align: "center",
    });
    y += 14;
  }

  // Vehicle details
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageW - margin * 2, 36, 2, 2, "F");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Vehicle Number", margin + 4, y + 7);
  doc.text("Owner Name", margin + 55, y + 7);
  doc.text("Mobile", margin + 115, y + 7);
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(vehicleNo, margin + 4, y + 14);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.text(ownerName, margin + 55, y + 14);
  doc.setFontSize(9);
  doc.text(ownerMobile, margin + 115, y + 14);

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Challan Issue Date", margin + 4, y + 22);
  doc.text("Violation Date & Time", margin + 55, y + 22);
  doc.text("Location", margin + 115, y + 22);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.text(issueDate, margin + 4, y + 28);
  doc.setTextColor(220, 38, 38);
  doc.text(violationDateTime, margin + 55, y + 28);
  doc.setTextColor(31, 41, 55);
  doc.text(location.slice(0, 28), margin + 115, y + 28);
  y += 44;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y + 8, pageW - margin, y + 8);
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Violation Type", margin + 3, y + 5.5);
  doc.text("Count", margin + 88, y + 5.5);
  doc.text("Score", margin + 110, y + 5.5);
  doc.text("Fine Amount", pageW - margin - 3, y + 5.5, { align: "right" });
  y += 8;

  for (let i = 0; i < grouped.length; i++) {
    const g = grouped[i];
    doc.setFillColor(
      i % 2 === 0 ? 255 : 250,
      i % 2 === 0 ? 255 : 250,
      i % 2 === 0 ? 255 : 250,
    );
    doc.rect(margin, y, pageW - margin * 2, 8, "F");
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y + 8, pageW - margin, y + 8);
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(g.violationType, margin + 3, y + 5.5);
    doc.text(String(g.count), margin + 88, y + 5.5);
    doc.text(String(g.totalScore), margin + 110, y + 5.5);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Rs.${g.totalFine.toLocaleString()}`,
      pageW - margin - 3,
      y + 5.5,
      { align: "right" },
    );
    y += 8;
  }

  // Totals
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, y, pageW - margin * 2, 10, "F");
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, pageW - margin, y);
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL (${violationCount} violations)`, margin + 3, y + 6.5);
  doc.text(String(totalScore), margin + 110, y + 6.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Rs.${totalFine.toLocaleString()}`, pageW - margin - 3, y + 6.5, {
    align: "right",
  });
  y += 18;

  // Footer
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "F");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This challan is generated via SAFEWAY Smart Vehicle Blackbox Monitoring System and reported to Kerala MVD.",
    pageW / 2,
    y + 6,
    { align: "center" },
  );
  doc.text(
    "Please pay within 60 days to avoid additional penalties.",
    pageW / 2,
    y + 11,
    { align: "center" },
  );

  doc.save(`challan-${vehicleNo}.pdf`);
}

export default function ChallanPreviewModal({
  open,
  onOpenChange,
  violations,
  vehicleNo,
  totalScore: _totalScore,
  totalFine: _totalFine,
  isPaid = false,
  "data-ocid": _dataOcid,
}: ChallanPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  if (violations.length === 0) return null;

  const relevantViolations = vehicleNo
    ? violations.filter((v) => v.vehicleNo === vehicleNo)
    : violations;

  const firstViolation = relevantViolations[0] ?? violations[0];
  const evidenceViolation =
    relevantViolations.find((v) => v.imageUrl) ?? firstViolation;
  const imageUrl = normalizeImageUrl(evidenceViolation?.imageUrl);
  const challanNo = `SMVB-${Date.now().toString().slice(-8)}`;
  const issueDate = formatIssueDateOnly(new Date());
  const violationDateTime = formatDDMMYYYY(firstViolation.timestamp);
  const ownerName = firstViolation.ownerName || DEFAULT_OWNER;
  const ownerMobile = firstViolation.mobile || DEFAULT_MOBILE;
  const grouped = groupViolationsByType(relevantViolations);

  // Recalculate totalFine from actual violation.fine values (ignore prop if stale)
  const computedTotalFine = relevantViolations.reduce(
    (s, v) => s + getViolationFine(v),
    0,
  );
  const computedTotalScore = relevantViolations.reduce(
    (s, v) => s + v.score,
    0,
  );

  const location =
    firstViolation.lat != null && firstViolation.lng != null
      ? `${firstViolation.lat}, ${firstViolation.lng}`
      : "Vehicle Monitoring System";

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await generatePDF(
        vehicleNo ?? firstViolation.vehicleNo,
        grouped,
        computedTotalScore,
        computedTotalFine,
        isPaid,
        ownerName,
        ownerMobile,
        location,
        violationDateTime,
        issueDate,
        challanNo,
        relevantViolations.length,
      );
    } finally {
      setDownloading(false);
    }
  };

  const challanContent = (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "760px",
        margin: "0 auto",
        background: "#fff",
        color: "#1f2937",
        border: "2px solid #0B0B60",
        borderRadius: "4px",
      }}
    >
      {/* ── CHALLAN HEADER ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "3px solid #0B0B60",
          padding: "0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px 14px",
          }}
        >
          {/* Left: Kerala emblem + Dept name */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "3px solid #0B0B60",
                background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              aria-label="Kerala Government Emblem"
            >
              <span
                style={{
                  fontSize: "6px",
                  fontWeight: 900,
                  color: "#0B0B60",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                GOVT.
              </span>
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 900,
                  color: "#0B0B60",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                KERALA
              </span>
              <span
                style={{
                  fontSize: "5px",
                  color: "#0B0B60",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                ★★★
              </span>
              <span
                style={{
                  fontSize: "5px",
                  color: "#0B0B60",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                MVD
              </span>
            </div>
            <div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#6b7280",
                  marginBottom: "2px",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                GOVERNMENT OF KERALA
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#0B0B60",
                  lineHeight: 1.1,
                }}
              >
                Motor Vehicle Department
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  marginTop: "3px",
                  fontWeight: 600,
                }}
              >
                Traffic Enforcement Division
              </div>
            </div>
          </div>

          {/* Right: SAFEWAY reporter info */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                marginBottom: "3px",
                fontWeight: 600,
              }}
            >
              VIOLATION REPORTED BY
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 900,
                color: "#0B0B60",
                letterSpacing: "-0.3px",
              }}
            >
              SAFEWAY
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#374151",
                marginTop: "1px",
                fontWeight: 600,
              }}
            >
              Smart Vehicle Blackbox Monitoring System
            </div>
            <div
              style={{
                marginTop: "6px",
                display: "inline-block",
                padding: "3px 10px",
                background: "#dbeafe",
                border: "1px solid #93c5fd",
                borderRadius: "3px",
                fontSize: "10px",
                fontWeight: 700,
                color: "#0B0B60",
              }}
            >
              VERIFIED ✓
            </div>
          </div>
        </div>

        <div style={{ borderTop: "2px solid #0B0B60", margin: "0 24px" }} />

        <div
          style={{
            background: "#0B0B60",
            color: "#fff",
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 900,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            TRAFFIC VIOLATION CHALLAN
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.7)",
              fontStyle: "italic",
            }}
          >
            Generated via SAFEWAY Smart Vehicle Blackbox Monitoring System
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>
            Challan No:{" "}
            <span
              style={{
                fontFamily: "monospace",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {challanNo}
            </span>
          </div>
        </div>
      </div>

      {/* Paid banner */}
      {isPaid && (
        <div
          style={{
            background: "#dcfce7",
            borderBottom: "2px solid #86efac",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "18px" }}>✓</span>
          <span style={{ fontWeight: 700, color: "#166534", fontSize: "14px" }}>
            CHALLAN PAID – STATUS: PAID
          </span>
        </div>
      )}

      <div style={{ padding: "20px 24px" }}>
        {/* Dates row */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginBottom: "16px",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "4px",
            padding: "12px 16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "3px",
              }}
            >
              Challan Issue Date
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#1f2937",
                fontSize: "13px",
                fontFamily: "monospace",
              }}
            >
              {issueDate}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #bfdbfe", paddingLeft: "24px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "3px",
              }}
            >
              Violation Date &amp; Time
            </div>
            <div
              style={{
                fontWeight: 700,
                color: "#dc2626",
                fontSize: "13px",
                fontFamily: "monospace",
              }}
            >
              {violationDateTime}
            </div>
          </div>
        </div>

        {/* Vehicle & Owner info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          {[
            {
              label: "Vehicle Number",
              value: firstViolation.vehicleNo,
              mono: true,
              highlight: "#0B0B60",
              large: true,
            },
            {
              label: "Owner Name",
              value: ownerName,
              mono: false,
              highlight: "#1f2937",
              large: false,
            },
            {
              label: "Owner Mobile",
              value: ownerMobile,
              mono: true,
              highlight: "#374151",
              large: false,
            },
            {
              label: "Violation Location",
              value: location,
              mono: false,
              highlight: "#374151",
              large: false,
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "10px 12px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "3px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontWeight: item.large ? 900 : 600,
                  color: item.highlight,
                  fontSize: item.large ? "18px" : "13px",
                  fontFamily: item.mono ? "monospace" : "inherit",
                  letterSpacing: item.large ? "2px" : "0",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Violations table — grouped by type, fine from violation.fine */}
        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "8px",
            }}
          >
            Violation Details
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e2e8f0",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {["Violation Type", "Count", "Score", "Fine Amount"].map(
                  (h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 12px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "#374151",
                        borderBottom: "2px solid #0B0B60",
                        textAlign:
                          i === 0
                            ? "left"
                            : i === 3
                              ? "right"
                              : ("center" as React.CSSProperties["textAlign"]),
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
                    backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#1f2937",
                    }}
                  >
                    {g.violationType}
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#374151",
                    }}
                  >
                    {g.count}
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor:
                          g.totalScore >= 5
                            ? "#fee2e2"
                            : g.totalScore >= 3
                              ? "#fef3c7"
                              : "#dcfce7",
                        color:
                          g.totalScore >= 5
                            ? "#dc2626"
                            : g.totalScore >= 3
                              ? "#d97706"
                              : "#16a34a",
                      }}
                    >
                      {g.totalScore}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    ₹{g.totalFine.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr
                style={{
                  backgroundColor: "#eff6ff",
                  borderTop: "2px solid #0B0B60",
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
                  TOTAL ({relevantViolations.length} violations)
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {relevantViolations.length}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: "13px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: "#fee2e2",
                      color: "#dc2626",
                    }}
                  >
                    {computedTotalScore}
                  </span>
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
                  ₹{computedTotalFine.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "16px",
            padding: "12px 16px",
            background: "#fef9ee",
            border: "1px solid #fde68a",
            borderRadius: "4px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Total Violations
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: 900, color: "#1f2937" }}
            >
              {relevantViolations.length}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid #fde68a", paddingLeft: "16px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Total Fine Amount
            </div>
            <div
              style={{ fontSize: "20px", fontWeight: 900, color: "#dc2626" }}
            >
              ₹{computedTotalFine.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Evidence */}
        {imageUrl && (
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              Violation Evidence
            </div>
            <img
              src={imageUrl}
              alt="Violation proof"
              style={{
                width: "100%",
                maxHeight: "180px",
                objectFit: "cover",
                border: "1px solid #e2e8f0",
                borderRadius: "4px",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Authority */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "4px",
            padding: "12px 16px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#0B0B60",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
            }}
          >
            Issuing Authority
          </div>
          <div style={{ fontWeight: 700, color: "#0B0B60", fontSize: "13px" }}>
            Kerala Motor Vehicle Department – Government of Kerala
          </div>
          <div style={{ fontSize: "11px", color: "#374151", marginTop: "2px" }}>
            Traffic Enforcement Division
          </div>
        </div>

        {/* Footer notice */}
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            padding: "10px 14px",
            fontSize: "11px",
            color: "#374151",
            textAlign: "center",
          }}
        >
          This challan is generated through the{" "}
          <strong>SAFEWAY Smart Vehicle Blackbox Monitoring System</strong> and
          reported to the <strong>Kerala Motor Vehicle Department</strong> for
          further action.
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="violations.challan_modal.dialog"
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
        }}
      >
        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle
            style={{ color: "#1f2937", fontSize: "16px", fontWeight: 800 }}
          >
            Traffic Violation Challan
          </DialogTitle>
          <p style={{ color: "#6b7280", fontSize: "12px" }}>
            Challan No:{" "}
            <span style={{ fontFamily: "monospace", color: "#374151" }}>
              {challanNo}
            </span>
          </p>
        </DialogHeader>

        <div className="px-6 pb-2">{challanContent}</div>

        <DialogFooter
          className="px-6 pb-5 gap-2 flex-wrap"
          style={{ borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}
        >
          <Button
            variant="outline"
            data-ocid="violations.challan_modal.close_button"
            onClick={() => onOpenChange(false)}
            style={{
              borderColor: "#e2e8f0",
              color: "#374151",
              backgroundColor: "transparent",
              borderRadius: "4px",
            }}
          >
            Close
          </Button>
          <Button
            data-ocid="violations.challan_modal.download_button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2 font-bold"
            style={{
              backgroundColor: "#0B0B60",
              color: "#ffffff",
              borderRadius: "4px",
            }}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating PDF..." : "Download Challan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
