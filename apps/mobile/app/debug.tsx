import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DebugScreen() {
  const insets = useSafeAreaInsets();
  const safeTopRef = useRef<HTMLDivElement | null>(null);
  const [safeTopHeight, setSafeTopHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || !safeTopRef.current) return;

    const measure = () => setSafeTopHeight(safeTopRef.current?.getBoundingClientRect().height ?? 0);
    measure();
    console.log('safe top', safeTopRef.current.getBoundingClientRect().height);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      {Platform.OS === 'web' ? (
        <div ref={safeTopRef} aria-label="Safe area superior" className="test-safe-area" />
      ) : (
        <View accessibilityLabel="Safe area superior" style={styles.safeTop} />
      )}
      <View pointerEvents="none" style={styles.labelOverlay}>
        <Text accessibilityLabel="Valores del safe area" style={styles.safeTopLabel}>
          SAFE AREA{`\n`}
          provider top: {insets.top}px{`\n`}
          provider right: {insets.right}px{`\n`}
          provider bottom: {insets.bottom}px{`\n`}
          provider left: {insets.left}px{`\n`}
          css safe top: {safeTopHeight.toFixed(1)}px
        </Text>
      </View>
      <View style={styles.content} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1687ff',
  },
  content: {
    flex: 1,
    margin: 32,
    backgroundColor: '#e500a8',
  },
  safeTop: {
    width: '100%',
    height: 0,
    flexShrink: 0,
    backgroundColor: '#22c55e',
  },
  safeTopLabel: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  labelOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
