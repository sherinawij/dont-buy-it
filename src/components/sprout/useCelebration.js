import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import useReducedMotion from './useReducedMotion';

// A single native-driven clock keeps the particles inexpensive; skip the initial trigger.
export default function useCelebration(trigger) {
  const [progress] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.5));
  const previous = useRef(trigger);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const changed = !Object.is(previous.current, trigger);
    previous.current = trigger;
    progress.setValue(0);
    scale.setValue(0.5);
    if (!changed || reducedMotion) return;
    const animation = Animated.parallel([
      Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true, isInteraction: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [trigger, reducedMotion, progress, scale]);
  return { progress, scale };
}
