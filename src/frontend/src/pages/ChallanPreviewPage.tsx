import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  type NodeViolation,
  fetchViolations,
  getViolationFine,
} from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";

// Format dateTime/timestamp as "12 March 2026, 03:45 PM"
function formatDateTime(timestamp: string | number | undefined): string {
  if (!timestamp) return "—";
  let d = new Date(timestamp as string);
  if (Number.isNaN(d.getTime()) && typeof timestamp === "string") {
    const asNum = Number(timestamp);
    if (!Number.isNaN(asNum)) d = new Date(asNum);
  }
  if (Number.isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Get date/time from violation, preferring dateTime field over timestamp
function getViolationDateTime(v: NodeViolation): string {
  return formatDateTime(v.dateTime || v.timestamp);
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
  // Try canvas approach first to avoid black image issue with jsPDF
  try {
    const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `${url + (url.includes("?") ? "&" : "?")}_t=${Date.now()}`;
    });
    const canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth || imgEl.width || 640;
    canvas.height = imgEl.naturalHeight || imgEl.height || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgEl, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    // fall through to fetch approach
  }
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

  const isMultiple = violations.length > 1;
  const challanTitle = isMultiple
    ? "MULTIPLE VIOLATION CASE"
    : "TRAFFIC VIOLATION CHALLAN";

  // Header background
  doc.setFillColor(11, 11, 96);
  doc.rect(0, 0, pageW, 44, "F");

  // Try loading logo
  try {
    const logoData = await loadImageAsDataUrl("/logo.png");
    if (logoData) {
      doc.addImage(
        logoData,
        "PNG",
        pageW / 2 - 10,
        4,
        20,
        20,
        undefined,
        "MEDIUM",
      );
    }
  } catch {
    /* ignore */
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("GOVERNMENT OF KERALA – MOTOR VEHICLE DEPARTMENT", pageW / 2, 28, {
    align: "center",
  });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(challanTitle, pageW / 2, 36, { align: "center" });

  y = 50;

  // Challan number
  const challanNo = `SMVB-${vehicleNo.replace(/\s/g, "")}`;
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Challan No: ${challanNo}`, margin, y);
  y += 8;

  // Vehicle & Owner section
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VEHICLE DETAILS", margin, y);
  y += 5;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageW - margin * 2, 36, 2, 2, "F");

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
  doc.text("Date & Time", margin + 4, y + 22);
  doc.text("Location", margin + 60, y + 22);

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.text(getViolationDateTime(firstV), margin + 4, y + 29);

  const locText =
    firstV.lat !== undefined && firstV.lng !== undefined
      ? `Lat: ${firstV.lat}, Lng: ${firstV.lng}`
      : "Location not available";
  doc.text(locText, margin + 60, y + 29);

  y += 44;

  // Violations table header
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("VIOLATION DETAILS", margin, y);
  y += 5;

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
    doc.text(String(v.score ?? 0), margin + 95, y + 5.5);
    doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${fine.toLocaleString()}`, pageW - margin - 3, y + 5.5, {
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
  doc.text(
    `TOTAL (${violations.length} violation${violations.length > 1 ? "s" : ""})`,
    margin + 3,
    y + 6.5,
  );
  doc.text(String(totalScore), margin + 95, y + 6.5);
  doc.setTextColor(220, 38, 38);
  doc.text(`Rs. ${totalFine.toLocaleString()}`, pageW - margin - 3, y + 6.5, {
    align: "right",
  });
  y += 18;

  // Driver Evidence Image section
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PROOF IMAGE / EVIDENCE", margin, y);
  y += 5;

  if (evidenceImageUrl) {
    try {
      const imgData = await loadImageAsDataUrl(evidenceImageUrl);
      if (imgData) {
        const imgW = pageW - margin * 2;
        const imgH = 55;
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
        doc.text("No Evidence Image", pageW / 2, y + 10, {
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
      doc.text("No Evidence Image", pageW / 2, y + 10, {
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
    doc.text("No Evidence Image", pageW / 2, y + 10, {
      align: "center",
    });
    y += 24;
  }

  y += 4;

  // Footer
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Generated by SafeDrive Intelligent Traffic Monitoring System",
    pageW / 2,
    y + 6,
    { align: "center" },
  );
  doc.text(
    "Cooperated with Kerala Motor Vehicle Department.",
    pageW / 2,
    y + 12,
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

  const challanGroups = Array.from(vehicleGroups.entries())
    .map(([vehicleNo, viols]) => ({
      vehicleNo,
      violations: viols,
      totalScore: viols.reduce((s, v) => s + (v.score ?? 0), 0),
      totalFine: viols.reduce((s, v) => s + getViolationFine(v), 0),
    }))
    .filter((g) => g.totalScore >= 5);

  const handleDownload = async (g: (typeof challanGroups)[0]) => {
    setDownloadingVehicle(g.vehicleNo);
    try {
      const evidenceViol =
        [...g.violations].reverse().find((v) => v.imageUrl) ?? g.violations[0];
      const rawUrl = evidenceViol?.imageUrl;
      // Build uploads URL: prefer backend path
      const evidenceImgUrl = rawUrl ? normalizeImageUrl(rawUrl) : undefined;
      await downloadChallanPDF(
        g.vehicleNo,
        g.violations,
        g.totalScore,
        g.totalFine,
        evidenceImgUrl,
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
            style={{ borderColor: "#0B0B60", borderTopColor: "transparent" }}
          />
          <span className="font-medium">Loading challan data...</span>
        </div>
      </div>
    );
  }

  if (challanGroups.length === 0) {
    const totalScore = violations.reduce((s, v) => s + (v.score ?? 0), 0);
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
              style={{ color: "#0B0B60", opacity: 0.5 }}
            />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "#0B0B60" }}>
            No Challan Generated
          </h2>
          <p className="text-gray-500 text-sm max-w-md">
            No vehicle has crossed the violation threshold of <strong>5</strong>
            . Current total score is <strong>{totalScore}</strong>. Challan is
            generated only when total score &ge; 5.
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
        const rawImageUrl = evidenceViolation?.imageUrl;
        const imageUrl = rawImageUrl ? normalizeImageUrl(rawImageUrl) : "";
        const challanNo = `SMVB-${g.vehicleNo.replace(/\s/g, "")}`;
        const isMultiple = g.violations.length > 1;

        // Location from first violation
        const locationText =
          firstViolation.lat !== undefined && firstViolation.lng !== undefined
            ? `Lat: ${firstViolation.lat}, Lng: ${firstViolation.lng}`
            : "Location not available";

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
                <span className="font-mono" style={{ color: "#0B0B60" }}>
                  {g.vehicleNo}
                </span>
              </span>
              <Button
                onClick={() => handleDownload(g)}
                disabled={downloadingVehicle === g.vehicleNo}
                className="gap-2 text-white"
                style={{ borderRadius: "2px", backgroundColor: "#0B0B60" }}
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
                    "linear-gradient(135deg, #0B0B60 0%, #1e3a8a 100%)",
                }}
              >
                {/* Logo centered at top */}
                <div className="flex justify-center mb-3">
                  <img
                    src="/logo.png"
                    alt="Kerala Motor Vehicle Department"
                    className="h-20 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                {/* Header branding row */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                      style={{
                        backgroundColor: "#ffd700",
                        color: "#0B0B60",
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
                      className="w-12 h-12 object-contain opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* Challan title */}
                <div
                  className="border-t pt-4 text-center"
                  style={{ borderColor: "rgba(255,255,255,0.25)" }}
                >
                  <p className="text-2xl font-bold uppercase tracking-widest">
                    {isMultiple
                      ? "MULTIPLE VIOLATION CASE"
                      : "TRAFFIC VIOLATION CHALLAN"}
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
                      style={{ color: "#0B0B60" }}
                    >
                      {g.vehicleNo}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Date &amp; Time
                    </p>
                    <p className="font-semibold text-gray-800">
                      {getViolationDateTime(firstViolation)}
                    </p>
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
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                      Location
                    </p>
                    <p className="font-semibold text-gray-800">
                      {locationText}
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
                              key={`row-${v.vehicleNo}-${v.timestamp || v.dateTime}-${i}`}
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
                                      (v.score ?? 0) >= 5
                                        ? "#fee2e2"
                                        : (v.score ?? 0) >= 3
                                          ? "#fff7ed"
                                          : "#dcfce7",
                                    color:
                                      (v.score ?? 0) >= 5
                                        ? "#991b1b"
                                        : (v.score ?? 0) >= 3
                                          ? "#c2410c"
                                          : "#166534",
                                  }}
                                >
                                  {v.score ?? 0}
                                </span>
                              </td>
                              <td
                                className="px-4 py-3 text-right text-sm font-bold"
                                style={{ color: "#dc2626" }}
                              >
                                &#8377;{fine.toLocaleString()}
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
                            TOTAL ({g.violations.length} violation
                            {g.violations.length > 1 ? "s" : ""})
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
                            &#8377;{g.totalFine.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Proof Image / Evidence */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Proof Image / Evidence
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
                              '<div class="flex items-center justify-center h-24 text-gray-400 text-sm bg-gray-50">No Evidence Image</div>';
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
                      No Evidence Image
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
                    style={{ color: "#0B0B60" }}
                  >
                    Issuing Authority
                  </p>
                  <p className="font-semibold text-gray-800">
                    SafeDrive Intelligent Traffic Monitoring System
                  </p>
                  <p className="text-xs text-gray-500 italic mt-0.5">
                    Cooperated with Kerala Motor Vehicle Department.
                  </p>
                </div>

                {/* Payment Instructions */}
                <div
                  className="text-sm bg-yellow-50 border border-yellow-200 p-4 rounded-lg"
                  style={{ color: "#713f12" }}
                >
                  <p
                    className="font-semibold mb-1"
                    style={{ color: "#0B0B60" }}
                  >
                    Payment Instructions:
                  </p>
                  <p>
                    Please pay the fine within 60 days to avoid additional
                    penalties. Payment can be made online or at any authorized
                    Kerala RTO office.
                  </p>
                </div>

                {/* Footer */}
                <div
                  className="text-center py-4 border-t text-xs text-gray-400"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <p>
                    Generated by SafeDrive Intelligent Traffic Monitoring System
                  </p>
                  <p>Cooperated with Kerala Motor Vehicle Department.</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
