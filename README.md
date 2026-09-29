# Natural Drops Mobile App

A complete React Native mobile application for the Natural Drops Water Supply System, built with Expo, TypeScript, Redux Toolkit, and React Navigation.

## Latest changes
- Seller and buyer shop screens: phone orders, customers, regular buyers, payments, and 20L cans.
- Checkout and phone orders use a future date plus an hour and minute with AM/PM.
- Popups open inside the app. Phone-sized screens scroll so the rest of a long form stays reachable.
- Seller dashboard pie chart shows fully paid earnings, partial amount collected, and the balance still due.
- A partial bill shows the balance while editing and again on the order.
- A blank notification message no longer replaces the real order text.
- A deactivated buyer cannot log in or stay inside the app. Admin access is unchanged.

## Features

### 🎯 Core Features
- **Authentication**: Login & Registration with role-based access (Buyer/Admin)
- **Product Catalog**: Browse water and beverage products
- **Shopping Cart**: Add items, manage quantities, view totals
- **Order Management**: Place orders, track status, view history
- **Admin Dashboard**: Manage products, orders, and users
- **Offline Support**: Cart and auth data persisted locally
- **Push Notifications**: Real-time order updates
- **QR Code Scanner**: Scan QR codes for quick actions
- **Location Services**: GPS tracking for delivery addresses
- **Payment Integration**: Support for UPI, cards, and COD

### 📱 Technology Stack
- **Frontend**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **Navigation**: React Navigation 6
- **Offline Storage**: Redux Persist + AsyncStorage
- **HTTP Client**: Axios
- **UI Components**: Custom components with React Native
- **Maps**: React Native Maps
- **Camera**: Expo Camera for QR scanning
- **Notifications**: Expo Notifications

## Project Structure

```
react-native-frontend/
├── App.tsx                          # Root component
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── src/
    ├── components/
    │   ├── common/                  # Reusable UI components
    │   ├── product/                 # Product-specific components
    │   ├── cart/                    # Cart components
    │   └── order/                   # Order components
    ├── hooks/                       # Custom React hooks
    ├── navigation/                  # Navigation setup
    ├── screens/
    │   ├── auth/                    # Auth screens (Login, Register)
    │   ├── buyer/                   # Buyer screens
    │   └── admin/                   # Admin screens
    ├── services/                    # API and device services
    ├── store/                       # Redux store, slices, API
    ├── theme/                       # Colors, typography, spacing
    ├── types/                       # TypeScript type definitions
    └── utils/                       # Helpers and utilities
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- For iOS: Mac with Xcode
- For Android: Android Studio with SDK
- Or use Expo Go app on your phone

### Installation

1. **Navigate to project directory**:
```bash
cd react-native-frontend
```

2. **Install dependencies** (already done):
```bash
npm install
```

3. **Update API URL**:
Edit `src/utils/constants.ts` and update the API_BASE_URL with your server IP:
```typescript
export const API_BASE_URL = 'http://YOUR_SERVER_IP:8080/api';
```

### Running the App

#### Development Mode

**Start the development server**:
```bash
npm start
```

**Run on Android**:
```bash
npm run android
```

**Run on iOS** (Mac only):
```bash
npm run ios
```

**Run on Web**:
```bash
npm run web
```

**Using Expo Go App**:
1. Install Expo Go on your phone (Android/iOS)
2. Run `npm start`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Backend Setup

Make sure your Spring Boot backend is running:
```bash
cd ../spring-boot-backend
mvn spring-boot:run
```

The backend should be accessible at `http://YOUR_IP:8080/api`

## Configuration

### API Configuration
Update the API base URL in `src/utils/constants.ts`:
```typescript
export const API_BASE_URL = 'http://192.168.1.100:8080/api';
```

### App Configuration
Modify `app.json` to customize:
- App name and slug
- Bundle identifiers (iOS/Android)
- Permissions
- Icons and splash screen
- Notification settings

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator (Mac only)
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## Features Breakdown

### Authentication Flow
1. Splash screen checks for saved credentials
2. Login/Register screens with validation
3. JWT token storage (when backend implements it)
4. Role-based navigation (Buyer/Admin)

### Buyer Features
- **Home**: Browse products, add to cart
- **Cart**: Manage cart items, checkout
- **Orders**: View order history and status
- **Profile**: View/edit user information
- **QR Scanner**: Scan QR codes for quick order placement

### Admin Features
- **Dashboard**: Overview of orders, revenue, statistics
- **Order Management**: View and update order status
- **Product Management**: Add, edit, delete products
- **User Management**: Manage user accounts

### Offline Support
- Cart items persisted locally
- Auth state saved for quick app restarts
- Automatic sync when back online

### Push Notifications
- Order confirmations
- Order status updates
- Promotional notifications (future)

## Building for Production

### Android APK/AAB

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure build**:
```bash
eas build:configure
```

4. **Build for Android**:
```bash
eas build --platform android
```

### iOS IPA

1. **Build for iOS** (requires Apple Developer account):
```bash
eas build --platform ios
```

### Both Platforms

```bash
eas build --platform all
```

## App Store Deployment

### Google Play Store
1. Create a Google Play Console account ($25 one-time fee)
2. Build AAB: `eas build --platform android --profile production`
3. Upload AAB to Play Console
4. Complete app listing (description, screenshots, etc.)
5. Submit for review

### Apple App Store
1. Join Apple Developer Program ($99/year)
2. Build IPA: `eas build --platform ios --profile production`
3. Upload via Transporter or Xcode
4. Complete app listing in App Store Connect
5. Submit for review

## Testing

### On Physical Devices
1. Install Expo Go app
2. Scan QR code from `npm start`
3. Test all features

### On Emulators
- **Android**: Use Android Studio AVD
- **iOS**: Use Xcode Simulator (Mac only)

## Troubleshooting

### Common Issues

**1. Metro bundler cache issues**:
```bash
npx expo start --clear
```

**2. Dependency conflicts**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**3. Android build errors**:
```bash
cd android && ./gradlew clean
cd .. && npm run android
```

**4. iOS build errors** (Mac):
```bash
cd ios && pod install
cd .. && npm run ios
```

**5. Network request failed**:
- Ensure Spring Boot backend is running
- Update API_BASE_URL with correct IP
- Check firewall settings
- Use actual IP address, not localhost (for physical devices)

## Environment Variables

For production builds, consider using environment variables:
```bash
export API_URL=https://api.naturaldrops.com
```

Or use `.env` files with `react-native-dotenv`.

## Performance Optimization

- Images are optimized automatically by Expo
- Redux Persist for fast app startup
- RTK Query for efficient API caching
- React Navigation for smooth transitions

## Security

- Passwords validated before submission
- API tokens stored securely in AsyncStorage
- HTTPS recommended for production
- Input validation on all forms

## Future Enhancements

- [ ] Biometric authentication (fingerprint/face ID)
- [ ] Dark mode support
- [ ] Multi-language support (i18n)
- [ ] Social login (Google, Facebook)
- [ ] In-app chat support
- [ ] Order tracking with real-time GPS
- [ ] Loyalty points and rewards
- [ ] Product reviews and ratings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions:
- Email: support@naturaldrops.com
- Phone: +91 1234567890

## License

© 2024 Natural Drops. All rights reserved.

## Acknowledgments

- Built with [Expo](https://expo.dev/)
- UI inspired by modern e-commerce apps
- Icons from Material Icons

---

**Happy Coding! 🚀**
