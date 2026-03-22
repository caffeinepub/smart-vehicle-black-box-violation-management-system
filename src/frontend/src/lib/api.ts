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
  // imagePath alias kept for API-contract compatibility (id, vehicleId, type, score, timestamp, imagePath)
  imagePath?: string;
  lat?: number;
  lng?: number;
  category?: string; // "VIOLATION" | "EVENT"
  image?: string; // raw image path from backend
}

export type { NodeViolation };

export function getViolationId(v: NodeViolation): string {
  return v._id || v.id || "";
}

/** Returns the fine for a violation, checking backend `fine`, then `fineAmount`, then lookup table */
const FINE_AMOUNTS: Record<string, number> = {
  Overspeeding: 2000,
  Overspeed: 2000,
  OVERSPEED: 2000,
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

export async function resetSession(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/reset`, { method: "POST" });
  } catch {
    // ignore errors - fresh session best-effort
  }
}

/**
 * Normalises a raw object from GET /api/violations into the NodeViolation shape.
 *
 * New API shape (GET /api/violations):
 *   { timestamp, violation_code, filename, path }
 *
 * Legacy shapes also supported:
 *   { vehicle/vehicleNo, type/violationType, score, time/dateTime, evidence/imageUrl }
 *
 * Internal contract shape also normalised:
 *   { id, vehicleId, type, score, timestamp, imagePath }
 */
export function normalizeViolation(raw: any): NodeViolation {
  // ── image URL ──────────────────────────────────────────────────────────────
  // Priority: explicit imageUrl → path (new API) → imagePath (contract shape) → evidence (legacy)
  let imageUrl: string | undefined;
  if (raw.imageUrl) {
    imageUrl = raw.imageUrl;
  } else if (raw.path) {
    // new API returns path like "/uploads/filename.jpg" — prepend base URL
    imageUrl = raw.path.startsWith("http")
      ? raw.path
      : `${API_BASE}${raw.path}`;
  } else if (raw.imagePath) {
    // internal contract shape
    imageUrl = raw.imagePath.startsWith("http")
      ? raw.imagePath
      : `${API_BASE}${raw.imagePath}`;
  } else if (raw.evidence) {
    imageUrl = raw.evidence;
  } else if (raw.image) {
    imageUrl = raw.image.startsWith("http")
      ? raw.image
      : `${API_BASE}${raw.image}`;
  }

  // ── id ─────────────────────────────────────────────────────────────────────
  // Generate a deterministic id when the backend doesn't provide one so
  // React keys and deduplication logic remain stable.
  const rawId =
    raw.id ||
    raw._id ||
    (raw.timestamp
      ? `${raw.timestamp}-${(raw.violation_code || raw.violationType || raw.type || "").replace(/\s+/g, "-")}`
      : undefined);

  // ── vehicleNo ──────────────────────────────────────────────────────────────
  // new API has no vehicleNo; support vehicleId (contract shape) as well
  const vehicleNo =
    raw.vehicleNo || raw.vehicle || raw.vehicleId || "KL59AB1234";

  // ── violation type ─────────────────────────────────────────────────────────
  // new API uses "violation_code"; contract shape uses "type"; legacy uses "violationType"
  const violationType =
    raw.violationType || raw.violation_code || raw.type || "";
  // Warn on OVERSPEED violations
  if (
    violationType === "OVERSPEED" ||
    violationType.toLowerCase() === "overspeed"
  ) {
    console.warn("⚠️ Overspeed detected!");
  }

  // ── timestamp ──────────────────────────────────────────────────────────────
  const timestamp = raw.timestamp || raw.time || raw.dateTime || "";

  return {
    id: rawId,
    _id: raw._id || raw.id,
    vehicleNo,
    ownerName: raw.ownerName || raw.owner || "Mark",
    mobile: raw.mobile || "+91 8520649127",
    violationType,
    timestamp,
    dateTime: raw.dateTime || raw.time || raw.timestamp,
    score: Number(raw.score) || 1,
    fine: raw.fine != null ? Number(raw.fine) : undefined,
    fineAmount: raw.fineAmount != null ? Number(raw.fineAmount) : undefined,
    imageUrl,
    // keep imagePath populated for callers that check the contract shape directly
    imagePath: imageUrl,
    lat: raw.lat != null ? Number(raw.lat) : undefined,
    lng: raw.lng != null ? Number(raw.lng) : undefined,
    category: raw.category,
    image: raw.image || raw.path || raw.imageUrl || raw.evidence || undefined,
  };
}

export async function fetchViolations(): Promise<NodeViolation[]> {
  try {
    // Primary endpoint: GET /api/violations
    const response = await fetch(`${API_BASE}/api/violations?t=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
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

/**
 * Fetches the cumulative violation score for a specific vehicle.
 * Endpoint: GET /api/score/:vehicleId
 * Returns the numeric score, or falls back to -1 on error so callers can
 * detect failure without crashing.
 */
export async function fetchVehicleScore(vehicleId: string): Promise<number> {
  try {
    const response = await fetch(
      `${API_BASE}/api/score/${encodeURIComponent(vehicleId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return -1;
    const data = await response.json();
    // Backend returns: { "score": number }
    const score = Number(data?.score);
    return Number.isNaN(score) ? -1 : score;
  } catch {
    // Network failure or backend asleep — return -1 so UI falls back to local sum
    return -1;
  }
}

/**
 * Fetch current score from GET /api/score (no vehicleId).
 * Returns the numeric score, or -1 on error.
 */
export async function fetchScore(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/api/score`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return -1;
    const data = await response.json();
    const score = Number(data?.score);
    return Number.isNaN(score) ? -1 : score;
  } catch {
    return -1;
  }
}

/**
 * Uploads a violation with an optional evidence image.
 * Endpoint: POST /upload
 * Form fields: image (File), vehicleId (string), violationType (string)
 */

export interface UploadChallan {
  vehicleNo?: string;
  totalScore?: number;
  violations?: NodeViolation[];
  imageUrl?: string;
  fine?: number;
  [key: string]: any;
}

export interface UploadResponse {
  record: NodeViolation | null;
  score: number;
  challan: UploadChallan | null;
}

export async function uploadViolation(
  vehicleId: string,
  violationType: string,
  image?: File,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("vehicleId", vehicleId);
  formData.append("violationType", violationType);
  if (image) {
    formData.append("image", image);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
    // Do NOT set Content-Type header — browser sets it automatically with
    // the correct multipart boundary when using FormData.
  });

  if (!response.ok) {
    throw new Error(
      `Upload failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return {
    record: data.record ? normalizeViolation(data.record) : null,
    score: Number(data.score) || 0,
    challan: data.challan ?? null,
  };
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
export async function fetchChallans(): Promise<any[]> {
  return fetchChallansFromBackend();
}

export async function fetchStats(): Promise<{
  totalViolations?: number;
  totalScore?: number;
  accidentAlerts?: number;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchEvents(): Promise<NodeViolation[]> {
  try {
    const response = await fetch(`${API_BASE}/api/events`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeViolation) : [];
  } catch {
    return [];
  }
}

export async function fetchAccidents(): Promise<NodeViolation[]> {
  try {
    const response = await fetch(`${API_BASE}/api/accidents`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeViolation) : [];
  } catch {
    return [];
  }
}

export async function fetchChallansFromBackend(): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE}/api/challans`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
