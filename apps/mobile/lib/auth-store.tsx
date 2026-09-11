import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { oauthRedirectUrl, supabase, supabaseUrl } from '@/lib/supabase';

type UserMetadata = {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  picture?: string;
  picture_url?: string;
  photo_url?: string;
  avatarUrl?: string;
  photoURL?: string;
  interests?: string[];
  profile_completed?: boolean;
  onboarding_completed?: boolean;
};

type UserIdentity = NonNullable<User['identities']>[number];

function isUsableAvatarCandidate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  return value.trim().length > 0;
}

const DEFAULT_AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80';

function scoreAvatarCandidate(url: string) {
  const normalized = url.toLowerCase();

  if (normalized.includes('supabase.co')) return 10;
  if (normalized.includes('googleusercontent.com')) return 5;
  if (normalized.includes('avatar')) return 4;
  if (normalized.includes('picture')) return 3;
  if (normalized.includes('unsplash.com')) return 0;
  return 2;
}

function collectAvatarCandidates(input: unknown, bucket: string[]) {
  if (!input) {
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((item) => collectAvatarCandidates(item, bucket));
    return;
  }

  if (typeof input !== 'object') {
    return;
  }

  Object.values(input).forEach((value) => {
    if (isUsableAvatarCandidate(value)) {
      bucket.push(value);
      return;
    }

    if (value && typeof value === 'object') {
      collectAvatarCandidates(value, bucket);
    }
  });
}

function getIdentityAvatarUrl(identity: UserIdentity | null | undefined) {
  if (!identity) {
    return null;
  }

  const identityData = (identity.identity_data ?? {}) as UserMetadata;
  const candidates: string[] = [
    identityData.avatar_url,
    identityData.picture,
    identityData.picture_url,
    identityData.photo_url,
    identityData.avatarUrl,
    identityData.photoURL,
  ].filter(isUsableAvatarCandidate);

  collectAvatarCandidates(identityData, candidates);

  return Array.from(new Set(candidates))
    .sort((left, right) => scoreAvatarCandidate(right) - scoreAvatarCandidate(left))
    .find(Boolean) ?? null;
}

function mergeSupabaseUsers(primary: User | null, secondary: User | null) {
  if (!primary) {
    return secondary;
  }

  if (!secondary) {
    return primary;
  }

  return {
    ...secondary,
    ...primary,
    app_metadata: {
      ...(secondary.app_metadata ?? {}),
      ...(primary.app_metadata ?? {}),
    },
    user_metadata: {
      ...(secondary.user_metadata ?? {}),
      ...(primary.user_metadata ?? {}),
    },
    identities: primary.identities?.length ? primary.identities : secondary.identities,
  } satisfies User;
}

function mergeSessionUser(currentSession: Session | null, nextUser: User | null) {
  if (!currentSession || !nextUser) {
    return currentSession;
  }

  return {
    ...currentSession,
    user: nextUser,
  } satisfies Session;
}

function ensureFullUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (!supabaseUrl) {
    return trimmed;
  }

  const normalizedPath = trimmed.replace(/^\/+/, '');
  return `${supabaseUrl}/storage/v1/object/public/avatars/${normalizedPath}`;
}

export function getUserAvatarUrl(user: User | null, sessionUser?: User | null) {
  const mergedUser = mergeSupabaseUsers(user, sessionUser ?? null);
  if (!mergedUser) {
    return null;
  }

  const metadata = (mergedUser?.user_metadata ?? {}) as UserMetadata;
  const appMetadata = (mergedUser?.app_metadata ?? {}) as UserMetadata;
  const identities = (mergedUser?.identities ?? []) as UserIdentity[];

  if (isUsableAvatarCandidate(metadata.avatar_url)) {
    const finalUrl = ensureFullUrl(metadata.avatar_url);
    console.log('DEBUG AVATAR STORE:', finalUrl);
    return finalUrl;
  }

  const candidates: string[] = [
    metadata.picture,
    metadata.picture_url,
    metadata.photo_url,
    metadata.avatarUrl,
    metadata.photoURL,
    appMetadata.avatar_url,
    appMetadata.picture,
    appMetadata.picture_url,
    appMetadata.photo_url,
    appMetadata.avatarUrl,
    appMetadata.photoURL,
  ].filter(isUsableAvatarCandidate);

  identities
    .map((identity) => getIdentityAvatarUrl(identity))
    .filter(isUsableAvatarCandidate)
    .forEach((candidate) => candidates.push(candidate));

  collectAvatarCandidates(identities, candidates);
  collectAvatarCandidates(mergedUser?.user_metadata ?? {}, candidates);
  collectAvatarCandidates(mergedUser?.app_metadata ?? {}, candidates);

  const avatarCandidate = Array.from(new Set(candidates))
    .sort((left, right) => scoreAvatarCandidate(right) - scoreAvatarCandidate(left))
    .find(Boolean);

  if (avatarCandidate === DEFAULT_AVATAR_FALLBACK) {
    return null;
  }

  const finalUrl = ensureFullUrl(avatarCandidate);
  console.log('DEBUG AVATAR STORE:', finalUrl);
  return finalUrl;
}

