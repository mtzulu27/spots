import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  Image,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export const appColors = {
  background: '#f7f3f0',
  surface: '#ffffff',
  surfaceMuted: '#f4edf1',
  text: '#2d1830',
  textMuted: '#7f7480',
  primary: '#ff4e76',
  primaryDark: '#5f2e61',
  primarySoft: '#f8d7df',
  border: '#e7dce3',
  yellow: '#f6c01e',
  darkSurface: '#171115',
};

export const spotsUi = {
  bg: '#111114',
  surface: 'rgba(255,255,255,0.05)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  surfaceInput: 'rgba(255,255,255,0.08)',
  surfaceElevated: 'rgba(255,255,255,0.12)',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderDefault: 'rgba(255,255,255,0.12)',
  borderHover: 'rgba(255,255,255,0.18)',
  glassBg: 'rgba(255,255,255,0.14)',
  glassBorder: 'rgba(255,255,255,0.18)',
  textPrimary: 'rgba(255,255,255,0.85)',
  textSecondary: 'rgba(255,255,255,0.5)',
  textTertiary: 'rgba(255,255,255,0.35)',
  textHint: 'rgba(255,255,255,0.25)',
  pink: '#FF2D55',
  pinkTint: 'rgba(255,45,85,0.12)',
  pinkBorder: 'rgba(255,45,85,0.2)',
  yellow: '#F5C400',
  purple: '#6B1D4A',
}

export type SegmentedTabOption<T extends string> = {
  key: T;
  label: string;
};

