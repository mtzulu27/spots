import { Redirect, Slot } from 'expo-router';
import { ActivityIndicator, Platform, View, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { shouldSkipAccountSetup } from '@/lib/desktop-auth-policy';
import { appColors } from './app-ui';

export function SetupFlowGuard() {
  const { width } = useWindowDimensions();
  const { loading, user } = useAuthStore();
  if (!shouldSkipAccountSetup(Platform.OS, width)) return <Slot />;
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={appColors.primaryDark} accessibilityLabel="Cargando cuenta" />
  </View>;
  return <Redirect href={user ? '/(tabs)/explore' : '/(auth)/login'} />;
}
