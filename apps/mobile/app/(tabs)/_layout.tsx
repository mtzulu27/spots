import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { appColors } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';
import { localPreviewEnabled } from '@/lib/local-preview';

export default function TabsLayout() {
  const { loading, user } = useAuthStore();

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={appColors.primaryDark} />
      </View>
    );
  }

  if (!user && !localPreviewEnabled) {
    return <Redirect href="/(auth)/login" />;
  }

  return <TabsNavigator />;
}

function TabsNavigator() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.hiddenTabBar,
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="today" options={{ title: 'Parches' }} />
      <Tabs.Screen name="account" options={{ title: 'Mi cuenta' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f4f2',
  },
  hiddenTabBar: {
    display: 'none',
  },
});
