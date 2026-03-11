interface NodeViolation {
  id?: string;
  _id?: string;
  vehicleNo: string;
  ownerName: string;
  mobile: string;
  violationType: string;
  timestamp: string | number;
  score: number;
  fine?: number;
  fineAmount?: number;
  imageUrl?: string;
  lat?: number;
  lng?: number;
}

export type { NodeViolation };

export function getViolationId(v: NodeViolation): string {
  return v._id || v.id || "";
}

/** Returns the fine for a violation, checking backend `fine`, then `fineAmount`, then lookup table */
const FINE_AMOUNTS: Record<string, number> = {
  Overspeeding: 2000,
  "No Helmet": 1000,
  "Red Light Violation": 1000,
  "Wrong Side Driving": 5000,
  "No Seatbelt": 1000,
  "Mobile Usage": 1000,
  "Drunk Driving": 10000,
  Seatbelt: 500,
  "Door Open": 500,
  "Harsh Braking": 1000,
  "Alcohol Low": 3000,
  "Alcohol High": 10000,
  "Drowsy Driving": 5000,
  "Harsh Driving": 2000,
};

export function getViolationFine(v: NodeViolation): number {
  return v.fine ?? v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 1000;
}

const API_BASE = "https://vehicle-blackbox-system-1.onrender.com";

export async function fetchViolations(): Promise<NodeViolation[]> {
  try {
    const response = await fetch(`${API_BASE}/log`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Network error: Unable to connect to the server. The backend may be starting up — please wait a moment and try again.",
      );
    }
    throw error;
  }
}

export async function payViolation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/pay/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Payment failed: HTTP ${response.status}`);
  }
}

// Legacy function for ChallanManagementPage compatibility
export async function fetchChallans() {
  return [];
}
