import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type NodeViolation,
  fetchViolations,
  getViolationFine,
} from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, Shield } from "lucide-react";
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

// Group violations by vehicle number
function groupByVehicle(
  violations: NodeViolation[],
): Map<string, NodeViolation[]> {
  const map = new Map<string, NodeViolation[]>();
  for (const v of violations) {
    const key = v.vehicleNo;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return map;
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadChallanPDF(
  vehicleNo: string,
  violations: NodeViolation[],
  totalScore: number,
  totalFine: number,
  evidenceImageUrl?: string,
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

  // Header background
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
  const challanNo = `SMVB-${Date.now().toString().slice(-8)}`;
  doc.text(`Challan No: ${challanNo}`, pageW / 2, 28, { align: "center" });
  doc.text(
    "Generated via SafeDrive Intelligent Traffic Monitoring System",
    pageW / 2,
    34,
    { align: "center" },
  );

  y = 46;

  // Vehicle & Owner section
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VEHICLE DETAILS", margin, y);
  y += 5;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, "F");

  const firstV = violations[0];
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Vehicle Number", margin + 4, y + 6);
  doc.text("Owner Name", margin + 60, y + 6);
  doc.text("Mobile", margin + 115, y + 6);

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(vehicleNo, margin + 4, y + 14);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.text(firstV.ownerName || "Mark", margin + 60, y + 14);
  doc.setFontSize(9);
  doc.text(firstV.mobile || "+91 8520649127", margin + 115, y + 14);

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Issue Date", margin + 4, y + 22);
  doc.text("Violation Date & Time", margin + 60, y + 22);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  const today = new Date();
  const issueDate = `${today.getDate().toString().padStart(2, "0")}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getFullYear()}`;
  doc.text(issueDate, margin + 4, y + 27);
  doc.setTextColor(220, 38, 38);
  doc.text(formatDateTime(firstV.timestamp), margin + 60, y + 27);

  y += 36;

  // Violations table header
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VIOLATION DETAILS", margin, y);
  y += 5;

  // Table header row
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageW - margin * 2, 8, "F");
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y + 8, pageW - margin, y + 8);

  doc.setTextColor(55, 65, 81);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Violation Type", margin + 3, y + 5.5);
  doc.text("Score", margin + 95, y + 5.5);
  doc.text("Fine Amount", pageW - margin - 3, y + 5.5, { align: "right" });
  y += 8;

  // Table rows
  for (let i = 0; i < violations.length; i++) {
    const v = violations[i];
    const fine = getViolationFine(v);
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
    doc.text(v.violationType, margin + 3, y + 5.5);
    doc.text(String(v.score), margin + 95, y + 5.5);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs.${fine.toLocaleString()}`, pageW - margin - 3, y + 5.5, {
      align: "right",
    });
    y += 8;
  }

  // Totals row
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, y, pageW - margin * 2, 10, "F");
  doc.setDrawColor(37, 99, 235);
  doc.line(margin, y, pageW - margin, y);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL (${violations.length} violations)`, margin + 3, y + 6.5);
  doc.text(String(totalScore), margin + 95, y + 6.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Rs.${totalFine.toLocaleString()}`, pageW - margin - 3, y + 6.5, {
    align: "right",
  });
  y += 18;

  // Driver Evidence Image section
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DRIVER EVIDENCE IMAGE", margin, y);
  y += 5;

  if (evidenceImageUrl) {
    try {
      const imgData = await loadImageAsDataUrl(evidenceImageUrl);
      if (imgData) {
        const imgW = pageW - margin * 2;
        const imgH = 60;
        doc.addImage(
          imgData,
          "JPEG",
          margin,
          y,
          imgW,
          imgH,
          undefined,
          "MEDIUM",
        );
        y += imgH + 6;
      } else {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Violation image not available", pageW / 2, y + 10, {
          align: "center",
        });
        y += 24;
      }
    } catch {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Violation image not available", pageW / 2, y + 10, {
        align: "center",
      });
      y += 24;
    }
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Violation image not available", pageW / 2, y + 10, {
      align: "center",
    });
    y += 24;
  }

  y += 4;

  // Footer
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageW - margin * 2, 14, 2, 2, "F");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This challan is generated via SafeDrive Intelligent Traffic Monitoring System and reported to Kerala MVD.",
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

export default function ChallanPreviewPage() {
  const navigate = useNavigate();
  const [violations, setViolations] = useState<NodeViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingVehicle, setDownloadingVehicle] = useState<string | null>(
    null,
  );

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

  const vehicleGroups = groupByVehicle(violations);

  // Only vehicles with totalScore >= 5 get a challan
  const challanGroups = Array.from(vehicleGroups.entries())
    .map(([vehicleNo, viols]) => ({
      vehicleNo,
      violations: viols,
      totalScore: viols.reduce((s, v) => s + v.score, 0),
      totalFine: viols.reduce((s, v) => s + getViolationFine(v), 0),
    }))
    .filter((g) => g.totalScore >= 5);

  const handleDownload = async (g: (typeof challanGroups)[0]) => {
    setDownloadingVehicle(g.vehicleNo);
    try {
      const evidenceViol =
        [...g.violations].reverse().find((v) => v.imageUrl) ?? g.violations[0];
      const evidenceImgUrl = normalizeImageUrl(evidenceViol?.imageUrl);
      await downloadChallanPDF(
        g.vehicleNo,
        g.violations,
        g.totalScore,
        g.totalFine,
        evidenceImgUrl || undefined,
      );
    } finally {
      setDownloadingVehicle(null);
    }
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

  if (challanGroups.length === 0) {
    const totalScore = violations.reduce((s, v) => s + v.score, 0);
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
            No vehicle has crossed the violation threshold of <strong>5</strong>
            . Current total score is <strong>{totalScore}</strong>. Challan is
            generated only when total score ≥ 5.
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/violations" })}
          style={{ borderRadius: "2px" }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Violations
        </Button>
        <span className="text-sm text-gray-500">
          {challanGroups.length} challan{challanGroups.length > 1 ? "s" : ""}{" "}
          generated
        </span>
      </div>

      {challanGroups.map((g) => {
        const firstViolation = g.violations[0];
        const evidenceViolation =
          [...g.violations].reverse().find((v) => v.imageUrl) ?? firstViolation;
        const imageUrl = normalizeImageUrl(evidenceViolation?.imageUrl);
        const challanNo = `SMVB-${g.vehicleNo.replace(/\s/g, "")}`;
        const issuedAt = formatDateTime(firstViolation.timestamp);

        return (
          <div
            key={g.vehicleNo}
            className="bg-white border border-gray-200 shadow-sm overflow-hidden"
            style={{ borderRadius: "4px" }}
          >
            {/* Action Bar */}
            <div
              className="flex items-center justify-between px-6 py-3"
              style={{
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span className="text-sm font-semibold text-gray-700">
                Challan for{" "}
                <span className="font-mono text-blue-700">{g.vehicleNo}</span>
              </span>
              <Button
                onClick={() => handleDownload(g)}
                disabled={downloadingVehicle === g.vehicleNo}
                className="gap-2 text-white"
                style={{ borderRadius: "2px", backgroundColor: "#0B3D91" }}
                data-ocid="challan.download_button"
              >
                <Download className="w-4 h-4" />
                {downloadingVehicle === g.vehicleNo
                  ? "Generating..."
                  : "Download PDF"}
              </Button>
            </div>

            {/* Challan Document */}
            <div id={`challan-print-content-${g.vehicleNo}`}>
              {/* Official Header */}
              <div
                className="text-white p-6"
                style={{
                  background:
                    "linear-gradient(135deg, #082d6b 0%, #0B3D91 100%)",
                }}
              >
                {/* Two-logo header: MVD left, SafeDrive right */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  {/* MVD Logo - Left */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 font-black text-lg"
                      style={{
                        backgroundColor: "#ffd700",
                        color: "#082d6b",
                        border: "3px solid rgba(255,255,255,0.4)",
                      }}
                    >
                      MVD
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest opacity-75">
                        Government of Kerala
                      </p>
                      <p className="font-bold text-base leading-tight">
                        Motor Vehicle Department
                      </p>
                    </div>
                  </div>
                  {/* SafeDrive Logo - Right */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs opacity-75">Reported by</p>
                      <p
                        className="font-bold text-sm"
                        style={{ color: "#ffd700" }}
                      >
                        SafeDrive
                      </p>
                    </div>
                    <img
                      src="/assets/generated/safeway-logo-transparent.dim_200x200.png"
                      alt="SafeDrive"
                      className="w-14 h-14 object-contain opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
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
                      {g.vehicleNo}
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
                      {firstViolation.ownerName || "Mark"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Mobile Number
                    </p>
                    <p className="font-semibold text-gray-800 text-lg font-mono">
                      {firstViolation.mobile || "+91 8520649127"}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Violations Table — one row per violation */}
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
                          {["Violation Type", "Score", "Fine Amount"].map(
                            (h, i) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
                                style={{
                                  color: "#1e3a6e",
                                  borderBottom: "2px solid #bfdbfe",
                                  textAlign:
                                    i === 0
                                      ? "left"
                                      : i === 2
                                        ? "right"
                                        : "center",
                                }}
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {g.violations.map((v, i) => {
                          const fine = getViolationFine(v);
                          return (
                            <tr
                              key={`row-${v.vehicleNo}-${v.timestamp}-${i}`}
                              style={{
                                backgroundColor:
                                  i % 2 === 0 ? "#ffffff" : "#f8faff",
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
                          <td className="px-4 py-3 font-bold text-gray-900">
                            TOTAL ({g.violations.length} violations)
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className="font-black text-sm px-2.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: "#fee2e2",
                                color: "#991b1b",
                              }}
                            >
                              {g.totalScore}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-right text-2xl font-extrabold"
                            style={{ color: "#dc2626" }}
                          >
                            ₹{g.totalFine.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Driver Evidence Image */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Driver Evidence Image
                  </p>
                  {imageUrl ? (
                    <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-black">
                      <img
                        src={imageUrl}
                        alt="Violation evidence"
                        className="w-full h-auto max-h-72 object-contain mx-auto block"
                        onError={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML =
                              '<div class="flex items-center justify-center h-24 text-gray-400 text-sm bg-gray-50">Violation image not available</div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed text-sm"
                      style={{
                        borderColor: "#e5e7eb",
                        color: "#9ca3af",
                        backgroundColor: "#f9fafb",
                      }}
                    >
                      Violation image not available
                    </div>
                  )}
                </div>

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
                  <p className="font-semibold text-gray-800">
                    SafeDrive Intelligent Traffic Monitoring System
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
                  <p
                    className="font-semibold mb-1"
                    style={{ color: "#0B3D91" }}
                  >
                    Payment Instructions:
                  </p>
                  <p>
                    Please pay the fine within 60 days to avoid additional
                    penalties. Payment can be made online or at any authorized
                    Kerala RTO office.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
