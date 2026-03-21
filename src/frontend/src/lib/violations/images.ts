const API_BASE = "https://vehicle-blackbox-system-1.onrender.com";

export function normalizeImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) {
    return "";
  }

  // Already an absolute URL — return as-is
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // Path starting with / — prepend the backend base URL directly
  // e.g. "/uploads/filename.jpg" → "https://...onrender.com/uploads/filename.jpg"
  if (imageUrl.startsWith("/")) {
    return `${API_BASE}${imageUrl}`;
  }

  // Bare filename — assume it lives under /uploads/
  return `${API_BASE}/uploads/${imageUrl}`;
}
