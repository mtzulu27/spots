import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

// Hidden web screens may report zero while the navigation stack detaches them.
// Keep the last visible offset and restore only after the screen is laid out.
const positions = new Map<string, number>();

export function useReturnScroll(slot = 'main') {
  const route = useRoute();
  const key = `${route.key}:${slot}`;
  const ref = useRef<ScrollView>(null);
  const offset = useRef(positions.get(key) ?? 0);
  const focused = useRef(false);
  const restoring = useRef(false);
  const height = useRef(0);
  const contentHeight = useRef(0);
  const frame = useRef<number | null>(null);
  const restore = useCallback(() => {
    if (!focused.current) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: offset.current, animated: false });
      frame.current = requestAnimationFrame(() => {
        // Grid width and cards may arrive after focus. Do not save the
        // browser's clamped offset while the list is still too short.
        if (contentHeight.current >= offset.current + height.current - 1) restoring.current = false;
        frame.current = null;
      });
    });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    restoring.current = true;
    restore();
    return () => {
      focused.current = false;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [restore]));
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (focused.current && !restoring.current) {
      offset.current = Math.max(0, event.nativeEvent.contentOffset.y);
      positions.set(key, offset.current);
      if (positions.size > 100) positions.delete(positions.keys().next().value!);
    }
  }, [key]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    height.current = event.nativeEvent.layout.height;
    restore();
  }, [restore]);
  const onContentSizeChange = useCallback((_width: number, nextHeight: number) => {
    contentHeight.current = nextHeight;
    if (restoring.current) restore();
  }, [restore]);
  return { ref, onScroll, onLayout, onContentSizeChange, scrollEventThrottle: 16 };
}
