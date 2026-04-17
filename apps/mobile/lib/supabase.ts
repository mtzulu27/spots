import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const authRedirectUrl = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
const isIOSWeb =
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const webSessionMemory = new Map<string, string>();

const safeWebStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') {
      return webSessionMemory.get(key) ?? null;
    }

    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        webSessionMemory.set(key, value);
      }
      return value;
    } catch {
      return webSessionMemory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    webSessionMemory.set(key, value);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, value);
    } catch {
      // iPhone PWA can fail localStorage writes; keep an in-memory fallback
    }
  },
  removeItem(key: string) {
    webSessionMemory.delete(key);

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage cleanup failures
    }
  },
};

export const backendEnabled = Boolean(supabaseUrl && supabaseAnonKey);
export const oauthRedirectUrl =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : authRedirectUrl;

const webAuthOptions = isIOSWeb
  ? {
      storage: safeWebStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    }
  : {
      storage: safeWebStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    };

export const supabase = backendEnabled
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        ...(Platform.OS === 'web'
          ? webAuthOptions
          : {
              storage: AsyncStorage,
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
            }),
      },
    })
  : null;
