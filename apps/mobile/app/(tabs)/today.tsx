import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppChip,
  AppIconButton,
  AppPrimaryButton,
  AppSecondaryButton,
  appColors,
} from '@/components/app-ui';
import { useRelayoutSubscription } from '@/lib/relayout';

const moods = [
  'Rumba',
  'Comer',
  'Chill',
  'Casa',
  'Cocinar',
  'Beber',
  'Caminar',
  'Bailar',
  'Salir',
  'Ejercicio',
  'Naturaleza',
  'Netflix',
  'Café',
  'Amigos',
  'Familia',
  'Brunch',
  'Tomar algo',
  'Sin gastar mucho',
];

export default function TodayScreen() {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);

  function toggleMood(value: string) {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: 110 + insets.bottom,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>¿Qué hacer hoy?</Text>
          <AppIconButton
            name="close"
            onPress={() => router.replace('/(tabs)/explore')}
          />
        </View>

        <Text style={styles.prompt}>Hoy tengo ganas de...</Text>

        <View style={styles.chips}>
          {moods.map((item) => (
            <AppChip
              key={item}
              label={item}
              active={selected.includes(item)}
              onPress={() => toggleMood(item)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <AppSecondaryButton
            label="Atras"
            onPress={() => router.replace('/(tabs)/explore')}
          />
          <AppPrimaryButton
            label={`Aplicar${selected.length ? ` (${selected.length})` : ''}`}
            onPress={() =>
              router.push({
                pathname: '/today-results',
                params: { moods: selected.join(',') },
              })
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    gap: 28,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: appColors.primaryDark,
  },
  prompt: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 22,
    color: '#b2a9b4',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  footer: {
    marginTop: 'auto',
    gap: 12,
  },
});
