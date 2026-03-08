export function normalizeImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) {
    return "";
  }

  // If already an absolute URL or starts with /, return as-is
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("/")
  ) {
    return imageUrl;
  }

  // Otherwise, prefix with the production backend uploads path
  return `https://vehicle-blackbox-system.onrender.com/uploads/${imageUrl}`;
}
