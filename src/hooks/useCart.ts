import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  addToCart as addToCartAction,
  removeFromCart as removeFromCartAction,
  updateQuantity as updateQuantityAction,
  clearCart as clearCartAction,
  setDeliveryCharge,
  setTaxRate,
} from '../store/slices/cartSlice';
import { MenuItem, CartItem } from '../types';
import { storageService } from '../services/storage.service';
import { useEffect } from 'react';

export const useCart = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector((state: RootState) => state.cart);

  // Sync cart to storage whenever it changes
  useEffect(() => {
    storageService.setCartData(cart.items);
  }, [cart.items]);

  const addToCart = (menuItem: MenuItem, quantity: number = 1) => {
    dispatch(addToCartAction({ menuItem, quantity }));
  };

  const removeFromCart = (menuItemId: number) => {
    dispatch(removeFromCartAction(menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    dispatch(updateQuantityAction({ menuItemId, quantity }));
  };

  const incrementQuantity = (menuItemId: number) => {
    const item = cart.items.find((item) => item.menuItem.id === menuItemId);
    if (item) {
      dispatch(updateQuantityAction({ menuItemId, quantity: item.quantity + 1 }));
    }
  };

  const decrementQuantity = (menuItemId: number) => {
    const item = cart.items.find((item) => item.menuItem.id === menuItemId);
    if (item && item.quantity > 1) {
      dispatch(updateQuantityAction({ menuItemId, quantity: item.quantity - 1 }));
    } else if (item && item.quantity === 1) {
      dispatch(removeFromCartAction(menuItemId));
    }
  };

  const clearCart = () => {
    dispatch(clearCartAction());
  };

  const getItemQuantity = (menuItemId: number): number => {
    const item = cart.items.find((item) => item.menuItem.id === menuItemId);
    return item ? item.quantity : 0;
  };

  const isInCart = (menuItemId: number): boolean => {
    return cart.items.some((item) => item.menuItem.id === menuItemId);
  };

  const updateDeliveryCharge = (charge: number) => {
    dispatch(setDeliveryCharge(charge));
  };

  const updateTaxRate = (rate: number) => {
    dispatch(setTaxRate(rate));
  };

  const getCartForOrder = () => {
    return cart.items.map((item) => ({
      menuItemId: item.menuItem.id,
      itemName: item.menuItem.name,
      quantity: item.quantity,
      rate: item.menuItem.rate || 0,
      cartQuantity: item.quantity,
      subtotal: (item.menuItem.rate || 0) * item.quantity,
    }));
  };

  return {
    items: cart.items,
    totalItems: cart.totalItems,
    subtotal: cart.subtotal,
    tax: cart.tax,
    deliveryCharge: cart.deliveryCharge,
    total: cart.total,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
    updateDeliveryCharge,
    updateTaxRate,
    getCartForOrder,
  };
};

