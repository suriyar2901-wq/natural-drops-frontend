import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { useCountdownTimer } from '../../hooks/useCountdownTimer';
import { Order } from '../../types';

interface OrderTimerProps {
  order: Order;
  onExpired?: () => void;
  position?: 'top-right' | 'center' | 'header-right';
}

export const OrderTimer: React.FC<OrderTimerProps> = ({
  order,
  onExpired,
  position = 'top-right',
}) => {
  // Use epoch timestamps if available, otherwise fall back to legacy fields
  const startTimestamp = order.deliveryStartTimestamp;
  const totalSeconds = order.deliveryTotalSeconds;
  
  // Fallback to legacy fields if new fields not available
  const effectiveStartTimestamp = startTimestamp || 
    (order.startTime ? Math.floor(new Date(order.startTime).getTime() / 1000) : undefined);
  const effectiveTotalSeconds = totalSeconds || 
    (order.deliveryTime ? order.deliveryTime * 60 : undefined);

  const { formattedTime, isExpired } = useCountdownTimer({
    startTimestamp: effectiveStartTimestamp,
    totalSeconds: effectiveTotalSeconds,
    onComplete: onExpired,
    enabled: !!effectiveStartTimestamp && !!effectiveTotalSeconds,
  });

  // Only show timer if we have valid data and order is in processing status
  const normalizedStatus = String(order.status || '').toLowerCase();
  const isProcessing = normalizedStatus === 'processing';
  
  if (!isProcessing || !effectiveStartTimestamp || !effectiveTotalSeconds) {
    return null;
  }

  const containerStyle =
    position === 'top-right'
      ? styles.timerContainerTopRight
      : position === 'header-right'
        ? styles.timerContainerHeaderRight
        : styles.timerContainerCenter;

  return (
    <View style={containerStyle}>
      <Text style={styles.timerText}>{formattedTime}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainerTopRight: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    minWidth: 80,
    alignItems: 'center',
    zIndex: 10,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
  timerContainerHeaderRight: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    minWidth: 86,
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
  },
  timerContainerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    padding: spacing.md,
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
  },
  timerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
});

