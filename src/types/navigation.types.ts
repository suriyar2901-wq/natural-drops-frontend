import { NavigatorScreenParams } from '@react-navigation/native';
import { User, UserRole } from './user.types';
import { MenuItem } from './product.types';
import { Order } from './order.types';

// Auth Stack
export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

// Buyer Stack
export type BuyerStackParamList = {
  BuyerTabs: undefined;
  BuyerHome: undefined;
  ProductList: { category?: string };
  ProductDetail: { product: MenuItem };
  Cart: undefined;
  Checkout: undefined;
  Orders: undefined;
  OrderDetail: { order: Order };
  Profile: undefined;
  QRScanner: undefined;
};

// Admin Stack
export type AdminStackParamList = {
  AdminDashboard: undefined;
  MenuManagement: undefined;
  AddProduct: undefined;
  EditProduct: { product: MenuItem };
  OrderManagement: undefined;
  OrderDetail: { order: Order };
  UserManagement: undefined;
  AddUser: undefined;
  EditUser: { user: User };
  Reports: undefined;
  Settings: undefined;
  SellerList: undefined;
  AddSeller: undefined;
  SellerDetail: { sellerId: number };
  EditSeller: { sellerId: number };
  ActivatePayment: { sellerId: number };
  SubscriptionList: { filter?: string } | undefined;
  PaymentList: { status?: string } | undefined;
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Buyer: NavigatorScreenParams<BuyerStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

