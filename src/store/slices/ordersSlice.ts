import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Order, OrderStatus } from '../../types';

interface OrdersState {
  orders: Order[];
  filteredOrders: Order[];
  selectedStatus: OrderStatus | 'ALL';
  isLoading: boolean;
}

const initialState: OrdersState = {
  orders: [],
  filteredOrders: [],
  selectedStatus: 'ALL',
  isLoading: false,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
      ordersSlice.caseReducers.filterOrders(state);
    },
    setSelectedStatus: (state, action: PayloadAction<OrderStatus | 'ALL'>) => {
      state.selectedStatus = action.payload;
      ordersSlice.caseReducers.filterOrders(state);
    },
    filterOrders: (state) => {
      let filtered = state.orders;

      // Filter by status
      if (state.selectedStatus !== 'ALL') {
        filtered = filtered.filter((order) => order.status === state.selectedStatus);
      }

      // Sort by date (newest first)
      filtered = filtered.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      state.filteredOrders = filtered;
    },
    updateOrderInList: (state, action: PayloadAction<Order>) => {
      const index = state.orders.findIndex((order) => order.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
        ordersSlice.caseReducers.filterOrders(state);
      }
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
      ordersSlice.caseReducers.filterOrders(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearFilters: (state) => {
      state.selectedStatus = 'ALL';
      ordersSlice.caseReducers.filterOrders(state);
    },
  },
});

export const {
  setOrders,
  setSelectedStatus,
  filterOrders,
  updateOrderInList,
  addOrder,
  setLoading,
  clearFilters,
} = ordersSlice.actions;

export default ordersSlice.reducer;

