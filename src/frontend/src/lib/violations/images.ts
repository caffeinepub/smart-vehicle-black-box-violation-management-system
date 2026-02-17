export function normalizeImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) {
    return '';
  }
  
  // If already an absolute URL or starts with /, return as-is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('/')) {
    return imageUrl;
  }
  
  // Otherwise, prefix with localhost uploads path
  return `http://localhost:3000/uploads/${imageUrl}`;
}
