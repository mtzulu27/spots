import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';
import { getWebPushSnapshot, subscribeToWebPush, unsubscribeFromWebPush, sendWebPushSelfTest, type WebPushSnapshot } from '@/lib/web-push';

export function PushControls({ compact = false }: { compact?: boolean }) {
  const [snapshot, setSnapshot] = useState<WebPushSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Comprobando notificaciones de este dispositivo...');
  useEffect(() => {
    let alive = true;
    if (Platform.OS !== 'web') return;
    getWebPushSnapshot().then(value => {
      if (!alive) return;
      setSnapshot(value);
      setMessage(!value.installed ? 'Abre Spots desde el icono de la pantalla de inicio.' : !value.supported ? 'Este navegador no admite push. Usa la app instalada con HTTPS.' : value.subscribed ? 'Activadas en este dispositivo. Puedes enviar una prueba.' : 'Recibe avisos aunque cierres Spots. Activarlos es opcional.');
    }).catch(error => { if (alive) setMessage(error.message); });
    return () => { alive = false; };
  }, []);
  if (Platform.OS !== 'web') return null;
  const run = async (action: 'enable' | 'test' | 'disable') => {
    if (busy) return;
    setBusy(true);
    try {
      if (action === 'enable') await subscribeToWebPush();
      else if (action === 'disable') await unsubscribeFromWebPush();
      else await sendWebPushSelfTest();
      setSnapshot(await getWebPushSnapshot());
      setMessage(action === 'enable' ? 'Activadas. Toca Enviar prueba para comprobar la entrega.' : action === 'disable' ? 'Desactivadas en este dispositivo.' : 'Envio aceptado. Revisa el Centro de notificaciones del iPhone.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos completar la solicitud.'); }
    finally { setBusy(false); }
  };
  return <View style={[s.box, compact && s.compactBox]}>
    {!compact && <Text style={s.title}>Avisos fuera de la app</Text>}
    <Text accessibilityLiveRegion="polite" style={s.text}>{message}</Text>
    {snapshot?.supported && snapshot.installed && <View style={s.actions}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => run(snapshot.subscribed ? 'test' : 'enable')} style={[s.button, compact && s.largeButton, busy && { opacity: 0.5 }]}>
        <Text style={s.label}>{busy ? 'Procesando...' : snapshot.subscribed ? 'Enviar prueba' : 'Activar notificaciones'}</Text>
      </Pressable>
      {snapshot.subscribed && <Pressable accessibilityRole="button" disabled={busy} onPress={() => run('disable')} style={s.button}><Text style={s.label}>Desactivar</Text></Pressable>}
    </View>}
  </View>;
}
const s = StyleSheet.create({
  box: { paddingBottom: 16, gap: 8 },
  compactBox: { padding: 20, backgroundColor: ui.surfaceMuted, borderRadius: 20, marginTop: 16 },
  title: { color: ui.text, fontSize: 14, fontWeight: '600' },
  text: { color: ui.textSecondary, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { backgroundColor: ui.surfaceMuted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44 },
  largeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, backgroundColor: ui.accentSoft },
  label: { color: ui.text, fontSize: 13, fontWeight: '600' },
});
