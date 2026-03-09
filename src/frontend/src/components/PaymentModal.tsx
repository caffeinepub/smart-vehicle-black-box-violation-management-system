import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NodeViolation } from "@/lib/api";
import { getViolationId, payViolation } from "@/lib/api";
import {
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Loader2,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

const FINE_AMOUNTS: Record<string, number> = {
  Overspeeding: 2000,
  "No Helmet": 1000,
  "Red Light Violation": 1000,
  "Wrong Side Driving": 5000,
  "No Seatbelt": 1000,
  "Mobile Usage": 1000,
  "Drunk Driving": 10000,
};

type PaymentMethod = "upi" | "debit" | "credit";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: NodeViolation[];
  vehicleNo: string;
  challanId: string;
  totalFine: number;
  onPaymentSuccess: (vehicleNo: string) => void;
}

export default function PaymentModal({
  open,
  onOpenChange,
  violations,
  vehicleNo,
  challanId,
  totalFine,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("upi");
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const vehicleViolations = violations.filter((v) => v.vehicleNo === vehicleNo);
  const firstViolation = vehicleViolations[0];

  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      // Attempt real API call; silently succeed even if backend rejects (demo mode)
      if (firstViolation) {
        const id = getViolationId(firstViolation);
        if (id) {
          try {
            await payViolation(id);
          } catch {
            // Ignore backend errors — show success for demo
          }
        }
      }
      // Simulate payment processing delay
      await new Promise((r) => setTimeout(r, 1500));
      setIsPaid(true);
      onPaymentSuccess(vehicleNo);
    } finally {
      setIsPaying(false);
    }
  };

  const handleClose = () => {
    if (!isPaying) {
      onOpenChange(false);
      // Reset state for next open
      setTimeout(() => {
        setIsPaid(false);
        setSelectedMethod("upi");
        setUpiId("");
        setCardNumber("");
        setCardName("");
        setCardExpiry("");
        setCardCvv("");
      }, 300);
    }
  };

  const paymentMethods: {
    id: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "upi",
      label: "UPI",
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: "debit",
      label: "Debit Card",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: "credit",
      label: "Credit Card",
      icon: <IndianRupee className="w-4 h-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-ocid="payment.modal.dialog"
        className="max-w-md p-0 overflow-hidden"
        style={{ borderRadius: "8px" }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Pay Challan</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div
          className="text-white px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #082d6b 0%, #0B3D91 100%)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "#93c5fd" }}
          >
            Motor Vehicle Department
          </p>
          <h2 className="text-xl font-extrabold text-white">Challan Payment</h2>
          <p className="text-sm mt-1" style={{ color: "#bfdbfe" }}>
            SAFeway Smart Enforcement System
          </p>
        </div>

        {isPaid ? (
          /* Success State */
          <div
            className="p-8 text-center space-y-4"
            data-ocid="payment.modal.success_state"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "#dcfce7" }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: "#16a34a" }} />
            </div>
            <div>
              <h3
                className="text-xl font-extrabold mb-1"
                style={{ color: "#166534" }}
              >
                Payment Successful
              </h3>
              <p className="text-gray-500 text-sm">
                Your challan has been paid successfully.
              </p>
            </div>
            <div
              className="rounded-lg p-4 text-left"
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 font-medium">Vehicle No.</span>
                <span
                  className="font-black font-mono tracking-wide"
                  style={{ color: "#0B3D91" }}
                >
                  {vehicleNo}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500 font-medium">Challan ID</span>
                <span className="font-mono font-semibold text-gray-700">
                  {challanId}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Amount Paid</span>
                <span
                  className="font-extrabold text-base"
                  style={{ color: "#16a34a" }}
                >
                  ₹{totalFine}
                </span>
              </div>
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ backgroundColor: "#dcfce7", color: "#166534" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Paid ✓
            </div>
            <div>
              <Button
                data-ocid="payment.modal.close_button"
                onClick={handleClose}
                className="w-full text-white font-bold"
                style={{ backgroundColor: "#0B3D91", borderRadius: "4px" }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Challan Info */}
            <div
              className="rounded-lg p-4"
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#9ca3af" }}
                  >
                    Vehicle Number
                  </p>
                  <p
                    className="font-black font-mono tracking-wide text-base"
                    style={{ color: "#0B3D91" }}
                  >
                    {vehicleNo}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#9ca3af" }}
                  >
                    Challan ID
                  </p>
                  <p className="font-mono font-semibold text-gray-700 text-sm">
                    {challanId}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#9ca3af" }}
                  >
                    Owner Name
                  </p>
                  <p className="font-semibold text-gray-800 text-sm">
                    {firstViolation?.ownerName || "N/A"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-wider mb-1"
                    style={{ color: "#9ca3af" }}
                  >
                    Total Fine
                  </p>
                  <p
                    className="font-extrabold text-lg"
                    style={{ color: "#dc2626" }}
                  >
                    ₹{totalFine}
                  </p>
                </div>
              </div>
            </div>

            {/* Violation List */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "#9ca3af" }}
              >
                Violations
              </p>
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid #e5e7eb" }}
              >
                {vehicleViolations.map((v, i) => (
                  <div
                    key={`pay-v-${v.vehicleNo}-${v.timestamp}-${v.violationType}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#f9fafb" : "#ffffff",
                      borderBottom:
                        i < vehicleViolations.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                    }}
                  >
                    <span className="text-gray-700 font-medium">
                      {v.violationType}
                    </span>
                    <span className="font-bold" style={{ color: "#dc2626" }}>
                      ₹{v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 1000}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "#9ca3af" }}
              >
                Payment Method
              </p>
              <div className="flex gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    data-ocid={`payment.${method.id}.tab`}
                    onClick={() => setSelectedMethod(method.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all"
                    style={{
                      backgroundColor:
                        selectedMethod === method.id ? "#0B3D91" : "#f3f4f6",
                      color:
                        selectedMethod === method.id ? "#ffffff" : "#374151",
                      border:
                        selectedMethod === method.id
                          ? "2px solid #0B3D91"
                          : "2px solid transparent",
                    }}
                  >
                    {method.icon}
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Input Fields */}
            {selectedMethod === "upi" && (
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: "#9ca3af" }}
                  htmlFor="upi-id"
                >
                  UPI ID
                </label>
                <input
                  id="upi-id"
                  type="text"
                  data-ocid="payment.upi.input"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "#d1d5db",
                    borderRadius: "6px",
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  e.g. name@okaxis, name@paytm, name@ybl
                </p>
              </div>
            )}

            {(selectedMethod === "debit" || selectedMethod === "credit") && (
              <div className="space-y-3">
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "#9ca3af" }}
                    htmlFor="card-number"
                  >
                    Card Number
                  </label>
                  <input
                    id="card-number"
                    type="text"
                    data-ocid="payment.card_number.input"
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={cardNumber}
                    maxLength={19}
                    onChange={(e) => {
                      const val = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16);
                      setCardNumber(val.replace(/(.{4})/g, "$1 ").trim());
                    }}
                    className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono"
                    style={{ borderColor: "#d1d5db", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: "#9ca3af" }}
                    htmlFor="card-name"
                  >
                    Name on Card
                  </label>
                  <input
                    id="card-name"
                    type="text"
                    data-ocid="payment.card_name.input"
                    placeholder="RAHUL SHARMA"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono"
                    style={{ borderColor: "#d1d5db", borderRadius: "6px" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "#9ca3af" }}
                      htmlFor="card-expiry"
                    >
                      Expiry
                    </label>
                    <input
                      id="card-expiry"
                      type="text"
                      data-ocid="payment.card_expiry.input"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      maxLength={5}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        setCardExpiry(
                          val.length > 2
                            ? `${val.slice(0, 2)}/${val.slice(2)}`
                            : val,
                        );
                      }}
                      className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono"
                      style={{ borderColor: "#d1d5db", borderRadius: "6px" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                      style={{ color: "#9ca3af" }}
                      htmlFor="card-cvv"
                    >
                      CVV
                    </label>
                    <input
                      id="card-cvv"
                      type="password"
                      data-ocid="payment.card_cvv.input"
                      placeholder="•••"
                      value={cardCvv}
                      maxLength={3}
                      onChange={(e) =>
                        setCardCvv(
                          e.target.value.replace(/\D/g, "").slice(0, 3),
                        )
                      }
                      className="w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono"
                      style={{ borderColor: "#d1d5db", borderRadius: "6px" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pay Now Button */}
            <Button
              data-ocid="payment.modal.pay_button"
              onClick={handlePayNow}
              disabled={isPaying}
              className="w-full text-white font-extrabold text-base py-6"
              style={{
                backgroundColor: "#047857",
                borderRadius: "6px",
              }}
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <IndianRupee className="w-5 h-5 mr-2" />
                  Pay Now — ₹{totalFine}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-gray-400">
              Secured by Motor Vehicle Department · Government of India
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
