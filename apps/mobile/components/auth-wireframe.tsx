import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRelayoutSubscription } from '@/lib/relayout';

type AuthLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  emailSectionLabel?: string;
  showSocialOptions?: boolean;
};

type FieldProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  leadingIcon?: ComponentProps<typeof Ionicons>['name'];
  trailingAccessory?: ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  editable?: boolean;
  error?: string;
};

type PrimaryActionProps = {
  label: string;
  href?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

type SecondaryActionProps = {
  label: string;
  href?: string;
  onPress?: () => void;
  variant?: 'text' | 'outlined';
  disabled?: boolean;
};

const socialProviders = [
  { key: 'apple', label: 'Continuar con Apple' },
  { key: 'google', label: 'Continuar con Google' },
] as const;

export function AuthLayout({
  title,
  description,
  children,
  footer,
  emailSectionLabel = 'o',
  showSocialOptions = true,
}: AuthLayoutProps) {
  useRelayoutSubscription();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 36,
            paddingBottom: 40 + insets.bottom,
            flexGrow: 1,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.layout}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.form}>{children}</View>

          {showSocialOptions ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{emailSectionLabel}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialGroup}>
                {socialProviders.map((provider) => (
                  <Pressable
                    key={provider.key}
                    style={[
                      styles.socialButton,
                      provider.key === 'apple' ? styles.appleButton : styles.googleButton,
                    ]}
                  >
                    <View style={styles.socialButtonContent}>
                      {provider.key === 'apple' ? (
                        <Ionicons name="logo-apple" size={18} color="#ffffff" />
                      ) : (
                        <GoogleGlyph />
                      )}
                      <Text
                        style={[
                          styles.socialButtonLabel,
                          provider.key === 'apple'
                            ? styles.appleButtonLabel
                            : styles.googleButtonLabel,
                        ]}
                      >
                        {provider.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </View>
  );
}

export function WireframeField({
  label,
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  onBlur,
  leadingIcon,
  trailingAccessory,
  autoCapitalize = 'none',
  keyboardType = 'default',
  editable = true,
  error,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputShell, error && styles.inputShellError]}>
        {leadingIcon ? (
          <Ionicons
            name={leadingIcon}
            size={18}
            color="rgba(255,247,251,0.78)"
            style={styles.leadingIcon}
          />
        ) : null}
        <TextInput
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,247,251,0.72)"
          secureTextEntry={secureTextEntry}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          selectionColor="#fff7fb"
          cursorColor="#fff7fb"
          underlineColorAndroid="transparent"
          style={[
            styles.input,
            leadingIcon ? styles.inputWithLeadingIcon : null,
            trailingAccessory ? styles.inputWithTrailingAccessory : null,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as const as never) : null,
          ]}
        />
        {trailingAccessory ? (
          <View style={styles.trailingAccessory}>{trailingAccessory}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryAction({
  label,
  href,
  onPress,
  disabled = false,
  loading = false,
}: PrimaryActionProps) {
  if (href) {
    return (
      <Link
        href={href}
        style={[styles.primaryButton, (disabled || loading) && styles.disabledAction]}
        pointerEvents={disabled || loading ? 'none' : 'auto'}
      >
        <Text style={styles.primaryButtonLabel}>{label}</Text>
      </Link>
    );
  }

  return (
    <Pressable
      style={[styles.primaryButton, (disabled || loading) && styles.disabledAction]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator size="small" color="#fff7fb" /> : null}
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryAction({
  label,
  href,
  onPress,
  variant = 'text',
  disabled = false,
}: SecondaryActionProps) {
  const wrapperStyle =
    variant === 'outlined'
      ? [styles.secondaryActionOutlined, disabled && styles.disabledAction]
      : [styles.secondaryAction, disabled && styles.disabledAction];
  const labelStyle =
    variant === 'outlined'
      ? styles.secondaryActionOutlinedLabel
      : styles.secondaryActionLabel;

  if (href) {
    return (
      <Link
        href={href}
        style={wrapperStyle}
        pointerEvents={disabled ? 'none' : 'auto'}
      >
        <Text style={labelStyle}>{label}</Text>
      </Link>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={wrapperStyle}>
      <Text style={labelStyle}>{label}</Text>
    </Pressable>
  );
}

export function FooterSplitLinks({
  leftLabel,
  leftHref,
  rightLabel,
  rightHref,
}: {
  leftLabel: string;
  leftHref: string;
  rightLabel: string;
  rightHref: string;
}) {
  return (
    <View style={styles.footerRow}>
      <SecondaryAction label={leftLabel} href={leftHref} />
      <SecondaryAction label={rightLabel} href={rightHref} />
    </View>
  );
}

function GoogleGlyph() {
  return (
    <View style={styles.googleGlyph}>
      <View style={[styles.googleArc, styles.googleArcBlue]} />
      <View style={[styles.googleArc, styles.googleArcRed]} />
      <View style={[styles.googleArc, styles.googleArcYellow]} />
      <View style={[styles.googleArc, styles.googleArcGreen]} />
      <View style={styles.googleGlyphCutout} />
      <View style={styles.googleGlyphBar} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
  },
  layout: {
    gap: 22,
    flexGrow: 1,
  },
  header: {
    gap: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    color: '#231725',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#7f7480',
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#7f7480',
  },
  inputShell: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  leadingIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 2,
  },
  trailingAccessory: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
  },
  inputShellError: {
    borderColor: '#d74d72',
    backgroundColor: 'rgba(215,77,114,0.10)',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff7fb',
    backgroundColor: 'transparent',
    borderWidth: 0,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  inputWithLeadingIcon: {
    paddingLeft: 42,
  },
  inputWithTrailingAccessory: {
    paddingRight: 46,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d74d72',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 28,
    backgroundColor: '#ff4e76',
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonLabel: {
    color: '#fff8fb',
    fontSize: 16,
    fontWeight: '800',
  },
  disabledAction: {
    opacity: 0.55,
  },
  socialGroup: {
    gap: 12,
  },
  socialButton: {
    minHeight: 52,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleButton: {
    borderColor: '#111111',
    backgroundColor: '#111111',
  },
  appleButtonLabel: {
    color: '#ffffff',
  },
  googleButton: {
    borderColor: '#ece3e8',
    backgroundColor: '#ffffff',
  },
  googleButtonLabel: {
    color: '#2d1830',
  },
  googleGlyph: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  googleArc: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  googleArcBlue: {
    borderColor: '#4285F4',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-8deg' }],
  },
  googleArcRed: {
    borderColor: '#EA4335',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '54deg' }],
  },
  googleArcYellow: {
    borderColor: '#FBBC05',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '128deg' }],
  },
  googleArcGreen: {
    borderColor: '#34A853',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '202deg' }],
  },
  googleGlyphCutout: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: 8,
    height: 10,
    backgroundColor: '#ffffff',
  },
  googleGlyphBar: {
    position: 'absolute',
    right: 1,
    top: 8,
    width: 8,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#4285F4',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e3dbe0',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8a7e8b',
  },
  footer: {
    paddingTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b4c69',
    textAlign: 'center',
  },
  secondaryActionOutlined: {
    minHeight: 52,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ece3e8',
    backgroundColor: '#fff7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionOutlinedLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4e3b4d',
    textAlign: 'center',
  },
});
