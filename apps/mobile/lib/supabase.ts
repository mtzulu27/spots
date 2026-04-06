import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const authRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;

export const backendEnabled = Boolean(supabaseUrl && supabaseAnonKey);
export const oauthRedirectUrl =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : authRedirectUrl;

export const supabase = backendEnabled
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        ...(Platform.OS === 'web'
          ? {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            }
          : {
              storage: AsyncStorage,
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
            }),
      },
    })
  : null;
