/**
 * Normalizes product image URLs for frontend display.
 * Images are served from public/picture/ directory.
 * 
 * Rules:
 * - If primaryImageUrl is null/undefined → return null
 * - If it already starts with /picture/ → use as-is
 * - If it's just a filename (e.g., "Tea.jpg") → convert to /picture/Tea.jpg
 * - If it starts with "/" but not "/picture/" → convert to /picture/<filename>
 */
export function normalizeProductImageUrl(primaryImageUrl: string | null | undefined): string | null {
  if (!primaryImageUrl) {
    return null;
  }

  // If already in correct format, use as-is
  if (primaryImageUrl.startsWith("/picture/")) {
    return primaryImageUrl;
  }

  // If it's just a filename (no path separators), prepend /picture/
  if (!primaryImageUrl.includes("/")) {
    return `/picture/${primaryImageUrl}`;
  }

  // If it starts with "/" but not "/picture/", extract filename and prepend /picture/
  if (primaryImageUrl.startsWith("/")) {
    const filename = primaryImageUrl.split("/").pop() || primaryImageUrl;
    return `/picture/${filename}`;
  }

  // For any other case, assume it's a filename and prepend /picture/
  return `/picture/${primaryImageUrl}`;
}
