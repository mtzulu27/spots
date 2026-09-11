import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryNavigation } from '@/components/discovery-navigation';
import { Entrance } from '@/components/entrance';
import { accountUi as ui } from '@/lib/account-ui';
import { topContentInset } from '@/lib/layout-insets';

export default function ContributeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function openModule(action: 'feedback' | 'suggest') {
    router.replace({ pathname: '/(tabs)/explore', params: { action } });
  }

  return <View style={s.screen}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: topContentInset(insets), paddingBottom: insets.bottom + 112 }]}> 
      <Entrance style={s.intro} trigger="contribute-intro">
        <Text accessibilityRole="header" style={s.title}>Aporta a Spots</Text>
        <Text style={s.copy}>Cuéntanos qué podemos mejorar o ayúdanos a descubrir un lugar que todavía no está.</Text>
      </Entrance>

      <Entrance index={1} trigger="contribute-feedback">
        <Pressable accessibilityRole="button" onPress={() => openModule('feedback')} style={({ pressed }) => [s.module, pressed && s.pressed]}>
          <View style={s.iconWrap}><Ionicons name="chatbox-ellipses-outline" size={25} color={ui.text} /></View>
          <View style={s.moduleCopy}>
            <Text style={s.moduleTitle}>Dar feedback</Text>
            <Text style={s.moduleMeta}>Comparte una idea, reporta un problema o dinos qué mejorarías.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={ui.textSecondary} />
        </Pressable>
      </Entrance>

      <Entrance index={2} trigger="contribute-suggest">
        <Pressable accessibilityRole="button" onPress={() => openModule('suggest')} style={({ pressed }) => [s.module, pressed && s.pressed]}>
          <View style={[s.iconWrap, s.iconWrapAccent]}><Ionicons name="location-outline" size={25} color={ui.accent} /></View>
          <View style={s.moduleCopy}>
            <Text style={s.moduleTitle}>Sugerir un lugar</Text>
            <Text style={s.moduleMeta}>Déjanos uno o varios nombres para investigarlos y añadirlos.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={ui.textSecondary} />
        </Pressable>
      </Entrance>
    </ScrollView>
    <DiscoveryNavigation active="contribute" onExplore={() => router.replace('/explore')} onMap={() => router.replace({ pathname: '/(tabs)/explore', params: { view: 'map' } })} onParches={() => router.replace('/today')} onContribute={() => undefined} onAccount={() => router.replace('/account')} />
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  content: { paddingHorizontal: 20, gap: 16 },
  intro: { gap: 8, marginBottom: 8 },
  title: { color: ui.text, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  copy: { color: ui.textSecondary, fontSize: 14, lineHeight: 21, maxWidth: 420 },
  module: { minHeight: 112, borderRadius: 20, backgroundColor: ui.surface, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pressed: { opacity: 0.72 },
  iconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: ui.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  iconWrapAccent: { backgroundColor: ui.accentSoft },
  moduleCopy: { flex: 1, minWidth: 0, gap: 4 },
  moduleTitle: { color: ui.text, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  moduleMeta: { color: ui.textSecondary, fontSize: 12, lineHeight: 18 },
});
