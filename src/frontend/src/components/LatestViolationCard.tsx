import { Button } from "@/components/ui/button";
import type { NodeViolation } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { Car, FileText, Phone, Siren, User } from "lucide-react";

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

interface LatestViolationCardProps {
  violation: NodeViolation;
  onViewChallan: () => void;
  onViewVehicle: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 5) return "#dc2626";
  if (score >= 3) return "#c2410c";
  if (score >= 2) return "#d97706";
  return "#16a34a";
}

export default function LatestViolationCard({
  violation,
  onViewChallan,
  onViewVehicle,
}: LatestViolationCardProps) {
  const imageUrl = normalizeImageUrl(violation.imageUrl);
  const scoreColor = getScoreColor(violation.score);
  const isAccident = violation.violationType
    ?.toLowerCase()
    .includes("accident");

  return (
    <div
      className="overflow-hidden shadow-xl rounded-xl"
      style={{
        border: `2px solid ${isAccident ? "#dc2626" : "#0B3D91"}`,
      }}
    >
      {/* Alert Header Bar */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{
          background: isAccident
            ? "linear-gradient(90deg, #dc2626, #b91c1c)"
            : "linear-gradient(90deg, #2563eb, #1d4ed8)",
        }}
      >
        <Siren className="w-5 h-5 flex-shrink-0" style={{ color: "#fca5a5" }} />
        <span className="text-white font-extrabold text-sm uppercase tracking-widest">
          Latest Violation Alert
        </span>
        <span
          className="ml-auto text-xs font-mono px-2 py-0.5"
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            color: "#bfdbfe",
            borderRadius: "2px",
          }}
        >
          {formatDateTime(violation.timestamp)}
        </span>
      </div>

      {/* Card Content */}
      <div className="bg-white p-5">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Details */}
          <div className="space-y-4">
            {/* Vehicle Number */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "#9ca3af" }}
              >
                Vehicle Number
              </p>
              <p
                className="text-3xl font-black font-mono tracking-widest"
                style={{ color: "#0B3D91" }}
              >
                {violation.vehicleNo}
              </p>
            </div>

            {/* Violation Type Badge */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "#9ca3af" }}
              >
                Violation Type
              </p>
              <span
                className="inline-block px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white"
                style={{
                  backgroundColor: isAccident ? "#dc2626" : "#b91c1c",
                  borderRadius: "3px",
                }}
              >
                {violation.violationType}
              </span>
            </div>

            {/* Score + Time grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Score
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-sm"
                    style={{ backgroundColor: scoreColor }}
                  >
                    {violation.score}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: scoreColor }}
                  >
                    pts
                  </span>
                </div>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Time
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {formatDateTime(violation.timestamp)}
                </p>
              </div>
            </div>

            {/* Owner */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1"
                style={{ color: "#9ca3af" }}
              >
                <User className="w-3 h-3" />
                Owner
              </p>
              <p className="font-semibold text-gray-800">
                {violation.ownerName || "N/A"}
              </p>
            </div>

            {/* Mobile */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1"
                style={{ color: "#9ca3af" }}
              >
                <Phone className="w-3 h-3" />
                Mobile
              </p>
              <p className="font-semibold text-gray-800 font-mono">
                {violation.mobile || "N/A"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button
                onClick={onViewChallan}
                size="sm"
                className="flex-1 font-semibold text-white"
                style={{
                  backgroundColor: "#0B3D91",
                  borderRadius: "3px",
                }}
                data-ocid="violations.latest_challan.button"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                View Challan
              </Button>
              <Button
                onClick={onViewVehicle}
                variant="outline"
                size="sm"
                className="flex-1 font-semibold transition-colors"
                style={{
                  borderColor: "#0B3D91",
                  color: "#0B3D91",
                  borderRadius: "3px",
                }}
                data-ocid="violations.latest_vehicle.button"
              >
                <Car className="w-4 h-4 mr-1.5" />
                Vehicle Details
              </Button>
            </div>
          </div>

          {/* Right: Proof Image */}
          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}
            >
              Proof Image / Evidence
            </p>
            {imageUrl ? (
              <div
                className="overflow-hidden border-2"
                style={{
                  borderColor: isAccident ? "#dc2626" : "#d1d5db",
                  borderRadius: "6px",
                }}
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => window.open(imageUrl, "_blank")}
                  aria-label="View full-size violation proof image"
                >
                  <img
                    src={imageUrl}
                    alt="Violation proof"
                    className="w-full h-auto object-cover hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif"%3EImage not available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </button>
              </div>
            ) : (
              <div
                className="w-full h-52 bg-gray-50 border-2 border-dashed flex flex-col items-center justify-center gap-2"
                style={{ borderColor: "#d1d5db", borderRadius: "6px" }}
              >
                <Car className="w-10 h-10" style={{ color: "#d1d5db" }} />
                <p className="text-gray-400 text-sm font-medium">
                  No image available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
