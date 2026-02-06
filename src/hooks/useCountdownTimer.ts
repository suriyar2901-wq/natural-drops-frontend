import { useState, useEffect, useRef } from 'react';

interface UseCountdownTimerProps {
  startTimestamp?: number; // Epoch timestamp in seconds
  totalSeconds?: number; // Total duration in seconds
  onComplete?: () => void; // Callback when timer reaches 0
  enabled?: boolean; // Whether timer is enabled
}

interface UseCountdownTimerReturn {
  remainingSeconds: number | null;
  formattedTime: string;
  isExpired: boolean;
}

/**
 * Reusable hook for countdown timer that calculates remaining time
 * based on backend epoch timestamps
 */
export const useCountdownTimer = ({
  startTimestamp,
  totalSeconds,
  onComplete,
  enabled = true,
}: UseCountdownTimerProps): UseCountdownTimerReturn => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const hasCalledOnCompleteRef = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || !startTimestamp || !totalSeconds) {
      setRemainingSeconds(null);
      hasCalledOnCompleteRef.current = false;
      return;
    }

    const calculateRemaining = () => {
      const now = Math.floor(Date.now() / 1000); // Current epoch time in seconds
      const elapsed = now - startTimestamp;
      const remaining = totalSeconds - elapsed;

      if (remaining <= 0) {
        setRemainingSeconds(0);
        // Call onComplete only once when timer expires
        if (!hasCalledOnCompleteRef.current && onCompleteRef.current) {
          hasCalledOnCompleteRef.current = true;
          onCompleteRef.current();
        }
        return 0;
      }

      setRemainingSeconds(remaining);
      hasCalledOnCompleteRef.current = false;
      return remaining;
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(() => {
      calculateRemaining();
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimestamp, totalSeconds, enabled]);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) {
      return '--:--:--';
    }

    if (seconds === 0) {
      return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    remainingSeconds,
    formattedTime: formatTime(remainingSeconds),
    isExpired: remainingSeconds !== null && remainingSeconds <= 0,
  };
};

