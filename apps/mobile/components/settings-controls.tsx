import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useUserPreferences } from '@/lib/user-preferences';
import { accountUi as ui } from '@/lib/account-ui';
import { AppToggle } from '@/components/app-toggle';
import { SettingsDivider, SettingsListItem, settingsListStyles } from '@/components/settings-list';
import { Ionicons } from '@expo/vector-icons';
import { PushControls } from './push-controls';

const faqs = [
  ['¿Cómo encuentro un plan?', 'Busca por nombre, categoría o zona en Explore. En el mapa puedes acercarte a una zona y consultar las sedes.'],
  ['¿Cómo marco que un lugar me gusta?', 'Toca el corazón de una tarjeta. Lo encontrarás en Me gusta, dentro de Mi cuenta.'],
  ['¿Por qué no aparece mi ubicación?', 'Revisa el permiso de ubicación del navegador y del dispositivo. Puedes seguir explorando sin compartir tu ubicación.'],
  ['¿Los horarios y precios son definitivos?', 'Son orientativos y pueden cambiar. Confirma con el lugar antes de desplazarte.'],
  ['¿Cómo sugiero un lugar o reporto un problema?', 'En la navegación de Explore encontrarás accesos para sugerir lugares y dejar feedback.'],
];
export function SettingsControls({ title }: { title: string }) {
  const { preferences, updatePreferences } = useUserPreferences();
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState('');
  const save = (patch: Parameters<typeof updatePreferences>[0]) => { setError(''); void updatePreferences(patch).catch(() => setError('No pudimos guardar la preferencia. Inténtalo de nuevo.')); };
  const text = settingsListStyles.body;
  return <View>
    {title === 'Notificaciones' && <>{([
      ['newPlace', 'Nuevos lugares'], ['newBranch', 'Nuevas sedes'], ['updatedPlace', 'Actualizaciones de lugares'], ['newReview', 'Nuevas reseñas'],
    ] as const).map(([key, label], index) => <View key={key}>
      {index > 0 && <SettingsDivider />}
      <SettingsListItem label={label} trailing={<AppToggle label={label} value={preferences[key]} onValueChange={(value) => save({ [key]: value })} />} />
    </View>)}<SettingsDivider /><PushControls compact /></>}
    {title === 'Rango de búsqueda' && <><View style={settingsListStyles.detail}><Text style={text}>Distancia para sugerir lugares cercanos en Explore. Se aplica cuando tu ubicación está disponible.</Text></View><SettingsDivider /><View style={[settingsListStyles.detail, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>{[2, 5, 10, 25, 50].map(radius => <Pressable key={radius} accessibilityRole="radio" accessibilityState={{ checked: radius === preferences.radius }} onPress={() => save({ radius })} style={{ padding: 12, borderRadius: 20, backgroundColor: radius === preferences.radius ? ui.accentSoft : ui.surfaceMuted }}><Text style={[text, { color: ui.text }]}>{radius} km</Text></Pressable>)}</View></>}
    {title === 'Apariencia' && <><SettingsListItem label="Modo oscuro" trailing={<AppToggle label="Modo oscuro" value={preferences.dark} onValueChange={dark => save({ dark })} />} /><SettingsDivider /><View style={settingsListStyles.detail}><View style={{ backgroundColor: ui.surfaceMuted, padding: 18, borderRadius: 18 }}><Text style={{ color: ui.text, fontSize: 16, lineHeight: 22 }}>Spots</Text><Text style={{ color: ui.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 }}>Un lugar para tu próximo plan</Text></View><Text style={[text, { marginTop: 14 }]}>La apariencia se aplica en toda la aplicación y se conserva al volver.</Text></View></>}
    {title === 'Ayuda y soporte' && faqs.map(([question, answer], index) => <View key={question}>{index > 0 && <SettingsDivider />}<SettingsListItem label={question} accessibilityState={{ expanded: open === index }} onPress={() => setOpen(open === index ? null : index)} trailing={<Ionicons name={open === index ? 'chevron-up' : 'chevron-down'} size={18} color={ui.textTertiary} />} />{open === index && <View style={[settingsListStyles.detail, { paddingTop: 0 }]}><Text style={text}>{answer}</Text></View>}</View>)}
    {!!error && <View style={settingsListStyles.detail}><Text accessibilityLiveRegion="polite" style={text}>{error}</Text></View>}
  </View>;
}
