export const DESKTOP_AUTH_MIN_WIDTH = 900;

// Temporary navigation policy; never persist completion flags for skipped steps.
export const SKIP_DESKTOP_ACCOUNT_SETUP = true;

export function shouldSkipAccountSetup(platform: string, width: number) {
  return SKIP_DESKTOP_ACCOUNT_SETUP && platform === 'web' && width >= DESKTOP_AUTH_MIN_WIDTH;
}

export function getPostAuthDestination({
  platform, width, authenticated, profileCompleted, onboardingCompleted,
}: {
  platform: string;
  width: number;
  authenticated: boolean;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
}) {
  if (!authenticated) return '/(auth)/login';
  if (shouldSkipAccountSetup(platform, width)) return '/(tabs)/explore';
  if (!profileCompleted) return '/(setup)/profile-setup';
  if (!onboardingCompleted) return '/(onboarding)/welcome';
  return '/(tabs)/explore';
}