type AuthStoreValue = {
  session: Session | null;
  user: User | null;
  avatarUrl: string | null;
  loading: boolean;
  fullName: string;
  phone: string;
  interests: string[];
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<string | null>;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<
    | { status: 'signed_in'; error: null }
    | { status: 'confirmation_required'; error: null }
    | { status: 'error'; error: string }
  >;
  sendPasswordReset: (email: string) => Promise<string | null>;
  saveProfileSetup: (payload: {
    fullName: string;
    phone: string;
    avatarUrl?: string;
    interests?: string[];
  }) => Promise<string | null>;
  saveAvatarUrl: (avatarUrl: string | null) => Promise<string | null>;
  saveInterests: (interests: string[]) => Promise<string | null>;
  completeOnboarding: () => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const AuthStoreContext = createContext<AuthStoreValue>({
  session: null,
  user: null,
  avatarUrl: null,
  loading: true,
  fullName: '',
  phone: '',
  interests: [],
  profileCompleted: false,
  onboardingCompleted: false,
  signInWithEmail: async () => 'Supabase no esta configurado',
  signInWithProvider: async () => 'Supabase no esta configurado',
  signUpWithEmail: async () => ({
    status: 'error',
    error: 'Supabase no esta configurado',
  }),
  sendPasswordReset: async () => 'Supabase no esta configurado',
  saveProfileSetup: async () => 'Supabase no esta configurado',
  saveAvatarUrl: async () => 'Supabase no esta configurado',
  saveInterests: async () => 'Supabase no esta configurado',
  completeOnboarding: async () => 'Supabase no esta configurado',
  signOut: async () => null,
});

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let active = true;
    const loadingTimeout = setTimeout(() => {
      if (active) {
        setLoading(false);
      }
    }, 2500);

    async function bootstrapSession() {
      try {
        const { data: sessionData } = await client.auth.getSession();
        let userData: Awaited<ReturnType<typeof client.auth.getUser>>['data'] | null = null;

        try {
          const result = await client.auth.getUser();
          userData = result.data;
        } catch (error) {
          // iPhone PWA can be more fragile after resume/deploy; keep booting with
          // session data even if the explicit user fetch fails transiently.
          console.error('[auth-store] getUser failed during bootstrap', error);
        }

        if (active) {
          const resolvedUser = mergeSupabaseUsers(
            userData?.user ?? sessionData.session?.user ?? null,
            null,
          );
          const resolvedSession = sessionData.session && resolvedUser ? sessionData.session : null;
          setSession(resolvedSession);
          setUser(resolvedSession ? resolvedUser : null);
        }
      } catch (error) {
        console.error('[auth-store] bootstrapSession failed', error);
        if (active) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
        clearTimeout(loadingTimeout);
      }
    }

    bootstrapSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      try {
        if (!active) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('[auth-store] onAuthStateChange failed', error);
      }
    });

    return () => {
      active = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const metadata = (user?.user_metadata ?? {}) as UserMetadata;
  const avatarUrl = getUserAvatarUrl(user, session?.user ?? null);

  const value = useMemo<AuthStoreValue>(
    () => ({
      session,
      user,
      avatarUrl,
      loading,
      fullName: metadata.full_name ?? '',
      phone: metadata.phone ?? '',
      interests: metadata.interests ?? [],
      profileCompleted: Boolean(metadata.profile_completed),
      onboardingCompleted: Boolean(metadata.onboarding_completed),
      async signInWithEmail(email, password) {
        if (!supabase) {
          return 'Supabase no esta configurado';
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return error?.message ?? null;
      },
      async signInWithProvider(provider) {
        if (!supabase) {
          return 'Supabase no esta configurado';
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: oauthRedirectUrl ? { redirectTo: oauthRedirectUrl } : undefined,
        });

        return error?.message ?? null;
      },
      async signUpWithEmail(email, password) {
        if (!supabase) {
          return {
            status: 'error',
            error: 'Supabase no esta configurado',
          } as const;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              profile_completed: false,
              onboarding_completed: false,
              interests: [],
            },
          },
        });

        if (error) {
          return { status: 'error', error: error.message } as const;
        }

        if (!data.session) {
          return { status: 'confirmation_required', error: null } as const;
        }

        return { status: 'signed_in', error: null } as const;
      },
      async sendPasswordReset(email) {
        if (!supabase) {
          return 'Supabase no esta configurado';
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error?.message ?? null;
      },
      async saveProfileSetup(payload) {
        if (!supabase || !user) {
          return 'No hay sesion activa';
        }

        const resolvedAvatarUrl = payload.avatarUrl ?? getUserAvatarUrl(user, session?.user ?? null);
        const nextUserData: UserMetadata = {
          ...metadata,
          full_name: payload.fullName,
          phone: payload.phone,
          profile_completed: true,
          interests: payload.interests ?? metadata.interests ?? [],
        };

        if (isUsableAvatarCandidate(resolvedAvatarUrl)) {
          nextUserData.avatar_url = resolvedAvatarUrl;
        }

        const { data, error } = await supabase.auth.updateUser({
          data: nextUserData,
        });

        if (!error && data.user) {
          const nextResolvedUser = mergeSupabaseUsers(data.user, session?.user ?? null);
          setUser(nextResolvedUser);
          setSession((currentSession) => mergeSessionUser(currentSession, nextResolvedUser));
        }

        return error?.message ?? null;
      },
      async saveAvatarUrl(nextAvatarUrl) {
        if (!supabase || !user) {
          return 'No hay sesion activa';
        }

        const nextUserData: UserMetadata = {
          ...metadata,
        };

        if (isUsableAvatarCandidate(nextAvatarUrl)) {
          nextUserData.avatar_url = nextAvatarUrl;
        } else {
          delete nextUserData.avatar_url;
        }

        const { data, error } = await supabase.auth.updateUser({
          data: nextUserData,
        });

        if (!error && data.user) {
          const nextResolvedUser = mergeSupabaseUsers(data.user, session?.user ?? null);
          setUser(nextResolvedUser);
          setSession((currentSession) => mergeSessionUser(currentSession, nextResolvedUser));
        }

        return error?.message ?? null;
      },
      async saveInterests(nextInterests) {
        if (!supabase || !user) {
          return 'No hay sesion activa';
        }

        const { data: latestUserData } = await supabase.auth.getUser();
        const latestUser = mergeSupabaseUsers(latestUserData.user ?? null, session?.user ?? null);
        const latestMetadata = ((latestUser?.user_metadata ?? {}) as UserMetadata);

        const { data, error } = await supabase.auth.updateUser({
          data: {
            ...latestMetadata,
            interests: nextInterests,
          },
        });

        if (!error && data.user) {
          const nextResolvedUser = mergeSupabaseUsers(data.user, session?.user ?? null);
          setUser(nextResolvedUser);
          setSession((currentSession) => mergeSessionUser(currentSession, nextResolvedUser));
        }

        return error?.message ?? null;
      },
      async completeOnboarding() {
        if (!supabase || !user) {
          return 'No hay sesion activa';
        }

        const { data, error } = await supabase.auth.updateUser({
          data: {
            ...metadata,
            onboarding_completed: true,
          },
        });

        if (!error && data.user) {
          const nextResolvedUser = mergeSupabaseUsers(data.user, session?.user ?? null);
          setUser(nextResolvedUser);
          setSession((currentSession) => mergeSessionUser(currentSession, nextResolvedUser));
        }

        return error?.message ?? null;
      },
      async signOut() {
        if (!supabase) {
          setSession(null);
          setUser(null);
          return null;
        }

        const { error } = await supabase.auth.signOut();
        setSession(null);
        setUser(null);

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const storages = [window.localStorage, window.sessionStorage];
            for (const storage of storages) {
              const keysToRemove: string[] = [];
              for (let index = 0; index < storage.length; index += 1) {
                const key = storage.key(index);
                if (!key) continue;
                if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token')) {
                  keysToRemove.push(key);
                }
              }

              keysToRemove.forEach((key) => storage.removeItem(key));
            }
          } catch (storageError) {
            console.error('[auth-store] storage cleanup failed during signOut', storageError);
          }
        }

        return error?.message ?? null;
      },
    }),
    [avatarUrl, loading, metadata, session, user],
  );

  return (
    <AuthStoreContext.Provider value={value}>
      {children}
    </AuthStoreContext.Provider>
  );
}

export function useAuthStore() {
  return useContext(AuthStoreContext);
}
