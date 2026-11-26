import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const HOLD_MS = 1300;

/**
 * Branded intro shown over the app on launch. The app renders underneath, so
 * the map and location lookup start loading while this is on screen.
 */
export default function SplashIntro({ onFinish }: { onFinish: () => void }) {
  const logo = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(logo, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(screen, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => animation.stop();
  }, [logo, onFinish, screen]);

  return (
    <Animated.View style={[styles.container, { opacity: screen }]}>
      <Animated.View
        style={[
          styles.center,
          {
            opacity: logo,
            transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}
      >
        <View style={styles.badge}>
          <Ionicons name="barbell" size={46} color="#fff" />
        </View>
        <Text style={styles.wordmark}>
          Gym<Text style={styles.wordmarkAccent}>Finder</Text>
        </Text>
        <View style={styles.rule} />
        <Text style={styles.tagline}>FIND YOUR NEXT WORKOUT</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  center: {
    alignItems: 'center',
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D2E',
    transform: [{ rotate: '-8deg' }],
  },
  wordmark: {
    marginTop: 26,
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  wordmarkAccent: {
    color: '#E11D2E',
  },
  rule: {
    width: 44,
    height: 3,
    marginTop: 14,
    borderRadius: 2,
    backgroundColor: '#E11D2E',
  },
  tagline: {
    marginTop: 14,
    color: '#B8B8BE',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
