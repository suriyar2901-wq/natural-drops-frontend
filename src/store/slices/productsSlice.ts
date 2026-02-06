import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MenuItem, Category } from '../../types';

interface ProductsState {
  products: MenuItem[];
  filteredProducts: MenuItem[];
  selectedCategory: Category | 'ALL';
  searchQuery: string;
  isLoading: boolean;
}

const initialState: ProductsState = {
  products: [],
  filteredProducts: [],
  selectedCategory: 'ALL',
  searchQuery: '',
  isLoading: false,
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<MenuItem[]>) => {
      state.products = action.payload;
      productsSlice.caseReducers.filterProducts(state);
    },
    setSelectedCategory: (state, action: PayloadAction<Category | 'ALL'>) => {
      state.selectedCategory = action.payload;
      productsSlice.caseReducers.filterProducts(state);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      productsSlice.caseReducers.filterProducts(state);
    },
    filterProducts: (state) => {
      let filtered = state.products;

      // Filter by category
      if (state.selectedCategory !== 'ALL') {
        filtered = filtered.filter((product) => product.category === state.selectedCategory);
      }

      // Filter by search query
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.packSize.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
        );
      }

      // Only show active products (if isActive field exists)
      // Backend doesn't have isActive field, so we show all products
      // filtered = filtered.filter((product) => product.isActive);

      state.filteredProducts = filtered;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearFilters: (state) => {
      state.selectedCategory = 'ALL';
      state.searchQuery = '';
      // Show all products since backend doesn't have isActive field
      state.filteredProducts = state.products;
    },
  },
});

export const {
  setProducts,
  setSelectedCategory,
  setSearchQuery,
  filterProducts,
  setLoading,
  clearFilters,
} = productsSlice.actions;

export default productsSlice.reducer;

