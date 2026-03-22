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
import { Download, IndianRupee } from "lucide-react";
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
  groupViolations?: NodeViolation[];
  "data-ocid"?: string;
  onPayNow?: () => void;
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

// Change 1: use onloadend instead of onload, and check res.ok
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function generatePDF(
  vehicleNo: string,
  grouped: GroupedViolation[],
  totalScore: number,
  _totalFine: number,
  isPaid: boolean,
  ownerName: string,
  ownerMobile: string,
  location: string,
  violationDateTime: string,
  issueDate: string,
  challanNo: string,
  violationCount: number,
  isMultipleViolationCase: boolean,
  evidenceImages: string[] = [],
  individualViolations?: import("@/lib/api").NodeViolation[],
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

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 15;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = 0;

  // Try to load logo from backend
  const logoBase64 = await imageToBase64(
    "https://vehicle-blackbox-system-1.onrender.com/logo.png",
  ).catch(() => null);

  // Kerala Police / MVD Logo at top
  const mvdLogoBase64 = await imageToBase64(
    "https://upload.wikimedia.org/wikipedia/commons/7/7b/Kerala_Police_Logo.png",
  ).catch(() => null);
  if (mvdLogoBase64) {
    try {
      doc.addImage(mvdLogoBase64, "PNG", (PAGE_W - 25) / 2, 1, 25, 25);
    } catch {}
    y = 30;
  }

  // Header band
  doc.setFillColor(11, 11, 96);
  doc.rect(0, 0, PAGE_W, 38, "F");

  doc.setTextColor(255, 215, 0);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Government of Kerala", PAGE_W / 2, 10, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("Motor Vehicle Department", PAGE_W / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.text("Traffic Violation Challan", PAGE_W / 2, 25, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 255);
  doc.text(
    "Generated by SafeDrive Intelligent Traffic Monitoring System",
    PAGE_W / 2,
    32,
    { align: "center" },
  );

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", MARGIN, 5, 20, 20);
    } catch {}
  }

  y = 45;

  if (isMultipleViolationCase) {
    doc.setFillColor(220, 38, 38);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("⚠ MULTIPLE VIOLATION CASE", PAGE_W / 2, y + 5.5, {
      align: "center",
    });
    y += 12;
  }

  // Challan meta
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const status = isPaid ? "PAID" : "PAYMENT PENDING";
  doc.text(`Challan No: ${challanNo}`, MARGIN, y);
  doc.text(`Date: ${issueDate}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 7;
  doc.text(`Status: ${status}`, MARGIN, y);
  y += 10;

  // Divider
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  // Vehicle / Owner info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Vehicle & Owner Details", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const infoRows = [
    ["Vehicle Number", vehicleNo],
    ["Owner Name", ownerName],
    ["Mobile", ownerMobile],
    ["Total Violations", String(violationCount)],
    ["Violation Date/Time", violationDateTime],
    ["Location", location],
  ];
  for (const [label, value] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + 45, y);
    y += 6;
  }
  y += 4;

  // Violation table header
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text("Violation Type", MARGIN + 2, y + 5);
  doc.text("Score", MARGIN + 105, y + 5);
  doc.text("Fine (₹)", MARGIN + 135, y + 5);
  y += 10;

  // Use individual violation rows if provided, otherwise fall back to grouped
  const tableRows: { type: string; score: number; fine: number }[] =
    individualViolations && individualViolations.length > 0
      ? individualViolations.map((v) => ({
          type: v.violationType || "",
          score: v.score,
          fine: v.fine != null ? v.fine : v.score * 1000,
        }))
      : grouped.flatMap((g) =>
          Array(g.count)
            .fill(null)
            .map(() => ({
              type: g.violationType,
              score: g.totalScore / g.count,
              fine: (g.totalScore / g.count) * 1000,
            })),
        );

  // Rebuild table header for individual rows (Type | Score | Fine)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  for (const row of tableRows) {
    doc.text(row.type, MARGIN + 2, y);
    doc.text(String(row.score), MARGIN + 105, y);
    doc.text(Math.round(row.fine).toLocaleString("en-IN"), MARGIN + 135, y);
    y += 6;
  }

  // Totals
  y += 3;
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Total Score:", MARGIN + 85, y);
  doc.text(String(totalScore), MARGIN + 115, y);
  y += 6;
  const pdfTotalFine = tableRows.reduce((s, r) => s + r.fine, 0);
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(11);
  doc.text(
    `Total Fine: ₹${pdfTotalFine.toLocaleString("en-IN")}`,
    MARGIN + 70,
    y,
  );
  y += 12;

  // Change 2: Evidence Image (single best image, full-width 180×100mm)
  if (evidenceImages.length > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("Evidence Image", MARGIN, y);
    y += 6;
    // Only use the first/best image
    const imgUrl = evidenceImages[0];
    const b64 = await imageToBase64(imgUrl);
    if (b64) {
      if (y > 200) {
        doc.addPage();
        y = 20;
      }
      try {
        doc.addImage(b64, "JPEG", MARGIN, y, 180, 100);
        y += 105;
      } catch {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("No Image Available", MARGIN, y);
        y += 8;
      }
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("No Image Available", MARGIN, y);
      y += 8;
    }
  }

  // Footer
  doc.setTextColor(100, 100, 120);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Generated by SafeDrive Intelligent Traffic Monitoring System. Cooperated with Kerala Motor Vehicle Department.",
    PAGE_W / 2,
    285,
    { align: "center" },
  );
  doc.text(
    "Cooperated with Kerala Motor Vehicle Department.",
    PAGE_W / 2,
    290,
    { align: "center" },
  );

  doc.save(`challan-${vehicleNo}-${challanNo}.pdf`);
}

export default function ChallanPreviewModal({
  open,
  onOpenChange,
  violations,
  vehicleNo,
  totalScore,
  totalFine,
  isPaid = false,
  groupViolations,
  "data-ocid": dataOcid,
  onPayNow,
}: ChallanPreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const isMultipleViolationCase = !!groupViolations;

  // Use groupViolations if provided, otherwise filter by vehicleNo
  const relevantViolations = groupViolations
    ? groupViolations
    : vehicleNo
      ? violations.filter((v) => v.vehicleNo === vehicleNo)
      : violations;

  const firstViolation = relevantViolations[0];
  const ownerName = firstViolation?.ownerName || DEFAULT_OWNER;
  const ownerMobile = firstViolation?.mobile || DEFAULT_MOBILE;
  const effectiveVehicleNo =
    vehicleNo || firstViolation?.vehicleNo || "UNKNOWN";

  const location =
    firstViolation?.lat != null && firstViolation?.lng != null
      ? `${firstViolation.lat}, ${firstViolation.lng}`
      : "Location not available";

  const violationDateTime = firstViolation
    ? formatDDMMYYYY(firstViolation.timestamp)
    : "—";

  const grouped = groupViolationsByType(relevantViolations);

  const _latestWithImage = [...relevantViolations]
    .reverse()
    .find((v) => v.path || v.image || v.imageUrl);
  const evidenceImageUrl =
    _latestWithImage?.path || _latestWithImage?.image
      ? `https://vehicle-blackbox-system-1.onrender.com${_latestWithImage?.path || _latestWithImage?.image}`
      : normalizeImageUrl(_latestWithImage?.imageUrl);

  const issueDate = formatIssueDateOnly(new Date());
  const challanNo = `SMVB-${Date.now().toString().slice(-8)}`;

  // Change 3: pass only the single best evidence image (already resolved as full URL)
  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Pass only the single best evidence image — convert to base64 inside generatePDF
      const evidenceImages: string[] = evidenceImageUrl
        ? [evidenceImageUrl]
        : [];
      await generatePDF(
        effectiveVehicleNo,
        grouped,
        totalScore,
        totalFine,
        isPaid,
        ownerName,
        ownerMobile,
        location,
        violationDateTime,
        issueDate,
        challanNo,
        relevantViolations.length,
        isMultipleViolationCase,
        evidenceImages,
        relevantViolations,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid={dataOcid || "challan.dialog"}
        className="max-w-2xl p-0 overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Challan Preview</DialogTitle>
        </DialogHeader>

        {/* Header Band */}
        <div
          className="px-6 py-5 text-center"
          style={{
            background: "linear-gradient(135deg, #0B0B60 0%, #1e3a8a 100%)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "#ffd700" }}
          >
            Government of Kerala
          </p>
          <h2 className="text-lg font-extrabold text-white">
            Motor Vehicle Department
          </h2>
          <p className="text-sm text-white opacity-90">
            Traffic Violation Challan
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(200,200,255,0.9)" }}
          >
            Generated by SafeDrive Intelligent Traffic Monitoring System
          </p>
        </div>

        {isMultipleViolationCase && (
          <div
            className="px-6 py-2 text-center font-bold text-sm"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
          >
            ⚠ MULTIPLE VIOLATION CASE
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Challan meta */}
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <p className="text-xs" style={{ color: "#6b7280" }}>
                Challan No
              </p>
              <p className="font-mono font-bold" style={{ color: "#1f2937" }}>
                {challanNo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "#6b7280" }}>
                Issue Date
              </p>
              <p className="font-semibold text-sm" style={{ color: "#1f2937" }}>
                {issueDate}
              </p>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-black"
              style={{
                backgroundColor: isPaid ? "#dcfce7" : "#fee2e2",
                color: isPaid ? "#16a34a" : "#dc2626",
              }}
            >
              {isPaid ? "PAID" : "PAYMENT PENDING"}
            </div>
          </div>

          {/* Vehicle + Owner */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#6b7280" }}
            >
              Vehicle & Owner Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  Vehicle Number
                </p>
                <p
                  className="font-black font-mono text-base tracking-widest"
                  style={{ color: "#0B0B60" }}
                >
                  {effectiveVehicleNo}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  Owner Name
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
                  {ownerMobile}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  Date/Time
                </p>
                <p className="font-mono text-xs" style={{ color: "#374151" }}>
                  {violationDateTime}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs" style={{ color: "#9ca3af" }}>
                  Location
                </p>
                <p className="text-xs" style={{ color: "#374151" }}>
                  {firstViolation?.location
                    ? `📍 ${firstViolation.location} (${firstViolation.lat ?? "—"}, ${firstViolation.lng ?? "—"})`
                    : location}
                </p>
              </div>
            </div>
          </div>

          {/* Violation table */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid #e2e8f0" }}
          >
            <div className="px-4 py-2" style={{ backgroundColor: "#f1f5f9" }}>
              <h3
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "#374151" }}
              >
                Violation Details
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    className="text-left px-4 py-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#6b7280" }}
                  >
                    Violation
                  </th>
                  <th
                    className="text-center px-4 py-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#6b7280" }}
                  >
                    ×
                  </th>
                  <th
                    className="text-center px-4 py-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#6b7280" }}
                  >
                    Score
                  </th>
                  <th
                    className="text-right px-4 py-2 text-xs font-bold uppercase tracking-widest"
                    style={{ color: "#6b7280" }}
                  >
                    Fine
                  </th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g, i) => (
                  <tr
                    key={`${g.violationType}-${i}`}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <td className="px-4 py-2" style={{ color: "#1f2937" }}>
                      {g.violationType}
                      {g.violationType?.toLowerCase() === "overspeed" && (
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
                    </td>
                    <td
                      className="px-4 py-2 text-center"
                      style={{ color: "#6b7280" }}
                    >
                      {g.count}
                    </td>
                    <td
                      className="px-4 py-2 text-center"
                      style={{ color: "#374151" }}
                    >
                      {g.totalScore}
                    </td>
                    <td
                      className="px-4 py-2 text-right font-bold"
                      style={{ color: "#dc2626" }}
                    >
                      ₹{g.totalFine.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #e2e8f0",
                    backgroundColor: "#f1f5f9",
                  }}
                >
                  <td
                    className="px-4 py-2 font-bold"
                    style={{ color: "#1f2937" }}
                  >
                    Total
                  </td>
                  <td />
                  <td
                    className="px-4 py-2 text-center font-black"
                    style={{ color: "#0B0B60" }}
                  >
                    {totalScore}
                  </td>
                  <td
                    className="px-4 py-2 text-right font-black text-base"
                    style={{ color: "#dc2626" }}
                  >
                    ₹{totalFine.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Driver Evidence Image */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#6b7280" }}
            >
              Driver Evidence Image
            </h3>
            {evidenceImageUrl ? (
              <img
                src={evidenceImageUrl}
                alt="Violation evidence"
                className="max-w-full rounded-lg"
                style={{ maxHeight: "240px", objectFit: "contain" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <p className="text-sm italic" style={{ color: "#9ca3af" }}>
                Violation image not available
              </p>
            )}
          </div>

          {/* Footer note */}
          <p
            className="text-xs text-center italic"
            style={{ color: "#9ca3af" }}
          >
            Generated by SafeDrive Intelligent Traffic Monitoring System.
            Cooperated with Kerala Motor Vehicle Department. Cooperated with
            Kerala Motor Vehicle Department.
          </p>
        </div>

        <DialogFooter className="px-6 pb-5">
          {!isPaid && onPayNow && (
            <Button
              data-ocid="challan.pay_button"
              onClick={onPayNow}
              className="font-bold"
              style={{
                backgroundColor: "#16a34a",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              <IndianRupee className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          )}
          <Button
            data-ocid="challan.download_button"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="font-bold"
            style={{
              backgroundColor: "#0B0B60",
              color: "#fff",
              borderRadius: "4px",
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
          <Button
            data-ocid="challan.close_button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            style={{ borderRadius: "4px" }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
