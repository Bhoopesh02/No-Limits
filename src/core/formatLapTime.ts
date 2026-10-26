/**
 * Formats milliseconds into standard racing timing notation: "m:ss.mmm"
 * Examples:
 *   formatLapTime(0) -> "0:00.000"
 *   formatLapTime(59999) -> "0:59.999"
 *   formatLapTime(60000) -> "1:00.000"
 *   formatLapTime(605123) -> "10:05.123"
 */
export function formatLapTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0:00.000';
  }
  const totalMillis = Math.floor(ms);
  const minutes = Math.floor(totalMillis / 60000);
  const remainingMillis = totalMillis % 60000;
  const seconds = Math.floor(remainingMillis / 1000);
  const millis = remainingMillis % 1000;

  const paddedSeconds = seconds.toString().padStart(2, '0');
  const paddedMillis = millis.toString().padStart(3, '0');
  return `${minutes}:${paddedSeconds}.${paddedMillis}`;
}
