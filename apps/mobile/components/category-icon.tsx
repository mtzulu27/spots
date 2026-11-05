import { SpotsIcon as Ionicons } from '@/components/spots-icon';
import { getCategoryIcon } from '@/lib/category-icons';

export function CategoryIcon({ category, size = 18, color = '#141417' }: { category: string; size?: number; color?: string }) {
  return <Ionicons name={getCategoryIcon(category)} size={size} color={color} />;
}
