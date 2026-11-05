import { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { discoverySurfaceShadow } from '@/lib/discovery-surface';
import { getIbizaAnnouncementLayout } from '@/lib/home-announcement-layout';
import { FlatSpotsMark } from './spots-logo';
import { SpotsIcon } from './spots-icon';

const food = require('../assets/home-announcement/ibiza-food-cutout.png');
const tenantLogos = [
  require('../assets/home-announcement/constantina.jpg'),
  require('../assets/home-announcement/braun.jpg'),
  require('../assets/home-announcement/bonne.jpg'),
  require('../assets/home-announcement/brazz.jpg'),
  require('../assets/home-announcement/el-santo.jpg'),
  require('../assets/home-announcement/lorso.jpg'),
];

export function HomeAnnouncementBanner({ onPress }: { onPress: () => void }) {
  const [width, setWidth] = useState(350);
  const layout = getIbizaAnnouncementLayout(width);
  return <View style={s.surface}>
    <Pressable
      testID="home-ibiza-announcement"
      accessibilityRole="button"
      accessibilityLabel="¿Ya conocés Ibiza 122? Tu próximo parche empieza por acá."
      accessibilityHint="Ver los lugares de Ibiza 122"
      onPress={onPress}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={s.card}
    >
      {({ pressed }) => <View style={s.artwork} pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[s.watermark, { left: layout.brandLeft, width: layout.brandWidth, height: layout.brandHeight }]}>
          <FlatSpotsMark color="#12474F" width={layout.brandWidth} height={layout.brandHeight} />
        </View>
        <Image source={food} resizeMode="contain" style={{ position: 'absolute', width: layout.imageWidth, height: layout.imageHeight, left: layout.imageLeft, top: layout.imageTop }} />
        <View style={[s.message, { left: layout.messageLeft, right: layout.messageRight, top: layout.messageTop }]}>
          <Text numberOfLines={1} style={[s.lead, { fontSize: layout.leadSize, lineHeight: layout.leadLineHeight, paddingLeft: layout.textInset }]}>¿Ya conocés</Text>
          <View style={[s.destination, { paddingHorizontal: layout.destinationPaddingX, paddingTop: layout.destinationPaddingTop, paddingBottom: layout.destinationPaddingBottom }]}>
            <Text numberOfLines={1} style={[s.destinationText, { fontSize: layout.destinationSize, lineHeight: layout.destinationLineHeight }]}>Ibiza 122?</Text>
          </View>
          <Text style={[s.support, { paddingLeft: layout.textInset, fontSize: layout.supportSize, lineHeight: layout.supportLineHeight }]}>{'Tu próximo parche\nempieza por acá.'}</Text>
        </View>
        <View style={[s.logos, { left: layout.logoLeft }]}>
          {tenantLogos.map((source, index) => <Image key={index} source={source} resizeMode="cover" style={[s.logo, { width: layout.logoSize, height: layout.logoSize, marginLeft: index ? -7 : 0 }]} />)}
        </View>
        <View style={[s.arrow, { right: layout.arrowRight, transform: [{ translateX: pressed ? 2 : 0 }] }]}><SpotsIcon name="arrow-forward" size={20} color="#FFFFFF" /></View>
      </View>}
    </Pressable>
  </View>;
}

const s = StyleSheet.create({
  surface: { height: 200, flexShrink: 0, borderRadius: 16, backgroundColor: '#F1EDCF', ...discoverySurfaceShadow },
  card: { height: 200, width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#F1EDCF' },
  artwork: { ...StyleSheet.absoluteFillObject },
  watermark: { position: 'absolute', top: -72, opacity: 0.07, transform: [{ rotate: '-24deg' }] },
  message: { position: 'absolute', gap: 8, alignItems: 'flex-start' },
  lead: { fontWeight: '400', letterSpacing: -0.4, color: '#12474F' },
  destination: { maxWidth: '100%', borderRadius: 24, backgroundColor: '#EF3857' },
  destinationText: { fontWeight: '600', letterSpacing: -0.7, color: '#FFFFFF' },
  support: { fontWeight: '400', color: '#12474F' },
  logos: { position: 'absolute', bottom: 14, flexDirection: 'row', alignItems: 'center' },
  logo: { position: 'relative', borderRadius: 999, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF', ...(Platform.OS === 'web' ? { boxShadow: '0px 2px 5px rgba(0,0,0,.08)' } : {}) },
  arrow: { position: 'absolute', bottom: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF3857' },
});
