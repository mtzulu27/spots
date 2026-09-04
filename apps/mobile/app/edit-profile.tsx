import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppAvatar, AppIconButton } from '@/components/app-ui';
import { accountUi as ui } from '@/lib/account-ui';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { fullName, avatarUrl, user, phone, saveProfileSetup } = useAuthStore();
  const [name, setName] = useState(fullName || user?.user_metadata?.name || 'Mateo');
  const [email, setEmail] = useState(user?.email || '');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteInfo, setDeleteInfo] = useState(false);
  async function save() {
    if (!user || !supabase) { setMessage('Inicia sesión para guardar cambios. Estás en una vista previa.'); return; }
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('Escribe tu nombre y un correo válido.'); return; }
    setBusy(true); setMessage('');
    try {
      let nextAvatar = avatarUrl ?? undefined;
      if (photo) {
        const response = await fetch(photo.uri);
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('La foto debe pesar menos de 5 MB.');
        const mime = photo.mimeType || 'image/jpeg';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('Usa una foto JPG, PNG o WebP.');
        const path = `${user.id}/${Date.now()}.${mime.split('/')[1]}`;
        const upload = await supabase.storage.from('avatars').upload(path, bytes, { contentType: mime });
        if (upload.error) throw upload.error;
        nextAvatar = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      const failure = await saveProfileSetup({ fullName: name.trim(), phone, avatarUrl: nextAvatar });
      if (failure) throw new Error(failure);
      if (email.trim() !== user.email) {
        const result = await supabase.auth.updateUser({ email: email.trim() });
        if (result.error) { setMessage('El perfil se guardó, pero no pudimos cambiar el correo. Inténtalo de nuevo.'); return; }
        setMessage('Perfil guardado. Revisa los correos de confirmación para completar el cambio de email.');
      } else setMessage('Perfil guardado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos guardar el perfil.'); }
    finally { setBusy(false); }
  }
  return <View style={{ flex: 1, backgroundColor: ui.bg }}><Stack.Screen options={{ headerShown: false }} />
    <View style={[s.header, { paddingTop: Math.max(insets.top, 16) }]}><AppIconButton name="arrow-back" tone="light" accessibilityLabel="Volver a ajustes" onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')} /><Text style={s.title}>Editar perfil</Text><View style={{ width: 44 }} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 24 }}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" style={{ alignItems: 'center', gap: 12 }} onPress={async () => {
        try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .8 }); if (!result.canceled) setPhoto(result.assets[0]); }
        catch { setMessage('No pudimos abrir tus fotos. Revisa los permisos.'); }
      }}><AppAvatar uri={photo?.uri || avatarUrl} size={84} /><Text style={{ color: ui.accent }}>Cambiar foto</Text></Pressable>
      <View style={s.group}><Text style={s.label}>Nombre completo</Text><TextInput accessibilityLabel="Nombre completo" editable={!busy} value={name} onChangeText={setName} autoComplete="name" style={s.input} /><Text style={s.label}>Correo electrónico</Text><TextInput accessibilityLabel="Correo electrónico" editable={!busy} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" style={s.input} /></View>
      {!user && <Text style={s.body}>Vista previa: inicia sesión para guardar tus datos reales.</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={s.button}><Text style={s.label}>{busy ? 'Guardando…' : 'Guardar cambios'}</Text></Pressable>
      {!!message && <Text accessibilityLiveRegion="polite" style={s.body}>{message}</Text>}
      <Pressable accessibilityRole="button" onPress={() => setDeleteInfo(value => !value)}><Text style={{ color: ui.accent }}>Eliminar cuenta permanentemente</Text></Pressable>
      {deleteInfo && <Text style={s.body}>La eliminación permanente todavía no está habilitada: requiere un servicio seguro en el backend para borrar la cuenta y sus datos. No se ha eliminado nada.</Text>}
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: ui.text },
  label: { color: ui.text, fontSize: 14, fontWeight: '500' },
  body: { color: ui.textSecondary, fontSize: 14, lineHeight: 21 },
  group: { backgroundColor: ui.surface, borderRadius: 24, padding: 18, gap: 12 },
  input: { backgroundColor: ui.bg, borderRadius: 16, padding: 14, fontSize: 14, color: ui.text },
  button: { backgroundColor: ui.accentSoft, borderRadius: 24, padding: 16, alignItems: 'center' },
});
