import { useEffect, useMemo, useRef, type PointerEvent as WebPointerEvent, type ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppPrimaryButton } from '@/components/app-ui';
import { accountUi as ui } from '@/lib/account-ui';

type Props = {
  visible: boolean;
  progress: Animated.Value;
  title: string;
  description: string;
  closeLabel: string;
  submitLabel: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
};

export function ContributionSheet({ visible, progress, title, description, closeLabel, submitLabel, submitting, onClose, onSubmit, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dragY = useRef(new Animated.Value(0)).current;
  const pointer = useRef<{ id: number; startY: number; lastY: number; lastTime: number; velocity: number } | null>(null);
  const resetDrag = () => Animated.spring(dragY, { toValue: 0, damping: 20, stiffness: 230, mass: 0.85, useNativeDriver: true }).start();
  function finishDrag(distance: number, velocity: number) {
    if (!submitting && (distance > 110 || velocity > 0.8)) onClose();
    else resetDrag();
  }
  // Web pointer capture keeps dragging continuous outside the header's bounds.
  const webGesture = {
    onPointerDown(event: WebPointerEvent<HTMLElement>) {
      if (submitting || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragY.stopAnimation();
      dragY.setValue(0);
      pointer.current = { id: event.pointerId, startY: event.clientY, lastY: event.clientY, lastTime: Date.now(), velocity: 0 };
    },
    onPointerMove(event: WebPointerEvent<HTMLElement>) {
      const current = pointer.current;
      if (!current || current.id !== event.pointerId) return;
      const now = Date.now();
      current.velocity = (event.clientY - current.lastY) / Math.max(1, now - current.lastTime);
      current.lastY = event.clientY;
      current.lastTime = now;
      dragY.setValue(Math.max(0, event.clientY - current.startY));
    },
    onPointerUp(event: WebPointerEvent<HTMLElement>) {
      const current = pointer.current;
      if (!current || current.id !== event.pointerId) return;
      pointer.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(event.clientY - current.startY, Date.now() - current.lastTime < 100 ? current.velocity : 0);
    },
    onPointerCancel() { pointer.current = null; resetDrag(); },
  } as unknown as ViewProps;
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !submitting,
    onMoveShouldSetPanResponder: (_, event) => !submitting && event.dy > 5 && Math.abs(event.dy) > Math.abs(event.dx),
    onPanResponderGrant: () => dragY.stopAnimation(),
    onPanResponderMove: (_, event) => dragY.setValue(Math.max(0, event.dy)),
    onPanResponderRelease: (_, event) => finishDrag(event.dy, event.vy),
    onPanResponderTerminate: resetDrag,
  }), [dragY, onClose, submitting]);

  useEffect(() => {
    if (!visible) dragY.setValue(0);
    return () => dragY.stopAnimation();
  }, [dragY, visible]);

  return <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Animated.View pointerEvents="none" style={[s.scrim, { opacity: progress }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <Animated.View testID="contribution-sheet" onAccessibilityEscape={onClose} style={[s.sheet, {
          paddingBottom: Math.max(insets.bottom, 16),
          transform: [{ translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [Math.min(420, height), 0], extrapolate: 'clamp' }), dragY) }],
        }]}>
          <View testID="contribution-sheet-drag-area" style={s.dragArea} {...(Platform.OS === 'web' ? webGesture : gesture.panHandlers)}>
            <View style={s.handle} accessible={false} />
            <View style={s.header}>
              <Text accessibilityRole="header" style={s.title}>{title}</Text>
              <Text style={s.description}>{description}</Text>
            </View>
          </View>
          <View style={s.content}>{children}</View>
          <View style={s.footer}>
            <AppPrimaryButton label={submitLabel} loading={submitting} onPress={onSubmit} fullWidth />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

export const contributionFormStyles = StyleSheet.create({
  field: { backgroundColor: ui.surface, borderRadius: 18, paddingHorizontal: 14 },
  input: { color: ui.text, fontSize: 16, fontWeight: '400', paddingVertical: 0 },
});

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: ui.scrim },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: ui.bg },
  dragArea: { paddingTop: 10, ...(Platform.OS === 'web' ? { touchAction: 'none', userSelect: 'none' } as const : {}) },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: ui.border, alignSelf: 'center', marginBottom: 12 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  title: { color: ui.textTertiary, fontSize: 12, lineHeight: 18, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  description: { color: ui.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  content: { paddingHorizontal: 20, gap: 12, flexShrink: 1, minHeight: 0 },
  footer: { paddingHorizontal: 20, paddingTop: 16 },
});
