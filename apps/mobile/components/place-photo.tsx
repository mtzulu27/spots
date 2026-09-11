import { Children, isValidElement, useEffect, useState, type ComponentProps } from 'react';
import { ImageBackground, Platform, StyleSheet, Text, View, type ImageStyle } from 'react-native';
import { accountUi as ui } from '@/lib/account-ui';
import { getDiscoveryStatus } from '@/lib/discovery-ranking';
import type { Spot } from '@/lib/mock-spots';

type Props = Omit<ComponentProps<typeof ImageBackground>, 'source'> & { uri?: string | null; grayscale?: boolean };

export function FeedPlacePhoto({ spot, now = new Date(), children, ...props }: Omit<Props, 'uri' | 'grayscale'> & { spot: Spot; now?: Date }) {
  const { availability, label } = getDiscoveryStatus(spot, now);
  return <PlacePhoto {...props} uri={spot.image} grayscale={spot.type === 'place' && (availability === 1 || availability === 3)}>
    {children}
    {label === 'Cerrado temporalmente' && <View pointerEvents="none" style={styles.closureBadge}><Text style={styles.closureText}>{label}</Text></View>}
  </PlacePhoto>;
}

// A local fallback also covers stale catalog URLs and offline image failures.
export function PlacePhoto({ uri, children, imageStyle, grayscale = false, ...props }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const source = uri?.trim() && !failed ? { uri: uri.trim() } : undefined;
  // ImageBackground is a View on web; ignore accidental raw text children.
  const visualChildren = Children.toArray(children).filter(isValidElement);
  return (
    <ImageBackground
      {...props}
      style={[props.style, !source && styles.missingImage]}
      source={source}
      resizeMode="cover"
      imageStyle={[imageStyle, styles.image, grayscale && Platform.OS === 'web' && ({ filter: 'grayscale(1)' } as ImageStyle)]}
      onError={() => setFailed(true)}
    >
      {visualChildren}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  closureBadge: { position: 'absolute', top: 8, right: 8, maxWidth: '70%', backgroundColor: ui.surface, borderColor: ui.border, borderWidth: 1, borderRadius: 8, padding: 6 },
  closureText: { color: ui.text, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  // Bundled assets have intrinsic dimensions; constrain them to the card on web.
  image: { width: '100%', height: '100%' },
  missingImage: { backgroundColor: '#e3e3e6' },
});
