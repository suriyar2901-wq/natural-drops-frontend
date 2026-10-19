import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button, Input, CustomerServiceModal } from '../../components/common';
import { useAuth } from '../../hooks';
import { validators } from '../../utils/validators';

export const LoginScreen = ({ navigation }: any) => {
  const { login, isLoading } = useAuth();
  const { width, height } = useWindowDimensions();
  const isWide = width >= 860;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [showCustomerServiceModal, setShowCustomerServiceModal] = useState(false);
  const [accountStatusMessage, setAccountStatusMessage] = useState('');
  const [errorPopup, setErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterY = useRef(new Animated.Value(20)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const dropFloat = useRef(new Animated.Value(0)).current;
  const waveDrift = useRef(new Animated.Value(0)).current;

  const showErrorPopup = (title: string, message: string) => {
    setErrorPopup({ title, message });
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'login-premium-v3';
      document.getElementById(styleId)?.remove();
      document.getElementById('login-hero-v2')?.remove();
      document.getElementById('login-brand-atmosphere')?.remove();

      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .nd-login-visual {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse 90% 70% at 20% 15%, rgba(142, 166, 230, 0.45), transparent 55%),
            radial-gradient(ellipse 70% 60% at 88% 80%, rgba(1, 38, 127, 0.55), transparent 50%),
            linear-gradient(160deg, #0232AA 0%, #01267F 55%, #0A1F6B 100%);
        }
        .nd-login-visual::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0);
          background-size: 28px 28px;
          opacity: 0.35;
          pointer-events: none;
        }
        .nd-login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
          pointer-events: none;
        }
        .nd-login-orb-a {
          width: 280px; height: 280px; top: -60px; right: -40px;
          background: radial-gradient(circle, rgba(255,255,255,0.22), transparent 68%);
        }
        .nd-login-orb-b {
          width: 200px; height: 200px; bottom: 8%; left: -50px;
          background: radial-gradient(circle, rgba(142,166,230,0.35), transparent 70%);
        }
        @keyframes nd-ripple {
          0% { transform: scale(0.55); opacity: 0.7; }
          100% { transform: scale(2.15); opacity: 0; }
        }
        .nd-ripple-ring {
          position: absolute;
          border: 2px solid rgba(255,255,255,0.55);
          border-radius: 50%;
          box-shadow: 0 0 18px rgba(255,255,255,0.35), inset 0 0 12px rgba(255,255,255,0.15);
          animation: nd-ripple 2.2s ease-out infinite;
        }
        .nd-ripple-ring:nth-child(2) { animation-delay: 0.7s; border-color: rgba(255,255,255,0.4); }
        .nd-ripple-ring:nth-child(3) { animation-delay: 1.4s; border-color: rgba(255,255,255,0.28); }
        @media (prefers-reduced-motion: reduce) {
          .nd-ripple-ring { animation: none; opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const reduceMotion =
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduceMotion) {
      enterOpacity.setValue(1);
      enterY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(enterOpacity, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(enterY, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const rippleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ripple, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dropFloat, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dropFloat, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveDrift, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveDrift, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    rippleLoop.start();
    floatLoop.start();
    waveLoop.start();
    return () => {
      rippleLoop.stop();
      floatLoop.stop();
      waveLoop.stop();
    };
  }, [enterOpacity, enterY, ripple, dropFloat, waveDrift]);

  const actualLoading = localLoading;

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!validators.required(username)) newErrors.username = 'Username is required';
    if (!validators.required(password)) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) {
      showErrorPopup('Login Failed', 'Please enter your username and password.');
      return;
    }

    setLocalLoading(true);
    try {
      const result = await login({ username, password });

      if (result.success && result.user) {
        const isActiveBoolean = result.user.isActive !== false;
        const isInactive =
          (result.user.role === 'seller' || result.user.role === 'buyer') && !isActiveBoolean;

        if (isInactive) {
          navigation.replace('AccountInactive');
          return;
        }

        if (result.user.role === 'seller' || result.user.role === 'admin') {
          navigation.replace('AdminApp');
        } else {
          navigation.replace('BuyerApp');
        }
      } else {
        if (result.isAccountStatusError && result.errorCode === 'INACTIVE') {
          navigation.replace('AccountInactive');
          return;
        }

        if (result.isAccountStatusError) {
          setAccountStatusMessage(result.error || 'Your account access is restricted.');
          setShowCustomerServiceModal(true);
        } else {
          const isInvalidCredentials =
            result.errorCode === 'INVALID_CREDENTIALS' ||
            (result.error || '').toLowerCase().includes('invalid username') ||
            (result.error || '').toLowerCase().includes('invalid password');
          const errorMessage = isInvalidCredentials
            ? 'Invalid username or password. Please check your details and try again.'
            : result.error || 'Please check your credentials';
          const title =
            errorMessage.includes('connect to server') || errorMessage.includes('backend server')
              ? 'Connection Error'
              : 'Login Failed';
          showErrorPopup(title, errorMessage);
        }
      }
    } catch {
      showErrorPopup('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const dropTranslate = dropFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });
  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 2.1],
  });
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0],
  });
  const waveShift = waveDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 18],
  });
  const waveShiftAlt = waveDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -14],
  });

  /** Native-friendly atmosphere + wave (works on mobile app and mobile web). */
  const renderAtmosphere = (rounded?: boolean) => (
    <View
      style={[styles.atmosphere, rounded && styles.atmosphereRounded]}
      pointerEvents="none"
    >
      <View style={styles.atmosGlowTop} />
      <View style={styles.atmosGlowBottom} />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <View style={styles.dotField}>
        {Array.from({ length: 36 }).map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                left: `${(index % 6) * 18 + 8}%`,
                top: `${Math.floor(index / 6) * 16 + 10}%`,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.waveWrap}>
        <Animated.View style={[styles.waveBlob, styles.waveBlobBack, { transform: [{ translateX: waveShiftAlt }] }]} />
        <Animated.View style={[styles.waveBlob, styles.waveBlobMid, { transform: [{ translateX: waveShift }] }]} />
        <Animated.View style={[styles.waveBlob, styles.waveBlobFront, { transform: [{ translateX: waveShiftAlt }] }]} />
      </View>
    </View>
  );

  const brandBlock = (
    <View style={[styles.brandInner, !isWide && styles.brandInnerMobile]}>
      <Animated.View style={{ transform: [{ translateY: dropTranslate }] }}>
        <View style={[styles.dropStage, !isWide && styles.dropStageMobile]}>
          <Animated.View
            style={[
              styles.rippleRing,
              styles.rippleRingSoft,
              !isWide && styles.rippleRingMobile,
              { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.rippleRing,
              styles.rippleRingMid,
              !isWide && styles.rippleRingMidMobile,
              {
                transform: [{ scale: rippleScale }],
                opacity: rippleOpacity.interpolate({
                  inputRange: [0, 0.65],
                  outputRange: [0, 0.45],
                }),
              },
            ]}
          />
          <View style={[styles.dropCore, !isWide && styles.dropCoreMobile]}>
            <Ionicons name="water" size={isWide ? 42 : 28} color={colors.primary} />
          </View>
        </View>
      </Animated.View>

      <Text style={[styles.brandName, !isWide && styles.brandNameMobile]} accessibilityRole="header">
        Natural Drops
      </Text>
      <Text style={[styles.brandLine, !isWide && styles.brandLineMobile]}>
        Fresh water cans, delivered to your door
      </Text>
    </View>
  );

  const formBlock = (
    <Animated.View
      style={[
        styles.formWrap,
        isWide && styles.formWrapWide,
        { opacity: enterOpacity, transform: [{ translateY: enterY }] },
      ]}
    >
      <Text style={styles.formTitle}>Welcome back</Text>
      <Text style={styles.formSubtitle}>Sign in to continue</Text>

      <Input
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your username"
        autoCapitalize="none"
        error={errors.username}
      />

      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        showPasswordToggle
        error={errors.password}
      />

      <Button
        title="Forgot Password?"
        onPress={() => navigation.navigate('ForgotPassword')}
        variant="text"
        fullWidth
        style={styles.forgotPasswordButton}
      />

      <Button
        title="Login"
        onPress={handleLogin}
        loading={actualLoading || isLoading}
        fullWidth
        style={styles.loginButton}
      />

      <View style={styles.registerRow}>
        <Text style={styles.registerHint}>Don&apos;t have an account?</Text>
        <Button
          title="Register"
          onPress={() => navigation.navigate('Register')}
          variant="text"
          style={styles.registerButton}
        />
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {isWide ? (
        <View style={[styles.split, { minHeight: Math.max(height, 640) }]}>
          <View style={[styles.visualNative, styles.visualWide]}>
            {Platform.OS === 'web' ? (
              // @ts-ignore atmosphere layer
              <div className="nd-login-visual" style={{ position: 'absolute', inset: 0 }}>
                {/* @ts-ignore */}
                <div className="nd-login-orb nd-login-orb-a" />
                {/* @ts-ignore */}
                <div className="nd-login-orb nd-login-orb-b" />
                <View style={styles.webRipples} pointerEvents="none">
                  {/* @ts-ignore */}
                  <div className="nd-ripple-ring" style={{ width: 260, height: 260, top: '38%', left: '50%', marginLeft: -130, marginTop: -130 }} />
                  {/* @ts-ignore */}
                  <div className="nd-ripple-ring" style={{ width: 260, height: 260, top: '38%', left: '50%', marginLeft: -130, marginTop: -130 }} />
                  {/* @ts-ignore */}
                  <div className="nd-ripple-ring" style={{ width: 260, height: 260, top: '38%', left: '50%', marginLeft: -130, marginTop: -130 }} />
                </View>
              </div>
            ) : null}
            {renderAtmosphere()}
            {brandBlock}
          </View>

          <View style={styles.formColumn}>{formBlock}</View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.mobileScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.visualNative, styles.visualMobile, { width: width - spacing.lg * 2 }]}>
            {Platform.OS === 'web' ? (
              // @ts-ignore keep web gradient fill under RN wave layers
              <div className="nd-login-visual" style={{ position: 'absolute', inset: 0, borderRadius: 24 }} />
            ) : null}
            {renderAtmosphere(true)}
            {brandBlock}
          </View>
          {formBlock}
        </ScrollView>
      )}

      <CustomerServiceModal
        visible={showCustomerServiceModal}
        message={accountStatusMessage}
        onClose={() => setShowCustomerServiceModal(false)}
      />

      <Modal
        visible={!!errorPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorPopup(null)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{errorPopup?.title || 'Login Failed'}</Text>
            <Text style={styles.popupMessage}>
              {errorPopup?.message || 'Invalid username or password. Please try again.'}
            </Text>
            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => setErrorPopup(null)}
              accessibilityRole="button"
            >
              <Text style={styles.popupButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
  },
  visualNative: {
    position: 'relative',
    backgroundColor: colors.primaryDark,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualWide: {
    flex: 1.05,
    minHeight: '100%',
  },
  visualMobile: {
    alignSelf: 'center',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  atmosphereRounded: {
    borderRadius: borderRadius.lg,
  },
  atmosGlowTop: {
    position: 'absolute',
    top: -40,
    left: -20,
    width: '70%',
    height: '55%',
    borderRadius: 200,
    backgroundColor: 'rgba(142, 166, 230, 0.35)',
  },
  atmosGlowBottom: {
    position: 'absolute',
    right: -30,
    bottom: -20,
    width: '65%',
    height: '50%',
    borderRadius: 200,
    backgroundColor: 'rgba(1, 38, 127, 0.45)',
  },
  orbA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  orbB: {
    position: 'absolute',
    bottom: 48,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(142,166,230,0.28)',
  },
  dotField: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  waveWrap: {
    position: 'absolute',
    left: -40,
    right: -40,
    bottom: -28,
    height: 120,
    overflow: 'hidden',
  },
  waveBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  waveBlobBack: {
    left: -30,
    bottom: 8,
    width: '120%',
    height: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  waveBlobMid: {
    left: -50,
    bottom: -6,
    width: '130%',
    height: 84,
    backgroundColor: 'rgba(142,166,230,0.28)',
  },
  waveBlobFront: {
    left: -20,
    bottom: -22,
    width: '115%',
    height: 78,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  webRipples: {
    ...StyleSheet.absoluteFillObject,
  },
  brandInner: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 2,
    maxWidth: 420,
    overflow: 'visible',
  },
  brandInnerMobile: {
    paddingHorizontal: spacing.md,
  },
  dropStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  dropStageMobile: {
    width: 112,
    height: 112,
    marginBottom: spacing.sm,
  },
  rippleRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  rippleRingMobile: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  rippleRingSoft: {
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rippleRingMid: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  rippleRingMidMobile: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  dropCore: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  dropCoreMobile: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  brandName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  brandNameMobile: {
    fontSize: typography.fontSize['2xl'],
    letterSpacing: -0.6,
    marginBottom: spacing.xs,
  },
  brandLine: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.lg,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 28,
  },
  brandLineMobile: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  formColumn: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  formWrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formWrapWide: {
    maxWidth: 380,
  },
  mobileScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  formTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  registerHint: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  registerButton: {
    marginTop: 0,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    padding: spacing.lg,
  },
  popupTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  popupButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
