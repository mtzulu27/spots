import type { Ionicons } from '@expo/vector-icons';

const categoryLabels: Record<string, string> = {
  Restaurantes: 'Comida',
  'Restaurantes y cafés': 'Comida',
  'Bares y noche': 'Vida nocturna',
  'Deporte y bienestar': 'Bienestar',
  'Naturaleza y aire libre': 'Al aire libre',
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category.trim()] ?? category.trim();
}

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Comida: 'restaurant-outline',
  Restaurantes: 'restaurant-outline',
  'Restaurantes y cafés': 'restaurant-outline',
  'Arte y cultura': 'color-palette-outline',
  'Tomar algo': 'wine-outline',
  'Vida nocturna': 'disc-outline',
  'Bares y noche': 'disc-outline',
  Bienestar: 'barbell-outline',
  'Deporte y bienestar': 'barbell-outline',
  'Al aire libre': 'leaf-outline',
  'Naturaleza y aire libre': 'leaf-outline',
  Familiar: 'people-outline',
  'Pet friendly': 'paw-outline',
  Cine: 'film-outline',
  Eventos: 'ticket-outline',
};

export function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return icons[category.trim()] ?? 'pricetag-outline';
}