export function AppSegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  onLayout,
}: {
  options: Array<SegmentedTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, options.findIndex((option) => option.key === value));
  const segmentWidth = containerWidth > 0 ? containerWidth / Math.max(options.length, 1) : 0;

  useEffect(() => {
    if (!segmentWidth) {
      return;
    }

    Animated.spring(translateX, {
      toValue: activeIndex * segmentWidth,
      damping: 18,
      stiffness: 210,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, segmentWidth, translateX]);

  return (
    <View
      onLayout={(event) => {
        setContainerWidth(event.nativeEvent.layout.width);
        onLayout?.(event);
      }}
      style={styles.segmentedTabs}
    >
      {segmentWidth ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentedTabsThumb,
            {
              width: segmentWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={styles.segmentedTabsButton}
          >
            <Text style={[styles.segmentedTabsLabel, active && styles.segmentedTabsLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppIconButton({
  name,
  onPress,
  tone = 'light',
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'light' | 'dark' | 'glass';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.iconButton,
        tone === 'dark' && styles.iconButtonDark,
        tone === 'glass' && styles.iconButtonGlass,
      ]}
    >
      <Ionicons
        name={name}
        size={20}
        color={tone === 'dark' || tone === 'glass' ? spotsUi.textPrimary : appColors.primaryDark}
      />
    </Pressable>
  );
}

export function AppLikeButton({
  liked,
  onPress,
  tone = 'light',
  activeColor = '#EF3857',
  inactiveColor,
}: {
  liked: boolean;
  onPress?: () => void;
  tone?: 'light' | 'dark' | 'glass';
  activeColor?: string;
  inactiveColor?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (liked) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.18,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            damping: 12,
            stiffness: 260,
            mass: 0.85,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      return;
    }

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 13,
        stiffness: 230,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liked, rotate, scale]);

  const defaultColor =
    tone === 'dark' || tone === 'glass' ? spotsUi.textPrimary : appColors.primaryDark;

  return (
    <Animated.View
      style={{
        transform: [
          { scale },
          {
            rotate: rotate.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-10deg'],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.iconButton,
          tone === 'dark' && styles.iconButtonDark,
          tone === 'glass' && styles.iconButtonGlass,
        ]}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={20}
          color={liked ? activeColor : inactiveColor ?? defaultColor}
        />
      </Pressable>
    </Animated.View>
  );
}

export function AppBookmarkButton({
  bookmarked,
  onPress,
  tone = 'light',
  activeColor = '#141417',
  inactiveColor,
}: {
  bookmarked: boolean;
  onPress?: (event?: any) => void;
  tone?: 'light' | 'dark' | 'glass';
  activeColor?: string;
  inactiveColor?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    Animated.sequence([
      Animated.timing(scale, {
        toValue: bookmarked ? 1.12 : 0.92,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 12,
        stiffness: 240,
        mass: 0.88,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bookmarked, scale]);

  const defaultColor =
    tone === 'dark' || tone === 'glass' ? spotsUi.textPrimary : appColors.primaryDark;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.iconButton,
          tone === 'dark' && styles.iconButtonDark,
          tone === 'glass' && styles.iconButtonGlass,
        ]}
      >
        <Ionicons
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={bookmarked ? activeColor : inactiveColor ?? defaultColor}
        />
      </Pressable>
    </Animated.View>
  );
}

export function AppPrimaryButton({
  label,
  onPress,
  icon,
  fullWidth = false,
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[
        styles.primaryButton,
        fullWidth && styles.primaryButtonFull,
        loading && styles.primaryButtonDisabled,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
      {!loading ? icon : null}
    </Pressable>
  );
}

export function AppSecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function AppChip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onFocus,
  onBlur,
  onClear,
  showClearButton = false,
  variant = 'light',
  debounceMs = 0,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
  variant?: 'light' | 'dark';
  debounceMs?: number;
}) {
  const inputRef = useRef<TextInput>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  const isDark = variant === 'dark';
  const lightIcon = '#6d6d76';
  const lightText = '#17171b';
  const lightHint = '#8d8d96';
  const lightSelection = '#1f1f24';

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  function handleChangeText(nextValue: string) {
    setInternalValue(nextValue);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (debounceMs <= 0) {
      onChangeText(nextValue);
      return;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      onChangeText(nextValue);
      debounceTimeoutRef.current = null;
    }, debounceMs);
  }

  return (
    <View style={[styles.searchWrap, isDark && styles.searchWrapDark]}>
      <Ionicons name="search" size={18} color={isDark ? spotsUi.textHint : lightIcon} />
      <TextInput
        ref={inputRef}
        placeholder={placeholder}
        placeholderTextColor={isDark ? spotsUi.textHint : lightHint}
        value={internalValue}
        onChangeText={handleChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        selectionColor={isDark ? spotsUi.textPrimary : lightSelection}
        style={[
          styles.searchInput,
          !isDark ? ({ color: lightText } as never) : null,
          isDark && styles.searchInputDark,
          Platform.OS === 'web'
            ? ({
                outlineWidth: 0,
                outlineColor: 'transparent',
                outlineStyle: 'none',
              } as never)
            : null,
        ]}
      />
      {showClearButton || internalValue.trim().length > 0 ? (
        <Pressable
          onPress={() => {
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
              debounceTimeoutRef.current = null;
            }
            if (internalValue.trim().length > 0) {
              setInternalValue('');
              onChangeText('');
            }
            inputRef.current?.blur();
            onClear?.();
          }}
          style={styles.searchClearButton}
          hitSlop={10}
        >
          <Ionicons name="close" size={16} color={isDark ? spotsUi.textSecondary : lightIcon} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppAvatar({
  uri,
  size = 48,
  fallbackUri,
}: {
  uri?: string | null;
  size?: number;
  fallbackUri?: string | null;
}) {
  const sources = [uri, fallbackUri].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [uri, fallbackUri]);

  const currentSource = sources[sourceIndex];

  if (!currentSource) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: appColors.surfaceMuted,
        }}
      />
    );
  }

  return (
    <Image
      source={{ uri: currentSource }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: appColors.surfaceMuted,
      }}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((current) => current + 1);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconButtonGlass: {
    backgroundColor: spotsUi.glassBg,
    borderWidth: 1,
    borderColor: spotsUi.glassBorder,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: appColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  primaryButtonFull: {
    width: '100%',
  },
  primaryButtonDisabled: {
    opacity: 0.78,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff7fb',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 28,
    backgroundColor: appColors.surface,
    borderWidth: 1,
    borderColor: appColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.primaryDark,
  },
  chip: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: appColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appColors.border,
  },
  chipActive: {
    backgroundColor: appColors.primarySoft,
    borderColor: '#efb9c8',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
    color: appColors.primary,
  },
  chipTextActive: {
    color: '#cb345c',
  },
  segmentedTabs: {
    flexDirection: 'row',
    width: '100%',
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#ededf0',
    position: 'relative',
  },
  segmentedTabsThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  segmentedTabsButton: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentedTabsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5f5f67',
  },
  segmentedTabsLabelActive: {
    color: '#141417',
  },
  searchWrap: {
    minHeight: 60,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchWrapDark: {
    backgroundColor: spotsUi.surfaceInput,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: '#17171b',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  searchInputDark: {
    color: spotsUi.textPrimary,
  },
  searchClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
