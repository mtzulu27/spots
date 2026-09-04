import { useEffect, useState, type ComponentProps } from 'react';
import { ImageBackground, Platform, StyleSheet, type ImageStyle } from 'react-native';

const placeholder = require('../assets/place-placeholder.jpg');

type Props = Omit<ComponentProps<typeof ImageBackground>, 'source'> & { uri?: string | null; grayscale?: boolean };

// A local fallback also covers stale catalog URLs and offline image failures.
export function PlacePhoto({ uri, children, imageStyle, grayscale = false, ...props }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const temporary = !uri?.trim() || failed;
  return (
    <ImageBackground
      {...props}
      source={temporary ? placeholder : { uri: uri! }}
      resizeMode="cover"
      imageStyle={[imageStyle, styles.image, grayscale && Platform.OS === 'web' && ({ filter: 'grayscale(1)' } as ImageStyle)]}
      onError={() => setFailed(true)}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Bundled assets have intrinsic dimensions; constrain them to the card on web.
  image: { width: '100%', height: '100%' },
});
