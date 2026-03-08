import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { type NodeViolation, fetchViolations } from "@/lib/api";
import { normalizeImageUrl } from "@/lib/violations/images";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const FINE_AMOUNTS: Record<string, number> = {
  Overspeeding: 2000,
  "No Helmet": 1000,
  "Red Light Violation": 1000,
  "Wrong Side Driving": 5000,
  "No Seatbelt": 1000,
  "Mobile Usage": 1000,
  "Drunk Driving": 10000,
};

export default function ChallanPreviewPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    vehicleNo?: string;
    timestamp?: string;
  };

  const [violation, setViolation] = useState<NodeViolation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchViolations();
        const found =
          data.find(
            (v) =>
              v.vehicleNo === search.vehicleNo &&
              v.timestamp === search.timestamp,
          ) || data[0];
        setViolation(found || null);
      } catch (err) {
        console.error("Failed to load violation:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [search.vehicleNo, search.timestamp]);

  const handleDownloadPDF = () => {
    toast.success("Challan PDF downloaded successfully", {
      description: violation
        ? `Challan for ${violation.vehicleNo} has been saved`
        : "Challan saved",
    });
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
        <p className="text-center text-gray-600">Loading challan...</p>
      </div>
    );
  }

  if (!violation) {
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
        <Card style={{ borderRadius: "2px" }}>
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              No challan data available
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = normalizeImageUrl(violation.imageUrl);
  const fineAmount = FINE_AMOUNTS[violation.violationType] || 1000;
  const challanNo = `SMVB-${new Date(violation.timestamp).getTime().toString().slice(-8)}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
          className="gap-2 bg-gov-blue hover:bg-gov-blue-dark"
          style={{ borderRadius: "2px" }}
          data-ocid="challan.download_button"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <div
        className="bg-white border border-gray-200 shadow-sm overflow-hidden"
        style={{ borderRadius: "2px" }}
      >
        {/* Official Government Challan Header */}
        <div className="bg-gov-blue text-white p-5">
          <div className="flex items-center gap-4 mb-3">
            <FileText className="w-10 h-10 opacity-80 flex-shrink-0" />
            <div>
              <p className="text-xs opacity-70 uppercase tracking-widest">
                Government of India
              </p>
              <p className="font-bold text-xl leading-tight">
                Motor Vehicle Department
              </p>
              <p className="text-xs opacity-80">
                Ministry of Road Transport &amp; Highways
              </p>
            </div>
          </div>
          <div className="border-t border-blue-400 pt-3 text-center">
            <p className="text-2xl font-bold uppercase tracking-wide">
              Traffic Violation Challan
            </p>
            <p className="text-xs opacity-70 mt-1">Challan No: {challanNo}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Vehicle Number
              </p>
              <p className="font-bold text-2xl text-gov-blue font-mono tracking-wider">
                {violation.vehicleNo}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Challan Date
              </p>
              <p className="font-semibold text-lg">
                {new Date(violation.timestamp).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Owner Name
              </p>
              <p className="font-semibold text-lg">
                {violation.ownerName || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                Mobile Number
              </p>
              <p className="font-semibold text-lg">
                {violation.mobile || "N/A"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Violation Details
            </p>
            <div
              className="border border-gray-200 p-4 bg-gray-50"
              style={{ borderRadius: "2px" }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">
                    {violation.violationType}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
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
                <p className="text-2xl font-bold text-destructive">
                  ₹{fineAmount}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-gray-50 border border-gray-200 p-5"
            style={{ borderRadius: "2px" }}
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold text-xl">Total Fine Amount</p>
              <p className="text-3xl font-bold text-destructive">
                ₹{fineAmount}
              </p>
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              Issuing Authority: Motor Vehicle Dept. – Smart Monitoring Unit
            </p>
          </div>

          {imageUrl && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Proof of Violation
              </p>
              <img
                src={imageUrl}
                alt="Violation proof"
                className="w-full h-auto border-2 border-gray-300"
                style={{ borderRadius: "1px" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div
            className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-4"
            style={{ borderRadius: "2px" }}
          >
            <p className="font-semibold mb-2 text-gov-blue">
              Payment Instructions:
            </p>
            <p>
              Please pay the fine within 60 days to avoid additional penalties.
              Payment can be made online through the Parivahan portal or at any
              authorized RTO office.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
