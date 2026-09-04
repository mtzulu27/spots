import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { appColors } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';
import { localPreviewEnabled } from '@/lib/local-preview';

export default function Home() {
  const { loading, user, profileCompleted, interests, onboardingCompleted } =
    useAuthStore();

  if (localPreviewEnabled) {
    return <Redirect href="/(tabs)/explore" />;
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

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!profileCompleted) {
    return <Redirect href="/(setup)/profile-setup" />;
  }

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)/explore" />;
}

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
