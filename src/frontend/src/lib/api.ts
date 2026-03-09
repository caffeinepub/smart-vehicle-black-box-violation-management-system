interface NodeViolation {
  id?: string;
  _id?: string;
  vehicleNo: string;
  ownerName: string;
  mobile: string;
  violationType: string;
  timestamp: string | number;
  score: number;
  fineAmount?: number;
  imageUrl?: string;
  lat?: number;
  lng?: number;
}

export type { NodeViolation };

export function getViolationId(v: NodeViolation): string {
  return v._id || v.id || "";
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
  // Since the backend only provides violations, we return an empty array
  // This page can be updated in the future when challan endpoint is available
  return [];
}
