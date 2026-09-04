import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { getCategoryIcon } from '@/lib/category-icons';

export function CategoryIcon({ category, size = 18, color = '#141417' }: { category: string; size?: number; color?: string }) {
  if (['Vida nocturna', 'Bares y noche'].includes(category.trim())) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 1v3M3 3v4M1 5h4M21 15v4M19 17h4" />
      <Circle cx={12} cy={13} r={8} />
      <Ellipse cx={12} cy={13} rx={3.5} ry={8} />
      <Path d="M4 13h16M5.5 8.5c4 2 9 2 13 0M5.5 17.5c4-2 9-2 13 0" />
    </Svg>;
  }
  return <Ionicons name={getCategoryIcon(category)} size={size} color={color} />;
}
