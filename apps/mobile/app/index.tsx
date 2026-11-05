import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { appColors } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';
import DebugScreen from './debug';
import { getPostAuthDestination } from '@/lib/desktop-auth-policy';

export default function Home() {
  const { width } = useWindowDimensions();
  const { loading, user, profileCompleted, onboardingCompleted } =
    useAuthStore();

  if (SAFE_AREA_DIAGNOSTIC) {
    return <DebugScreen />;
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={appColors.primaryDark} />
        </View>
      </View>
    );
  }

  return <Redirect href={getPostAuthDestination({
    platform: Platform.OS, width, authenticated: Boolean(user), profileCompleted, onboardingCompleted,
  })} />;
}

const SAFE_AREA_DIAGNOSTIC = false;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f2',
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
