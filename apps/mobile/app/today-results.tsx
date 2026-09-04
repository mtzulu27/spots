import { getCategoryLabel } from '@/lib/category-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIconButton, appColors } from '@/components/app-ui';
import { formatLikesCount, useLikesStore } from '@/lib/likes-store';
import { aggregatePlaceSpotsFromList, getSpotsByTypeFromList } from '@/lib/mock-spots';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useSpotsStore } from '@/lib/spots-store';

const moodMap: Record<string, string[]> = {
  'Bares y noche': ['bailar', 'vida nocturna', 'discoteca', 'rumba', 'salsa'],
  Comer: ['comer', 'restaurantes', 'algo rico', 'tengo hambre'],
  Chill: ['chill', 'plan tranqui', 'hablar'],
  Casa: ['casa', 'planes en casa'],
  Cocinar: ['casa', 'planes en casa'],
  Beber: ['tomar algo', 'cócteles', 'bar'],
  Caminar: ['caminar', 'al aire libre', 'paseo'],
  Bailar: ['bailar', 'rumba', 'vida nocturna', 'discoteca'],
  Salir: ['salir un rato', 'amigos', 'hablar'],
  Ejercicio: ['ejercicio', 'deporte', 'wellness'],
  Naturaleza: ['naturaleza', 'al aire libre', 'caminar'],
  Netflix: ['casa', 'plan tranqui'],
  Café: ['café', 'brunch', 'hablar'],
  Amigos: ['amigos', 'con amigos', 'salir un rato'],
  Familia: ['familia', 'familiar'],
  Brunch: ['brunch', 'café'],
  'Tomar algo': ['tomar algo', 'cócteles', 'bar'],
  'Sin gastar mucho': ['sin gastar mucho', 'casual', 'plan tranqui'],
};

export default function TodayResultsScreen() {
  useRelayoutSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { spots } = useSpotsStore();
  const { getLikesCount } = useLikesStore();
  const params = useLocalSearchParams<{ moods?: string | string[] }>();
  const selected = Array.isArray(params.moods)
    ? params.moods
    : params.moods?.split(',').filter(Boolean) ?? [];

  const places = aggregatePlaceSpotsFromList(getSpotsByTypeFromList(spots, 'place')).filter((spot) => {
    if (!selected.length) {
      return true;
    }

    const haystack = [
      spot.category,
      ...spot.tags,
      ...spot.moods,
      spot.shortDescription,
      spot.description,
    ]
      .join(' ')
      .toLowerCase();

    return selected.some((mood) => {
      const normalizedMood = mood.toLowerCase();
      const relatedTerms = moodMap[mood] ?? [normalizedMood];

      return [normalizedMood, ...relatedTerms].some((term) =>
        haystack.includes(term.toLowerCase()),
      );
    });
  });

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <AppIconButton name="arrow-back" onPress={() => router.back()} tone="dark" />
      <Text style={styles.headerTitle}>¿Qué hacer hoy?</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: 24 + insets.bottom,
            flexGrow: 1,
          },
        ]}
      >
        {places.map((spot) => (
          <Link key={spot.id} href={`/spot/${spot.id}`} asChild>
            <Pressable style={styles.card}>
              <ImageBackground
                source={{ uri: spot.image }}
                style={styles.image}
                imageStyle={styles.imageStyle}
              >
                <View style={styles.overlay} />
                <View style={styles.copy}>
                  <Text style={styles.title}>{spot.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.category}>{getCategoryLabel(spot.category)}</Text>
                    <Text style={styles.likes}>
                      ♡ {formatLikesCount(getLikesCount(spot.likeTargetId))}
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appColors.darkSurface,
  },
  header: {
    backgroundColor: appColors.primaryDark,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff7fb',
  },
  headerSpacer: {
    width: 38,
  },
  list: {
    flex: 1,
  },
  listContent: {
  },
  card: {
    height: 160,
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,5,8,0.32)',
  },
  copy: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: appColors.yellow,
    fontWeight: '800',
  },
  likes: {
    color: appColors.yellow,
    fontWeight: '800',
  },
});
