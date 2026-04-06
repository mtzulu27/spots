import { Platform } from 'react-native';
import { backendEnabled, supabase } from '@/lib/supabase';

type SubmitPlaceSuggestionInput = {
  places: string[];
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
};

function normalizePlaces(values: string[]) {
  return values
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function submitPlaceSuggestion({
  places,
  userId,
  fullName,
  email,
}: SubmitPlaceSuggestionInput) {
  const normalizedPlaces = normalizePlaces(places);

  if (!normalizedPlaces.length) {
    throw new Error('Agrega al menos un lugar para enviar la sugerencia.');
  }

  if (!backendEnabled || !supabase) {
    throw new Error('El backend no está disponible en este momento.');
  }

  const { error } = await supabase.from('place_suggestions').insert({
    submitted_by_user_id: userId ?? null,
    submitted_by_name: fullName?.trim() || null,
    submitted_by_email: email?.trim() || null,
    source: 'explore',
    status: 'pending',
    suggested_places: normalizedPlaces,
    suggested_count: normalizedPlaces.length,
    metadata: {
      platform: Platform.OS,
    },
  });

  if (!error) {
    return;
  }

  if (error.message.toLowerCase().includes('place_suggestions')) {
    throw new Error(
      'Falta crear la tabla de sugerencias en Supabase antes de usar este formulario.',
    );
  }

  throw new Error(error.message || 'No pudimos enviar tu sugerencia.');
}
