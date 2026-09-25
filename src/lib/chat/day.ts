// Africa/Douala is UTC+1 with no daylight saving, so the day line is a
// fixed offset. Returns the UTC instant of local midnight.
export function doualaDayStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + 60 * 60 * 1000);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(midnightUtc - 60 * 60 * 1000);
}
