/**
 * Calculate remaining time for order delivery countdown using epoch timestamps
 * @param startTimestamp Epoch timestamp (seconds) when order was set to "On The Way"
 * @param totalSeconds Total delivery time in seconds
 * @returns Remaining time in seconds, or null if time has expired or invalid
 */
export const calculateRemainingTime = (
  startTimestamp: number | undefined,
  totalSeconds: number | undefined
): number | null => {
  if (!startTimestamp || !totalSeconds) {
    return null;
  }

  try {
    const now = Math.floor(Date.now() / 1000); // Current epoch time in seconds
    const elapsed = now - startTimestamp;
    const remaining = totalSeconds - elapsed;

    if (remaining <= 0) {
      return 0; // Time has expired
    }

    return remaining;
  } catch (error) {
    console.error('Error calculating remaining time:', error);
    return null;
  }
};

/**
 * Format seconds into HH:MM:SS format (always shows hours, minutes, and seconds)
 * @param seconds Remaining seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatCountdown = (seconds: number | null): string => {
  if (seconds === null || seconds < 0) {
    return '00:00:00';
  }

  if (seconds === 0) {
    return '00:00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

