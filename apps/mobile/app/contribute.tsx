import { SpotsIcon as Ionicons } from '@/components/spots-icon';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryNavigation } from '@/components/discovery-navigation';
import { Entrance } from '@/components/entrance';
import { accountUi as ui } from '@/lib/account-ui';
import { topContentInset } from '@/lib/layout-insets';
import { SettingsListItem, settingsListStyles } from '@/components/settings-list';

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
      </Entrance>

      <Entrance index={1} trigger="contribute-feedback" style={settingsListStyles.group}>
        <SettingsListItem label="Dar feedback"
          description="Comparte ideas o reporta problemas."
          leading={<Ionicons name="chatbox-ellipses-outline" size={23} color={ui.text} />}
          trailing={<Ionicons name="chevron-forward" size={18} color={ui.textTertiary} />}
          onPress={() => openModule('feedback')} />
      </Entrance>

      <Entrance index={2} trigger="contribute-suggest" style={settingsListStyles.group}>
        <SettingsListItem label="Sugerir un lugar"
          description="Recomiéndanos nuevos lugares."
          leading={<Ionicons name="location-outline" size={23} color={ui.text} />}
          trailing={<Ionicons name="chevron-forward" size={18} color={ui.textTertiary} />}
          onPress={() => openModule('suggest')} />
      </Entrance>
    </ScrollView>
    <DiscoveryNavigation active="contribute" onExplore={() => router.replace('/explore')} onMap={() => router.replace({ pathname: '/(tabs)/explore', params: { view: 'map' } })} onParches={() => router.replace('/today')} onContribute={() => undefined} onAccount={() => router.replace('/account')} />
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ui.bg },
  content: { paddingHorizontal: 16, gap: 12 },
  intro: { marginBottom: 12 },
  title: { color: ui.text, fontSize: 24, lineHeight: 31, fontWeight: '700' },
});
