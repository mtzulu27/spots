import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { AppIconButton } from './app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import type { Spot } from '@/lib/mock-spots';

export function SharePlaceButton({ spot }: { spot: Spot }) {
  const [fallback, setFallback] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const path = `/spot/${encodeURIComponent(spot.id)}`;
  const origin = process.env.EXPO_PUBLIC_SITE_URL || (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '');
  const url = origin ? `${origin.replace(/\/$/, '')}${path}` : Linking.createURL(path);
  const title = `${spot.brandName || spot.name} en Spots`;

  async function share() {
    if (busy.current) return;
    busy.current = true;
    setMessage('');
    try {
      if (Platform.OS !== 'web') {
        await Share.share({ title, message: `Mira este lugar en Spots: ${url}`, ...(Platform.OS === 'ios' ? { url } : {}) });
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ title, text: 'Mira este lugar en Spots', url });
      } else {
        setFallback(true);
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('No se pudo abrir el panel de compartir. Puedes usar este enlace.');
        setFallback(true);
      }
    } finally { busy.current = false; }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Enlace copiado');
    } catch {
      setMessage('Selecciona el enlace para copiarlo manualmente.');
    }
  }

  return <>
    <AppIconButton name="share-social-outline" tone="light" accessibilityLabel="Compartir lugar" onPress={() => void share()} />
    <Modal visible={fallback} transparent animationType="fade" onRequestClose={() => setFallback(false)}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cerrar compartir" onPress={() => setFallback(false)} />
        <View style={s.panel} accessibilityViewIsModal>
          <View style={s.row}><Text style={s.title}>Compartir lugar</Text><AppIconButton name="close" tone="light" accessibilityLabel="Cerrar compartir" onPress={() => setFallback(false)} /></View>
          <Text style={s.name}>{spot.brandName || spot.name}</Text>
          <View style={s.linkField}>
            <Text selectable style={s.link}>{url}</Text>
            {Platform.OS === 'web' && <Pressable accessibilityRole="button" accessibilityLabel="Copiar enlace" onPress={() => void copy()} style={s.copy}>
              <Ionicons name={message === 'Enlace copiado' ? 'checkmark-outline' : 'copy-outline'} size={19} color={ui.text} />
            </Pressable>}
          </View>
          {message ? <Text accessibilityLiveRegion="polite" style={s.meta}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(20,20,23,.35)' },
  panel: { width: '100%', maxWidth: 420, padding: 20, gap: 16, borderRadius: 24, backgroundColor: ui.surface },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '600', color: ui.text },
  name: { fontSize: 14, fontWeight: '600', color: ui.text },
  linkField: { flexDirection: 'row', alignItems: 'center', backgroundColor: ui.surfaceMuted, borderRadius: 12, paddingLeft: 12, paddingRight: 4, gap: 8, minHeight: 48 },
  link: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 14, color: ui.textSecondary },
  copy: { width: 44, height: 44, flexShrink: 0, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  meta: { fontSize: 12, lineHeight: 18, color: ui.textSecondary },
});
