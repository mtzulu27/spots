import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getBranchLocationLabel, type Spot } from '@/lib/mock-spots';

type ExploreMapProps = {
  spots: Spot[];
  onOpenSpot: (spotId: string) => void;
  onVisibleSpotsChange?: (spotIds: string[]) => void;
  fullscreen?: boolean;
  selectedSpotId?: string;
  focusKey?: number;
  onSelectSpot?: (id: string) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  recenterKey?: number;
  onBackgroundPress?: () => void;
  onUserMove?: () => void;
};

export function ExploreMap({ spots, onOpenSpot, onVisibleSpotsChange }: ExploreMapProps) {
  const previousIdsRef = useRef('');
  const spotIds = useMemo(() => spots.map((spot) => spot.id), [spots]);

  useEffect(() => {
    if (!onVisibleSpotsChange) return;
    const nextSignature = spotIds.join('|');
    if (previousIdsRef.current === nextSignature) {
      return;
    }

    previousIdsRef.current = nextSignature;
    onVisibleSpotsChange(spotIds);
  }, [onVisibleSpotsChange, spotIds]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa disponible en web</Text>
      <Text style={styles.copy}>
        Para esta fase, el mapa navegable completo vive en la versión web/PWA de Spots.
      </Text>
      {spots.slice(0, 5).map((spot) => (
        <Pressable
          key={spot.id}
          style={styles.item}
          onPress={() => onOpenSpot(spot.id)}
        >
          <Text style={styles.itemTitle}>{spot.type === 'event' ? spot.name : spot.brandName}</Text>
          <Text style={styles.itemMeta}>{getBranchLocationLabel(spot)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#f7f2f7',
    padding: 18,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#231725',
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7d6e80',
  },
  item: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#231725',
  },
  itemMeta: {
    fontSize: 13,
    color: '#7d6e80',
  },
});
