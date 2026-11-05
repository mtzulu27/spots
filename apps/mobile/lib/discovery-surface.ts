import { Platform, type ViewStyle } from 'react-native';

export const discoverySurfaceShadow: ViewStyle = Platform.OS === 'web'
  ? { boxShadow: '0px 4px 16px rgba(0,0,0,0.08)' }
  : {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    };
