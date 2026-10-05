import React from 'react';
import { Order } from '../../types';

interface OrderTimerProps {
  order: Order;
  onExpired?: () => void;
  position?: 'top-right' | 'center' | 'header-right';
}

export const OrderTimer: React.FC<OrderTimerProps> = () => null;
