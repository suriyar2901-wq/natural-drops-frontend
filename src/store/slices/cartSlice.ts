import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, MenuItem } from '../../types';

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  taxRate: number; // Tax rate as percentage (e.g., 5 for 5%)
  deliveryCharge: number;
  total: number;
}

const initialState: CartState = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  tax: 0,
  taxRate: 5, // Default tax rate 5%
  deliveryCharge: 20, // Default delivery charge ₹20
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

      // Initialize delivery charge if not set
      if (state.deliveryCharge === 0) {
        state.deliveryCharge = 20;
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
      state.taxRate = 5; // Reset to default tax rate
      state.deliveryCharge = 20; // Reset to default delivery charge
      state.total = 0;
    },
    setDeliveryCharge: (state, action: PayloadAction<number>) => {
      state.deliveryCharge = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    setTaxRate: (state, action: PayloadAction<number>) => {
      // Tax rate is percentage (e.g., 5 for 5%)
      state.taxRate = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
    },
    calculateTotals: (state) => {
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0);
      state.subtotal = state.items.reduce(
        (total, item) => total + (item.menuItem.rate || 0) * item.quantity,
        0
      );
      
      // Ensure taxRate is set (default 5%)
      if (!state.taxRate || state.taxRate === 0) {
        state.taxRate = 5;
      }
      
      // Ensure deliveryCharge is set (default ₹20)
      if (!state.deliveryCharge || state.deliveryCharge === 0) {
        state.deliveryCharge = 20;
      }
      
      state.tax = (state.subtotal * state.taxRate) / 100;
      state.total = state.subtotal + state.tax + state.deliveryCharge;
      
      // Ensure total is always a valid number (not NaN or Infinity)
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
  calculateTotals,
} = cartSlice.actions;

export default cartSlice.reducer;

