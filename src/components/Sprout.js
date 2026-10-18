import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg from 'react-native-svg';
import SproutArt from './sprout/SproutArt';
import { Pupils } from './sprout/Face';
import useReducedMotion from './sprout/useReducedMotion';

const STAGES = ['seed', 'sprout', 'small plant', 'bushy plant', 'flowering plant'];

/** @param {{stage?: number, mood?: string, size?: number, shakeKey?: unknown, bounceKey?: unknown, still?: boolean}} props */
function Sprout({ stage = 1, mood = 'smug', size = 120, shakeKey, bounceKey, still = false }) {
  // Stable Animated values work on both native and the web preview.
  const [sway] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  const [gaze] = useState(() => new Animated.Value(0));
  const previousShake = useRef(shakeKey);
  const previousBounce = useRef(bounceKey);
  const reducedMotion = useReducedMotion();
  const frozen = still || reducedMotion;
  const safeStage = Math.max(0, Math.min(4, Math.round(Number(stage) || 0)));

  useEffect(() => {
    gaze.setValue(0);
    if (frozen || mood !== 'nervous') return;
    const darting = Animated.loop(Animated.sequence([
      Animated.delay(900),
      Animated.timing(gaze, { toValue: -1, duration: 90, useNativeDriver: true, isInteraction: false }),
      Animated.delay(650),
      Animated.timing(gaze, { toValue: 1, duration: 90, useNativeDriver: true, isInteraction: false }),
      Animated.delay(1000),
      Animated.timing(gaze, { toValue: 0, duration: 90, useNativeDriver: true, isInteraction: false }),
    ]));
    darting.start();
    return () => darting.stop();
  }, [frozen, mood, gaze]);

  useEffect(() => {
    sway.setValue(0);
    if (frozen) return;
    const idle = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(sway, { toValue: -1, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(sway, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    idle.start();
    return () => idle.stop();
  }, [frozen, sway]);

  useEffect(() => {
    const changed = !Object.is(previousShake.current, shakeKey);
    previousShake.current = shakeKey;
    shake.setValue(0);
    if (frozen || !changed) return;
    const animation = Animated.sequence([1, -1, 0.7, -0.7, 0].map((toValue) =>
      Animated.timing(shake, { toValue, duration: 65, useNativeDriver: true })));
    animation.start();
    return () => animation.stop();
  }, [shakeKey, frozen, shake]);

  useEffect(() => {
    const changed = !Object.is(previousBounce.current, bounceKey);
    previousBounce.current = bounceKey;
    bounce.setValue(0);
    if (frozen || !changed) return;
    const animation = Animated.sequence([
      Animated.timing(bounce, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 0, friction: 4, tension: 90, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [bounceKey, frozen, bounce]);

  return (
    <Animated.View
      accessible accessibilityRole="image" accessibilityLabel={`Sprout, ${STAGES[safeStage]}, feeling ${mood}`}
      style={{ width: size, height: size }}
    >
      {/* No transforms in still mode: captureRef gets the same drawing every time. */}
      <Animated.View style={frozen ? undefined : { transform: [
        { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.025, size * 0.025] }) },
        { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.055] }) },
        { rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] }) },
        { scale: bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) },
      ] }}>
        <SproutArt stage={safeStage} mood={mood} size={size} hidePupils={mood === 'nervous' && !frozen} />
        {mood === 'nervous' && !frozen && (
          // Move only the pupil layer, using the native driver rather than redrawing SVG each frame.
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, transform: [
            { translateX: gaze.interpolate({ inputRange: [-1, 1], outputRange: [-size * 0.014, size * 0.008] }) },
          ] }}>
            <Svg width={size} height={size} viewBox="0 0 240 260" accessible={false}><Pupils mood={mood} /></Svg>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

export default memo(Sprout);
