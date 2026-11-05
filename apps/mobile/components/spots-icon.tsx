import { Ionicons as BrandIcon } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, type SvgProps } from 'react-native-svg';
import { resolveSpotsGlyph } from '@/lib/spots-icon-map';
import { spotsIconPaths } from '@/lib/spots-icon-paths';

type BrandIconProps = ComponentProps<typeof BrandIcon>;
type Props = Omit<BrandIconProps, 'name'> & {
  name: BrandIconProps['name'] | 'board-pin';
};

export function SpotsIcon({ name, size = 24, color = '#141417', style, ...rest }: Props) {
  const glyph = resolveSpotsGlyph(name);
  // External brand marks and future unmapped names retain their original identity.
  if (!glyph) return <BrandIcon name={name as BrandIconProps['name']} size={size} color={color} style={style} {...rest} />;
  return <Svg
    {...rest as SvgProps}
    testID={rest.testID ?? `spots-icon-${glyph}`}
    accessible={Platform.OS === 'web' ? undefined : rest.accessible ?? Boolean(rest.accessibilityLabel)}
    aria-hidden={!(rest.accessible ?? Boolean(rest.accessibilityLabel))}
    width={size} height={size} viewBox="0 0 32 32"
    fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    style={style as StyleProp<ViewStyle>}
  >
    {spotsIconPaths[glyph].map((d, index) => <Path key={index} d={d} />)}
  </Svg>;
}

// Preserve the existing name type contract in shared buttons and category helpers.
SpotsIcon.glyphMap = BrandIcon.glyphMap;
