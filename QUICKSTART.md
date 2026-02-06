# Quick Start Guide - Natural Drops Mobile App

## ⚡ Get Running in 5 Minutes

### Step 1: Update API URL (2 minutes)

Open `src/utils/constants.ts` and update with your server IP:

```typescript
// Find your IP: On Linux run: ip addr show | grep inet
// On Windows: ipconfig
// On Mac: ifconfig | grep inet

export const API_BASE_URL = 'http://192.168.1.100:8080/api'; // Replace with YOUR IP
```

**Important**: Don't use `localhost` or `127.0.0.1` - use your actual network IP address!

### Step 2: Start Backend (1 minute)

In a new terminal:
```bash
cd ../spring-boot-backend
mvn spring-boot:run
```

Wait for "Started NaturalDropsApplication" message.

### Step 3: Start React Native App (2 minutes)

```bash
cd react-native-frontend
npm start
```

### Step 4: Run on Device

**Option A: Physical Device (Recommended)**
1. Install "Expo Go" app from Play Store/App Store
2. Scan the QR code shown in terminal
3. Wait for app to load

**Option B: Android Emulator**
```bash
npm run android
```

**Option C: iOS Simulator (Mac only)**
```bash
npm run ios
```

## 🎉 You're Ready!

### Test Credentials

**Buyer Account**:
- Username: `buyer`
- Password: `password`

**Admin Account**:
- Username: `admin`
- Password: `password`

### What to Test

✅ **Buyer Flow**:
1. Login as buyer
2. Browse products on Home screen
3. Add items to cart
4. View cart and checkout
5. View orders

✅ **Admin Flow**:
1. Login as admin
2. View dashboard statistics
3. Manage orders (update status)
4. Manage products

## 🐛 Common Issues & Quick Fixes

### Issue: "Network request failed"
**Fix**: Update API_BASE_URL with your correct IP address

### Issue: "Unable to resolve module"
**Fix**: 
```bash
npx expo start --clear
```

### Issue: App won't load on Expo Go
**Fix**: Ensure your phone and computer are on the same WiFi network

### Issue: Backend not responding
**Fix**:
1. Check if Spring Boot is running (`mvn spring-boot:run`)
2. Test in browser: `http://YOUR_IP:8080/api/menu`
3. Check firewall settings

### Issue: "Expo Go is not compatible"
**Fix**: Update Expo Go app to latest version from store

## 📱 App Features Checklist

After starting the app, test these:

- [ ] Login/Register
- [ ] Browse products
- [ ] Add to cart
- [ ] Place order
- [ ] View orders
- [ ] Update order status (admin)
- [ ] Logout

## 🚀 Next Steps

1. **Customize**: Update colors in `src/theme/colors.ts`
2. **Add Products**: Use admin panel or database
3. **Test Offline**: Close app, reopen - cart persists!
4. **QR Scanner**: Test on physical device
5. **Push Notifications**: Configure Firebase (see main README)

## 💡 Pro Tips

- **Fast Refresh**: Save any file to see changes instantly
- **Debug Menu**: Shake device or press Cmd+D (iOS) / Cmd+M (Android)
- **View Logs**: Check terminal for console.log outputs
- **Redux DevTools**: Use React Native Debugger

## 📞 Need Help?

- Check `README.md` for detailed documentation
- Review error messages in terminal
- Ensure all dependencies are installed: `npm install`

---

**Happy Building! 🎉**

