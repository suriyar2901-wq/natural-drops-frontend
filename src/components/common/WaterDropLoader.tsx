import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

type Props = {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
};

/** Classic CSS teardrop — tip points straight up after +45° rotate */
function WaterDropShape({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: ViewStyle;
}) {
  const body = size * 0.72;
  const r = body / 2;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View
        style={[
          styles.drop,
          {
            width: body,
            height: body,
            backgroundColor: color,
            // Sharp top-left → after rotate(45deg) tip faces UP
            borderTopLeftRadius: 0,
            borderTopRightRadius: r,
            borderBottomRightRadius: r,
            borderBottomLeftRadius: r,
          },
        ]}
      >
        <View
          style={[
            styles.highlight,
            {
              width: size * 0.16,
              height: size * 0.2,
              borderRadius: size * 0.12,
              // Highlight sits on the upper-left of the bulb (reads as gloss after rotate)
              top: body * 0.22,
              left: body * 0.18,
            },
          ]}
        />
      </View>
    </View>
  );
}

export const WaterDropLoader = ({ size = 'large', color, style }: Props) => {
  const float = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const drip = useRef(new Animated.Value(0)).current;

  const dim = size === 'large' ? 64 : 44;
  const brand = color || colors.primary;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const rippleLoop = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    const dripLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drip, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drip, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    );

    floatLoop.start();
    rippleLoop.start();
    dripLoop.start();
    return () => {
      floatLoop.stop();
      rippleLoop.stop();
      dripLoop.stop();
    };
  }, [float, ripple, drip]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });
  const scale = float.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1.4],
  });
  const rippleOpacity = ripple.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.5, 0.22, 0],
  });

  const dripY = drip.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });
  const dripOpacity = drip.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 0.6, 0],
  });

  const stage = dim + 36;

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}
    >
      <View style={[styles.stage, { width: stage, height: stage + 20 }]}>
        {/* Soft water ripples under the drop */}
        <Animated.View
          style={[
            styles.ripple,
            {
              width: dim * 0.9,
              height: dim * 0.28,
              borderRadius: dim,
              borderColor: brand,
              bottom: 10,
              opacity: rippleOpacity,
              transform: [{ scaleX: rippleScale }, { scaleY: rippleScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ripple,
            {
              width: dim * 0.7,
              height: dim * 0.22,
              borderRadius: dim,
              borderColor: colors.blue300,
              bottom: 14,
              opacity: ripple.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.35, 0.15, 0],
              }),
              transform: [
                {
                  scaleX: ripple.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1.15],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Main water-drop shape */}
        <Animated.View
          style={[
            styles.dropWrap,
            {
              transform: [{ translateY }, { scale }],
              ...dropShadow,
            },
          ]}
        >
          <WaterDropShape size={dim} color={brand} />
        </Animated.View>

        {/* Tiny falling drip */}
        <Animated.View
          style={[
            styles.miniDrip,
            {
              backgroundColor: brand,
              opacity: dripOpacity,
              transform: [{ translateY: dripY }, { rotate: '45deg' }],
            },
          ]}
        />
      </View>
    </View>
  );
};

const dropShadow =
  Platform.OS === 'web'
    ? ({
        boxShadow: '0 14px 28px rgba(2, 50, 170, 0.28)',
      } as const)
    : {
        shadowColor: '#0232AA',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      };

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  drop: {
    // Tip UP: sharp TL + rotate +45°
    transform: [{ rotate: '45deg' }],
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  ripple: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  miniDrip: {
    position: 'absolute',
    bottom: 28,
    width: 10,
    height: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 5,
    zIndex: 1,
  },
});
