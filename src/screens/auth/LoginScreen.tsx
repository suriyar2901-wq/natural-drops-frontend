import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
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
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Button, Input, CustomerServiceModal } from '../../components/common';
import { useAuth } from '../../hooks';
import { validators } from '../../utils/validators';

const thanniCanLogo = require('../../../assets/brand/thanni-can-logo.png');

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
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
  const splashA = useRef(new Animated.Value(0)).current;
  const splashB = useRef(new Animated.Value(0)).current;
  const splashC = useRef(new Animated.Value(0)).current;

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
        Animated.timing(waveDrift, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveDrift, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const makeSplash = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(280),
        ])
      );
    const splashLoopA = makeSplash(splashA, 1600);
    const splashLoopB = makeSplash(splashB, 2100);
    const splashLoopC = makeSplash(splashC, 1900);
    rippleLoop.start();
    floatLoop.start();
    waveLoop.start();
    splashLoopA.start();
    splashLoopB.start();
    splashLoopC.start();
    return () => {
      rippleLoop.stop();
      floatLoop.stop();
      waveLoop.stop();
      splashLoopA.stop();
      splashLoopB.stop();
      splashLoopC.stop();
    };
  }, [enterOpacity, enterY, ripple, dropFloat, waveDrift, splashA, splashB, splashC]);

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
    outputRange: [-22, 22],
  });
  const waveShiftAlt = waveDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -18],
  });
  const waveLift = waveDrift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const splashMotion = (value: Animated.Value, rise: number, drift: number) => ({
    opacity: value.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.95, 0] }),
    transform: [
      {
        translateY: value.interpolate({ inputRange: [0, 1], outputRange: [8, -rise] }),
      },
      {
        translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }),
      },
      {
        scale: value.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 1.05, 0.7] }),
      },
    ],
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
      <Animated.View style={[styles.floatDrop, styles.floatDropA, splashMotion(splashA, 46, -18)]} />
      <Animated.View style={[styles.floatDrop, styles.floatDropB, splashMotion(splashB, 58, 22)]} />
      <Animated.View style={[styles.floatDrop, styles.floatDropC, splashMotion(splashC, 40, 12)]} />
      <View style={styles.waveWrap}>
        <Animated.View
          style={[
            styles.waveBlob,
            styles.waveBlobBack,
            { transform: [{ translateX: waveShiftAlt }, { translateY: waveLift }] },
          ]}
        />
        <Animated.View
          style={[
            styles.waveBlob,
            styles.waveBlobMid,
            { transform: [{ translateX: waveShift }, { translateY: waveLift }] },
          ]}
        />
        <Animated.View
          style={[
            styles.waveBlob,
            styles.waveBlobFront,
            { transform: [{ translateX: waveShiftAlt }] },
          ]}
        />
      </View>
    </View>
  );

  const brandBlock = (
    <View style={[styles.brandInner, !isWide && styles.brandInnerMobile]}>
      <Animated.View style={{ transform: [{ translateY: dropTranslate }] }}>
        <View style={[styles.logoStage, !isWide && styles.logoStageMobile]}>
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
          {/* Soft light plate so black “Thanni Can” type in the PNG stays readable */}
          <View style={[styles.logoGlow, !isWide && styles.logoGlowMobile]} />
          <View style={[styles.logoFrame, !isWide && styles.logoFrameMobile]}>
            <Image
              source={thanniCanLogo}
              style={[styles.logoImage, !isWide && styles.logoImageMobile]}
              resizeMode="contain"
              accessibilityLabel="Thanni Can logo"
              accessibilityRole="header"
            />
          </View>
        </View>
      </Animated.View>

      <View style={[styles.taglineBlock, !isWide && styles.taglineBlockMobile]}>
        <View style={styles.taglineRail}>
          <Animated.View style={[styles.taglineRailDash, { transform: [{ translateX: waveShift }] }]} />
        </View>
        <View style={styles.taglineCopy}>
          <Text style={[styles.taglineKicker, !isWide && styles.taglineKickerMobile]}>
            DAILY DELIVERY
          </Text>
          <Text style={[styles.taglineLead, !isWide && styles.taglineLeadMobile]}>
            Fresh water cans
          </Text>
          <Text style={[styles.taglineSub, !isWide && styles.taglineSubMobile]}>
            delivered to your door
          </Text>
        </View>
        <View style={styles.taglineRail}>
          <Animated.View style={[styles.taglineRailDash, { transform: [{ translateX: waveShiftAlt }] }]} />
        </View>
      </View>
    </View>
  );

  const formBlock = (
    <Animated.View
      style={[
        styles.formCard,
        isWide && styles.formCardWide,
        { opacity: enterOpacity, transform: [{ translateY: enterY }] },
      ]}
    >
      <View style={styles.formHeader}>
        <Text style={styles.formEyebrow}>ACCOUNT</Text>
        <Text style={styles.formTitle}>Welcome back</Text>
        <Text style={styles.formSubtitle}>Sign in to order and track your water cans</Text>
      </View>

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

      <TouchableOpacity
        onPress={() => navigation.navigate('ForgotPassword')}
        style={styles.forgotLink}
        accessibilityRole="button"
      >
        <Text style={styles.forgotLinkText}>Forgot password?</Text>
      </TouchableOpacity>

      <Button
        title="Login"
        onPress={handleLogin}
        loading={localLoading}
        fullWidth
        style={styles.loginButton}
      />

      <View style={styles.formDivider}>
        <View style={styles.formDividerLine} />
        <Text style={styles.formDividerText}>or</Text>
        <View style={styles.formDividerLine} />
      </View>

      <View style={styles.registerRow}>
        <Text style={styles.registerHint}>New here?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="button">
          <Text style={styles.registerLink}>Create account</Text>
        </TouchableOpacity>
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
          <View style={styles.mobileHeroShell}>
            <View style={[styles.visualNative, styles.visualMobile]}>
              {Platform.OS === 'web' ? (
                // @ts-ignore keep web gradient fill under RN wave layers
                <div className="nd-login-visual" style={{ position: 'absolute', inset: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} />
              ) : null}
              {renderAtmosphere(true)}
              {brandBlock}
            </View>
          </View>
          <View style={styles.mobileFormShell}>{formBlock}</View>
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
    backgroundColor: colors.canvas,
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
    flex: 1.08,
    minHeight: '100%',
  },
  mobileHeroShell: {
    width: '100%',
    marginBottom: -28,
    zIndex: 1,
  },
  visualMobile: {
    width: '100%',
    minHeight: 420,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  mobileFormShell: {
    zIndex: 2,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  atmosphere: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  atmosphereRounded: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  floatDrop: {
    position: 'absolute',
    width: 10,
    height: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(190, 220, 255, 0.95)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  floatDropA: { top: '28%', left: '18%' },
  floatDropB: { top: '22%', right: '16%' },
  floatDropC: { top: '42%', right: '10%' },
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
  logoStage: {
    width: 360,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    overflow: 'visible',
  },
  logoStageMobile: {
    width: 268,
    height: 252,
    marginBottom: 2,
  },
  rippleRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  rippleRingMobile: {
    width: 228,
    height: 228,
    borderRadius: 114,
  },
  rippleRingSoft: {
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rippleRingMid: {
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rippleRingMidMobile: {
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  logoGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(210, 228, 255, 0.55)',
  },
  logoGlowMobile: {
    width: 230,
    height: 230,
    borderRadius: 115,
  },
  logoFrame: {
    width: 292,
    height: 292,
    borderRadius: 36,
    backgroundColor: '#E8F1FF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  logoFrameMobile: {
    width: 220,
    height: 220,
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  logoImage: {
    width: 268,
    height: 268,
  },
  logoImageMobile: {
    width: 204,
    height: 204,
  },
  taglineBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 360,
    paddingHorizontal: spacing.sm,
  },
  taglineBlockMobile: {
    gap: spacing.sm,
    maxWidth: 300,
  },
  taglineRail: {
    flex: 1,
    height: 2,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  taglineRailDash: {
    width: '70%',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(158, 205, 255, 0.95)',
  },
  taglineCopy: {
    alignItems: 'center',
    minWidth: 168,
  },
  taglineKicker: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 10,
    fontWeight: typography.fontWeight.semibold,
    color: '#9EC5FF',
    letterSpacing: 2.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  taglineKickerMobile: {
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 3,
  },
  taglineLead: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  taglineLeadMobile: {
    fontSize: typography.fontSize.lg,
    lineHeight: 24,
  },
  taglineSub: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    color: 'rgba(210, 228, 255, 0.92)',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  taglineSubMobile: {
    fontSize: typography.fontSize.xs,
    lineHeight: 18,
  },
  formColumn: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(2, 50, 170, 0.08)',
    ...Platform.select({
      web: {
        boxShadow: '0 18px 40px rgba(2, 50, 170, 0.10)',
      } as any,
      default: {
        elevation: 6,
        shadowColor: '#0232AA',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },
  formCardWide: {
    maxWidth: 400,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  mobileScroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  formHeader: {
    marginBottom: spacing.lg,
  },
  formEyebrow: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    letterSpacing: 2.2,
    marginBottom: spacing.xs,
  },
  formTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.6,
  },
  formSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  loginButton: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderRadius: borderRadius.full,
    minHeight: 52,
  },
  formDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  formDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  formDividerText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  registerHint: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
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
