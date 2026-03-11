import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NodeViolation } from "@/lib/api";
import { getViolationFine, getViolationId, payViolation } from "@/lib/api";
import {
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Loader2,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useState } from "react";

type PaymentMethod = "upi" | "credit" | "netbanking";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: NodeViolation[];
  vehicleNo: string;
  challanId: string;
  totalFine: number;
  onPaymentSuccess: (vehicleNo: string) => void;
}

const DEFAULT_OWNER = "Mark";

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
  const [bankSelected, setBankSelected] = useState("");

  const vehicleViolations = violations.filter((v) => v.vehicleNo === vehicleNo);
  const firstViolation = vehicleViolations[0];
  const ownerName = firstViolation?.ownerName || DEFAULT_OWNER;

  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      if (firstViolation) {
        const id = getViolationId(firstViolation);
        if (id) {
          try {
            await payViolation(id);
          } catch {
            /* demo mode */
          }
        }
      }
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
      setTimeout(() => {
        setIsPaid(false);
        setSelectedMethod("upi");
        setUpiId("");
        setCardNumber("");
        setCardName("");
        setCardExpiry("");
        setCardCvv("");
        setBankSelected("");
      }, 300);
    }
  };

  const paymentMethods: {
    id: PaymentMethod;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "upi", label: "UPI", icon: <Smartphone className="w-4 h-4" /> },
    {
      id: "credit",
      label: "Credit Card",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: "netbanking",
      label: "Net Banking",
      icon: <Wifi className="w-4 h-4" />,
    },
  ];

  const LIGHT_INPUT = {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    color: "#1f2937",
    fontSize: "14px",
    padding: "10px 14px",
    width: "100%",
    outline: "none",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-ocid="payment.modal.dialog"
        className="max-w-md p-0 overflow-hidden"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Pay Challan</DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div
          className="text-white px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            borderBottom: "3px solid #1e40af",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            Kerala Motor Vehicle Department
          </p>
          <h2 className="text-xl font-extrabold text-white">
            Challan Payment Portal
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            SAFEWAY – Smart Blackbox Enforcement
          </p>
        </div>

        {isPaid ? (
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
                style={{ color: "#16a34a" }}
              >
                Payment Successful
              </h3>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                Your challan has been paid successfully.
              </p>
            </div>
            <div
              className="rounded-lg p-4 text-left"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#6b7280" }} className="font-medium">
                  Vehicle No.
                </span>
                <span
                  className="font-black font-mono tracking-wide"
                  style={{ color: "#2563eb" }}
                >
                  {vehicleNo}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#6b7280" }} className="font-medium">
                  Owner
                </span>
                <span className="font-semibold" style={{ color: "#1f2937" }}>
                  {ownerName}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#6b7280" }} className="font-medium">
                  Challan ID
                </span>
                <span
                  className="font-mono text-xs"
                  style={{ color: "#374151" }}
                >
                  {challanId}
                </span>
              </div>
              <div
                className="flex justify-between text-sm pt-2 mt-2 border-t"
                style={{ borderColor: "#e2e8f0" }}
              >
                <span className="font-bold" style={{ color: "#1f2937" }}>
                  Amount Paid
                </span>
                <span
                  className="font-black text-lg"
                  style={{ color: "#16a34a" }}
                >
                  ₹{totalFine.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <Button
              data-ocid="payment.modal.close_button"
              onClick={handleClose}
              className="w-full font-bold"
              style={{
                backgroundColor: "#16a34a",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Amount summary */}
            <div
              className="flex items-center justify-between p-4 rounded-lg"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  Total Fine Amount
                </p>
                <p className="text-3xl font-black" style={{ color: "#dc2626" }}>
                  ₹{totalFine.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  Vehicle
                </p>
                <p className="font-bold font-mono" style={{ color: "#2563eb" }}>
                  {vehicleNo}
                </p>
                <p className="text-xs" style={{ color: "#6b7280" }}>
                  Owner: {ownerName}
                </p>
              </div>
            </div>

            {/* Payment method selector */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "#6b7280" }}
              >
                Select Payment Method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    data-ocid={`payment.${method.id}.toggle`}
                    onClick={() => setSelectedMethod(method.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all"
                    style={{
                      backgroundColor:
                        selectedMethod === method.id ? "#eff6ff" : "#f8fafc",
                      border:
                        selectedMethod === method.id
                          ? "2px solid #2563eb"
                          : "2px solid #e2e8f0",
                      color:
                        selectedMethod === method.id ? "#2563eb" : "#6b7280",
                    }}
                  >
                    {method.icon}
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* UPI form */}
            {selectedMethod === "upi" && (
              <div>
                <label
                  htmlFor="upi-id"
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: "#6b7280" }}
                >
                  UPI ID
                </label>
                <input
                  id="upi-id"
                  data-ocid="payment.upi.input"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  style={LIGHT_INPUT}
                />
              </div>
            )}

            {/* Credit Card form */}
            {selectedMethod === "credit" && (
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="card-number"
                    className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: "#6b7280" }}
                  >
                    Card Number
                  </label>
                  <input
                    id="card-number"
                    data-ocid="payment.card_number.input"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    style={LIGHT_INPUT}
                  />
                </div>
                <div>
                  <label
                    htmlFor="card-name"
                    className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                    style={{ color: "#6b7280" }}
                  >
                    Name on Card
                  </label>
                  <input
                    id="card-name"
                    data-ocid="payment.card_name.input"
                    type="text"
                    placeholder="Full name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    style={LIGHT_INPUT}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="card-expiry"
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "#6b7280" }}
                    >
                      Expiry
                    </label>
                    <input
                      id="card-expiry"
                      data-ocid="payment.card_expiry.input"
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      style={LIGHT_INPUT}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="card-cvv"
                      className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                      style={{ color: "#6b7280" }}
                    >
                      CVV
                    </label>
                    <input
                      id="card-cvv"
                      data-ocid="payment.card_cvv.input"
                      type="password"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      style={LIGHT_INPUT}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Net Banking */}
            {selectedMethod === "netbanking" && (
              <div>
                <label
                  htmlFor="bank-select"
                  className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: "#6b7280" }}
                >
                  Select Bank
                </label>
                <select
                  id="bank-select"
                  data-ocid="payment.bank.select"
                  value={bankSelected}
                  onChange={(e) => setBankSelected(e.target.value)}
                  style={{ ...LIGHT_INPUT, cursor: "pointer" }}
                >
                  <option value="">-- Choose your bank --</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                  <option value="bob">Bank of Baroda</option>
                </select>
              </div>
            )}

            {/* Violation list */}
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "#6b7280" }}
              >
                Violation Summary
              </p>
              <div className="space-y-1">
                {vehicleViolations.map((v, i) => (
                  <div
                    key={`${v.violationType}-${i}`}
                    className="flex justify-between text-xs"
                  >
                    <span style={{ color: "#374151" }}>{v.violationType}</span>
                    <span className="font-bold" style={{ color: "#dc2626" }}>
                      ₹{getViolationFine(v).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <Button
              data-ocid="payment.modal.submit_button"
              onClick={handlePayNow}
              disabled={isPaying}
              className="w-full font-bold text-base h-12"
              style={{
                backgroundColor: "#2563eb",
                color: "#fff",
                borderRadius: "4px",
              }}
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="w-5 h-5 mr-2" />
                  Pay ₹{totalFine.toLocaleString("en-IN")} Now
                </>
              )}
            </Button>

            <button
              type="button"
              data-ocid="payment.modal.cancel_button"
              onClick={handleClose}
              disabled={isPaying}
              className="w-full text-sm font-medium py-2"
              style={{ color: "#6b7280" }}
            >
              Cancel
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
