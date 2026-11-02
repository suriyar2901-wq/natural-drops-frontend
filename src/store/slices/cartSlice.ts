import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, MenuItem } from '../../types';

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  taxRate: number; // Tax rate as percentage (e.g., 5 for 5%)
  taxEnabled: boolean;
  deliveryCharge: number;
  platformFee: number;
  platformFeeEnabled: boolean;
  total: number;
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  tax: 0,
  taxRate: 0,
  taxEnabled: false,
  deliveryCharge: 0,
  platformFee: 0,
  platformFeeEnabled: false,
  total: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ menuItem: MenuItem; quantity?: number }>) => {
      const { menuItem, quantity = 1 } = action.payload;
      const existingItem = state.items.find((item) => item.menuItem.id === menuItem.id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ menuItem, quantity });
      }

      cartSlice.caseReducers.calculateTotals(state);
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.menuItem.id !== action.payload);
      cartSlice.caseReducers.calculateTotals(state);
    },
    updateQuantity: (state, action: PayloadAction<{ menuItemId: number; quantity: number }>) => {
      const { menuItemId, quantity } = action.payload;
      const item = state.items.find((item) => item.menuItem.id === menuItemId);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.menuItem.id !== menuItemId);
        } else {
          item.quantity = quantity;
        }
      }

      cartSlice.caseReducers.calculateTotals(state);
    },
    replaceCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalItems = 0;
      state.subtotal = 0;
      state.tax = 0;
      state.deliveryCharge = 0;
      state.platformFee = 0;
      state.total = 0;
      // Keep fee settings (taxRate / enabled flags) so next add still uses admin/seller config
    },
    setDeliveryCharge: (state, action: PayloadAction<number>) => {
      state.deliveryCharge = Math.max(0, Number(action.payload) || 0);
      cartSlice.caseReducers.calculateTotals(state);
    },
    setTaxRate: (state, action: PayloadAction<number>) => {
      state.taxRate = Math.max(0, Number(action.payload) || 0);
      cartSlice.caseReducers.calculateTotals(state);
    },
    setTaxEnabled: (state, action: PayloadAction<boolean>) => {
      state.taxEnabled = !!action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    setPlatformFee: (state, action: PayloadAction<number>) => {
      state.platformFee = Math.max(0, Number(action.payload) || 0);
      cartSlice.caseReducers.calculateTotals(state);
    },
    setPlatformFeeEnabled: (state, action: PayloadAction<boolean>) => {
      state.platformFeeEnabled = !!action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    applyFeeSettings: (
      state,
      action: PayloadAction<{
        taxEnabled?: boolean;
        taxRate?: number;
        platformFeeEnabled?: boolean;
        platformFee?: number;
        deliveryCharge?: number;
      }>
    ) => {
      const next = action.payload;
      if (typeof next.taxEnabled === 'boolean') state.taxEnabled = next.taxEnabled;
      if (typeof next.taxRate === 'number') state.taxRate = Math.max(0, next.taxRate);
      if (typeof next.platformFeeEnabled === 'boolean') state.platformFeeEnabled = next.platformFeeEnabled;
      if (typeof next.platformFee === 'number') state.platformFee = Math.max(0, next.platformFee);
      if (typeof next.deliveryCharge === 'number') state.deliveryCharge = Math.max(0, next.deliveryCharge);
      cartSlice.caseReducers.calculateTotals(state);
    },
    calculateTotals: (state) => {
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
      state.subtotal = state.items.reduce(
        (total, item) => total + (item.menuItem.rate || 0) * item.quantity,
        0
      );

      state.tax = state.taxEnabled ? (state.subtotal * state.taxRate) / 100 : 0;
      const fee = state.platformFeeEnabled ? state.platformFee : 0;
      state.total = state.subtotal + state.tax + state.deliveryCharge + fee;

      if (!isFinite(state.total) || isNaN(state.total)) {
        state.total = 0;
      }
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  replaceCart,
  setDeliveryCharge,
  setTaxRate,
  setTaxEnabled,
  setPlatformFee,
  setPlatformFeeEnabled,
  applyFeeSettings,
  calculateTotals,
} = cartSlice.actions;

export default cartSlice.reducer;
