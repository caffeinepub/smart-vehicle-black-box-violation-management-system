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
    const fine = getViolationFine(v);
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

  const location =
    firstViolation.lat != null && firstViolation.lng != null
      ? `${firstViolation.lat}, ${firstViolation.lng}`
      : "Vehicle Monitoring System";

  const handleDownloadPDF = () => {
    const printDiv = document.getElementById("challan-print-content");
    if (printDiv) {
      printDiv.style.display = "block";
      window.print();
      setTimeout(() => {
        printDiv.style.display = "none";
      }, 500);
    } else {
      window.print();
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
        border: "2px solid #2563eb",
        borderRadius: "4px",
      }}
    >
      {/* ── CHALLAN HEADER ── */}
      <div
        style={{
          background: "#fff",
          borderBottom: "3px solid #2563eb",
          padding: "0",
        }}
      >
        {/* Top row: emblem + gov title | SAFEWAY info */}
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
            {/* Text emblem */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "3px solid #1e40af",
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
                  color: "#1e3a8a",
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
                  color: "#1e40af",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                KERALA
              </span>
              <span
                style={{
                  fontSize: "5px",
                  color: "#2563eb",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                ★★★
              </span>
              <span
                style={{
                  fontSize: "5px",
                  color: "#1d4ed8",
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
                  color: "#1e3a8a",
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
                color: "#2563eb",
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
                color: "#1d4ed8",
              }}
            >
              VERIFIED ✓
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div style={{ borderTop: "2px solid #2563eb", margin: "0 24px" }} />

        {/* Title bar */}
        <div
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0",
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
              marginTop: "2px",
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

      {/* Challan body */}
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
              highlight: "#1e3a8a",
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

        {/* Violations table */}
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
                        borderBottom: "2px solid #2563eb",
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
                  borderTop: "2px solid #2563eb",
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
                    {totalScore}
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
                  ₹{totalFine.toLocaleString("en-IN")}
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
              ₹{totalFine.toLocaleString("en-IN")}
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
              color: "#1e40af",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
            }}
          >
            Issuing Authority
          </div>
          <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "13px" }}>
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
    <>
      {/* Hidden print content */}
      <div id="challan-print-content" style={{ display: "none" }}>
        {challanContent}
      </div>

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

          {/* Challan content rendered inline */}
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
              className="gap-2 font-bold"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: "4px",
              }}
            >
              <Download className="w-4 h-4" />
              Download Challan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
