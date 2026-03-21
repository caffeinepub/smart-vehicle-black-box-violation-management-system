interface NodeViolation {
  id?: string;
  _id?: string;
  vehicleNo: string;
  ownerName: string;
  mobile: string;
  violationType: string;
  timestamp: string | number;
  dateTime?: string | number;
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
  "Seatbelt Violation": 500,
  "Door Open": 500,
  "Door Open While Driving": 500,
  "Harsh Braking": 500,
  "Harsh Driving": 500,
  Drowsiness: 1000,
  "Drowsy Driving": 1000,
  "Alcohol Violation": 2000,
  "Alcohol Low": 2000,
  "Alcohol High": 2000,
  Collision: 0,
  Accident: 0,
};

export function getViolationFine(v: NodeViolation): number {
  const type = v.violationType?.toLowerCase() || "";
  if (type.includes("accident") || type.includes("collision")) return 0;
  return v.fine ?? v.fineAmount ?? FINE_AMOUNTS[v.violationType] ?? 500;
}

export const API_BASE = "https://vehicle-blackbox-system-1.onrender.com";

/**
 * Normalises a raw object from GET /api/violations into the NodeViolation shape.
 *
 * New API shape (GET /api/violations):
 *   { timestamp, violation_code, filename, path }
 *
 * Legacy shapes also supported:
 *   { vehicle/vehicleNo, type/violationType, score, time/dateTime, evidence/imageUrl }
 */
// biome-ignore lint/suspicious/noExplicitAny: raw API response
function normalizeViolation(raw: any): NodeViolation {
  // image: prefer explicit imageUrl, then build from "path" field (new API), then "evidence" (legacy)
  let imageUrl: string | undefined;
  if (raw.imageUrl) {
    imageUrl = raw.imageUrl;
  } else if (raw.path) {
    // new API returns path like "/uploads/filename.jpg" — prepend base URL
    imageUrl = raw.path.startsWith("http")
      ? raw.path
      : `${API_BASE}${raw.path}`;
  } else if (raw.evidence) {
    imageUrl = raw.evidence;
  }

  return {
    id: raw.id || raw._id,
    _id: raw._id || raw.id,
    // new API has no vehicleNo — use fallback
    vehicleNo: raw.vehicleNo || raw.vehicle || "KL59AB1234",
    ownerName: raw.ownerName || raw.owner || "Mark",
    mobile: raw.mobile || "+91 8520649127",
    // new API uses "violation_code"; legacy uses "type" / "violationType"
    violationType: raw.violationType || raw.violation_code || raw.type || "",
    // new API uses "timestamp"; legacy uses "time" / "dateTime"
    timestamp: raw.timestamp || raw.time || raw.dateTime || "",
    dateTime: raw.dateTime || raw.time || raw.timestamp,
    score: Number(raw.score) || 1,
    fine: raw.fine != null ? Number(raw.fine) : undefined,
    fineAmount: raw.fineAmount != null ? Number(raw.fineAmount) : undefined,
    imageUrl,
    lat: raw.lat != null ? Number(raw.lat) : undefined,
    lng: raw.lng != null ? Number(raw.lng) : undefined,
  };
}

export async function fetchViolations(): Promise<NodeViolation[]> {
  try {
    // Primary endpoint: GET /api/violations
    const response = await fetch(`${API_BASE}/api/violations`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    // biome-ignore lint/suspicious/noExplicitAny: raw API array
    const arr: NodeViolation[] = Array.isArray(data)
      ? data.map((v: any) => normalizeViolation(v))
      : [];

    // Sort newest first so callers can rely on ordering
    arr.sort((a, b) => {
      const ta =
        typeof a.timestamp === "number"
          ? a.timestamp
          : new Date(a.timestamp as string).getTime();
      const tb =
        typeof b.timestamp === "number"
          ? b.timestamp
          : new Date(b.timestamp as string).getTime();
      return tb - ta;
    });

    return arr;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Network error: Unable to connect to the server. The backend may be starting up.",
      );
    }
    throw error;
  }
}

/**
 * Fetches violations with automatic retry on failure.
 * Retries up to `maxAttempts` times with `delayMs` between each attempt.
 * Calls `onRetrying(attempt)` before each retry so the caller can show progress.
 */
export async function fetchViolationsWithRetry(
  maxAttempts = 10,
  delayMs = 3000,
  onRetrying?: (attempt: number) => void,
): Promise<NodeViolation[]> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchViolations();
    } catch {
      if (attempt >= maxAttempts) {
        // All attempts exhausted — return empty so the UI doesn't stay blank
        return [];
      }
      onRetrying?.(attempt);
      await new Promise<void>((res) => setTimeout(res, delayMs));
    }
  }
  return [];
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
