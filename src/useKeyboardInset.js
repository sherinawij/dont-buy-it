// How many pixels of a view the on-screen keyboard covers, so we can pad the view by exactly that much.
// Why not KeyboardAvoidingView? On Android (edge-to-edge since Expo SDK 54) the window no longer
// shrinks for the keyboard, and KeyboardAvoidingView needs a guessed header offset. Measuring
// "bottom of my view" vs "top of the keyboard" in screen coordinates works on both platforms.
import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform } from 'react-native';

export function useKeyboardInset() {
  const viewRef = useRef(null); // attach to the screen's root View (with collapsable={false} for Android)
  const [inset, setInset] = useState(0);

  useEffect(() => {
    // iOS fires "will" events (lets us animate alongside the keyboard); Android only fires "did".
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animate = (e) => {
      if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.create(e?.duration || 250, 'keyboard', 'opacity'));
    };

    const onShow = (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      if (!viewRef.current) return setInset(e.endCoordinates.height);
      viewRef.current.measureInWindow((x, y, w, h) => {
        animate(e);
        // Overlap between the bottom of our view and the top of the keyboard.
        // If the measurement is unusable, fall back to the whole keyboard height.
        setInset(h > 0 ? Math.max(0, y + h - keyboardTop) : e.endCoordinates.height);
      });
    };
    const onHide = (e) => {
      animate(e);
      setInset(0);
    };

    const a = Keyboard.addListener(showEvt, onShow);
    const b = Keyboard.addListener(hideEvt, onHide);
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return { viewRef, inset };
}
