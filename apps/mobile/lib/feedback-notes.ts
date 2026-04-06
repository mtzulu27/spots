import { Platform } from 'react-native';
import { backendEnabled, supabase } from '@/lib/supabase';

type SubmitFeedbackNoteInput = {
  note: string;
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
};

function normalizeNote(value: string) {
  return value.trim();
}

export async function submitFeedbackNote({
  note,
  userId,
  fullName,
  email,
}: SubmitFeedbackNoteInput) {
  const normalizedNote = normalizeNote(note);

  if (!normalizedNote) {
    throw new Error('Escribe tu feedback antes de enviarlo.');
  }

  if (!backendEnabled || !supabase) {
    throw new Error('El backend no está disponible en este momento.');
  }

  const { error } = await supabase.from('feedback_notes').insert({
    submitted_by_user_id: userId ?? null,
    submitted_by_name: fullName?.trim() || null,
    submitted_by_email: email?.trim() || null,
    source: 'explore',
    status: 'pending',
    note: normalizedNote,
    metadata: {
      platform: Platform.OS,
    },
  });

  if (!error) {
    return;
  }

  if (error.message.toLowerCase().includes('feedback_notes')) {
    throw new Error(
      'Falta crear la tabla de feedback en Supabase antes de usar este formulario.',
    );
  }

  throw new Error(error.message || 'No pudimos guardar tu feedback.');
}
