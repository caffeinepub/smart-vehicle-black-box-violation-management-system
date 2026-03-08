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
import { getViolationId, payViolation } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import {
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const API_BASE = "https://vehicle-blackbox-system.onrender.com";

interface ChallanPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: NodeViolation | null;
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

export default function ChallanPreviewModal({
  open,
  onOpenChange,
  violation,
  "data-ocid": _dataOcid,
}: ChallanPreviewModalProps) {
  const [isPaid, setIsPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  if (!violation) return null;

  const imageUrl = normalizeImageUrl(violation.imageUrl);
  const fineAmount = FINE_AMOUNTS[violation.violationType] || 1000;
  const challanNo = `SMVB-${Date.now().toString().slice(-8)}`;

  const handleDownloadChallanFile = () => {
    const fileUrl = `${API_BASE}/challans/${violation.vehicleNo}_challan.pdf`;
    window.open(fileUrl, "_blank");
  };

  const handleDownloadPDF = () => {
    toast.success("Challan PDF downloaded successfully", {
      description: `Challan for ${violation.vehicleNo} has been saved`,
    });
  };

  const handlePayChallan = async () => {
    const id = getViolationId(violation);
    if (!id) {
      toast.error("Payment failed: Violation ID not found");
      return;
    }
    setIsPaying(true);
    try {
      await payViolation(id);
      setIsPaid(true);
      toast.success("Challan Paid Successfully", {
        description: `Challan for ${violation.vehicleNo} has been paid`,
      });
    } catch (err) {
      toast.error("Payment failed", {
        description:
          err instanceof Error ? err.message : "Please try again later",
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
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
              <FileText className="w-7 h-7 text-white" />
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
              <p className="text-xs" style={{ color: "#93c5fd" }}>
                Ministry of Road Transport &amp; Highways
              </p>
            </div>
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
              <span className="font-mono text-white">{challanNo}</span>
            </p>
          </div>
        </div>

        {/* Paid Success Banner */}
        {isPaid && (
          <div
            className="flex items-center gap-3 px-6 py-3"
            style={{
              backgroundColor: "#dcfce7",
              borderBottom: "2px solid #86efac",
            }}
            data-ocid="violations.challan_modal.success_state"
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: "#16a34a" }} />
            <p className="font-bold text-sm" style={{ color: "#166534" }}>
              Challan Paid Successfully
            </p>
          </div>
        )}

        <div className="p-6 space-y-5">
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
                {violation.vehicleNo}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "#9ca3af" }}
              >
                Challan Date
              </p>
              <p className="font-semibold text-gray-800">
                {new Date(violation.timestamp).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
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
                {violation.ownerName || "N/A"}
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
                {violation.mobile || "N/A"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#9ca3af" }}
            >
              Violation Details
            </p>
            <div
              className="border p-4 rounded-lg"
              style={{ backgroundColor: "#f8faff", borderColor: "#bfdbfe" }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-900">
                    {violation.violationType}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(violation.timestamp).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
                <p
                  className="text-xl font-extrabold"
                  style={{ color: "#dc2626" }}
                >
                  ₹{fineAmount}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "#fff7ed",
              border: "1px solid #fdba74",
            }}
          >
            <div className="flex justify-between items-center">
              <p className="font-bold text-gray-900 text-base">
                Total Fine Amount
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: "#dc2626" }}
              >
                ₹{fineAmount}
              </p>
            </div>
            <p className="text-xs text-gray-500 italic mt-1">
              Issuing Authority: Motor Vehicle Dept. – Smart Monitoring Unit
            </p>
          </div>

          {imageUrl && (
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "#9ca3af" }}
              >
                Proof of Violation
              </p>
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto border border-gray-300 rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div
            className="text-xs rounded-lg p-3"
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e3a6e",
            }}
          >
            <p className="font-bold mb-1" style={{ color: "#0B3D91" }}>
              Payment Instructions:
            </p>
            <p>
              Please pay the fine within 60 days to avoid additional penalties.
              Payment can be made online through the Parivahan portal or at any
              authorized RTO office.
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
            variant="outline"
            data-ocid="violations.challan_modal.download_file_button"
            onClick={handleDownloadChallanFile}
            className="gap-2"
            style={{
              borderColor: "#0B3D91",
              color: "#0B3D91",
              borderRadius: "3px",
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Download Challan File
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
          <Button
            data-ocid="violations.challan_modal.pay_button"
            onClick={handlePayChallan}
            disabled={isPaid || isPaying}
            className="gap-2 text-white"
            style={{
              backgroundColor: isPaid ? "#15803d" : "#047857",
              borderRadius: "3px",
              opacity: isPaid ? 0.85 : 1,
            }}
          >
            {isPaying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : isPaid ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Paid
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay Challan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
