export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Gives every game stable generated cover art, because the catalog has no images. */
export function gameArt(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  const second = (hash + 55) % 360;
  return `radial-gradient(circle at 78% 18%, hsl(${hash} 85% 58% / 0.85), transparent 58%), linear-gradient(140deg, hsl(${second} 60% 24%), hsl(${hash} 45% 11%))`;
}

export function initials(name: string) {
  const words = name.split(/[\s:]+/).filter((word) => /^[A-Z0-9]/.test(word));
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("");
}

export function matchesSearch(query: string, ...fields: string[]) {
  const needle = query.trim().toLowerCase();
  return (
    !needle || fields.some((field) => field.toLowerCase().includes(needle))
  );
}

/** Newest active release, because `releases` isn't guaranteed to be sorted. */
export function latestActive<T extends { status: string; publishedAt: string }>(
  releases: T[],
) {
  return releases
    .filter((release) => release.status === "active")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
}
