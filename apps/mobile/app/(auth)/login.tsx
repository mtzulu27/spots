import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PrimaryAction,
  WireframeField,
} from '@/components/auth-wireframe';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useAuthStore } from '@/lib/auth-store';

const spotsLogo = require('../../assets/logo_spots_blanco.png');
const welcomeBackground = require('../../assets/auth_welcome_bg.png');
const googleGlyphUri =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/3840px-Google_%22G%22_logo.svg.png';

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function LoginScreen() {
  useRelayoutSubscription();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithEmail, signInWithProvider, signUpWithEmail } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formProgress = useRef(new Animated.Value(0)).current;
  const logoProgress = useRef(new Animated.Value(0)).current;
  const bottomProgress = useRef(new Animated.Value(0)).current;

  const emailError = useMemo(() => {
    if (!email.length) return '';
    return isValidEmail(email.trim()) ? '' : 'Ingresa un correo válido';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password.length) return '';
    return password.length >= 8
      ? ''
      : 'La contraseña debe tener al menos 8 caracteres';
  }, [password]);

  const canSubmit = isValidEmail(email.trim()) && password.length >= 8 && !submitting;
  const isCompactHeight = height < 780;
  const collapsedStageHeight = isCompactHeight ? 182 : 198;
  const expandedStageHeight = isCompactHeight ? 300 : 320;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(logoProgress, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bottomProgress, {
        toValue: 1,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [bottomProgress, logoProgress]);

  useEffect(() => {
    Animated.timing(formProgress, {
      toValue: showEmailForm ? 1 : 0,
      duration: 340,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [formProgress, showEmailForm]);

  async function handleEmailContinue() {
    if (!canSubmit) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setSubmitting(true);
    setAuthError('');
    const signInError = await signInWithEmail(email.trim(), password);

    if (!signInError) {
      setSubmitting(false);
      router.replace('/');
      return;
    }

    if (signInError.toLowerCase().includes('email not confirmed')) {
      setSubmitting(false);
      router.replace('/(auth)/signup-pending');
      return;
    }

    const result = await signUpWithEmail(email.trim(), password);
    setSubmitting(false);

    if (result.status === 'error') {
      if (result.error.toLowerCase().includes('already registered')) {
        setAuthError(
          'Ese correo ya tiene cuenta. Revisa la contraseña o recupera tu acceso.',
        );
        return;
      }

      setAuthError(result.error);
      return;
    }

    if (result.status === 'confirmation_required') {
      router.replace('/(auth)/signup-pending');
      return;
    }

    router.replace('/');
  }

  async function handleSocial(provider: 'google' | 'apple') {
    if (submitting) return;

    setSubmitting(true);
    setAuthError('');
    const error = await signInWithProvider(provider);
    setSubmitting(false);

    if (error) {
      setAuthError(error);
    }
  }

  const socialOpacity = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const socialTranslate = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const formOpacity = formProgress;
  const formTranslate = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const stageHeight = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [collapsedStageHeight, expandedStageHeight],
  });
  const logoOpacity = logoProgress;
  const logoTranslate = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });
  const logoScale = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const bottomOpacity = bottomProgress;
  const bottomTranslate = bottomProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View style={styles.screen}>
      <Image
        source={welcomeBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 20,
          },
          isCompactHeight ? styles.contentCompact : null,
        ]}
      >
        <Animated.View
          style={[
            styles.logoWrap,
            isCompactHeight ? styles.logoWrapCompact : null,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslate }, { scale: logoScale }],
            },
          ]}
        >
          <Image source={spotsLogo} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomBlock,
            isCompactHeight ? styles.bottomBlockCompact : null,
            {
              opacity: bottomOpacity,
              transform: [{ translateY: bottomTranslate }],
            },
          ]}
        >
          <View style={styles.hero}>
            <Text style={[styles.quote, isCompactHeight ? styles.quoteCompact : null]}>
              La ciudad está llamando
            </Text>
          </View>

          <Animated.View
            style={[
              styles.formStage,
              {
                height: stageHeight,
              },
            ]}
          >
            <Animated.View
              pointerEvents={showEmailForm ? 'none' : 'auto'}
              style={[
                styles.socialWrap,
                styles.stageLayer,
                {
                  opacity: socialOpacity,
                  transform: [{ translateY: socialTranslate }],
                },
              ]}
            >
              <Pressable
                style={[styles.providerButton, styles.googleButton, submitting && styles.providerButtonDisabled]}
                onPress={() => handleSocial('google')}
                disabled={submitting}
              >
                <View style={styles.providerContent}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#2d1830" />
                  ) : (
                    <Image
                      source={{ uri: googleGlyphUri }}
                      style={styles.googleGlyphImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={[styles.providerLabel, styles.googleLabel]}>
                    {submitting ? 'Conectando...' : 'Continuar con Google'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>o</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={[styles.providerButton, styles.emailButton]}
                onPress={() => setShowEmailForm(true)}
              >
                <View style={styles.providerContent}>
                  <Ionicons name="mail-outline" size={18} color="#ffffff" />
                  <Text style={[styles.providerLabel, styles.emailLabel]}>
                    Continuar con email
                  </Text>
                </View>
              </Pressable>
            </Animated.View>

            <Animated.View
              pointerEvents={showEmailForm ? 'auto' : 'none'}
              style={[
                styles.emailFormWrap,
                styles.stageLayer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslate }],
                },
              ]}
            >
              <View style={styles.form}>
                <WireframeField
                  label=""
                  placeholder="Tu email"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setEmailTouched(true)}
                  leadingIcon="mail-outline"
                  keyboardType="email-address"
                  error={emailTouched ? emailError : ''}
                />
                <WireframeField
                  label=""
                  placeholder="Tu contraseña"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setPasswordTouched(true)}
                  leadingIcon="lock-closed-outline"
                  trailingAccessory={
                    <Pressable
                      onPress={() => setShowPassword((current) => !current)}
                      hitSlop={10}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="rgba(255,247,251,0.78)"
                      />
                    </Pressable>
                  }
                  error={passwordTouched ? passwordError : ''}
                />
                {!canSubmit && (email.length > 0 || password.length > 0) ? (
                  <View style={styles.helperWrap}>
                    <Text style={styles.helperText}>
                      Revisa los campos marcados para poder continuar.
                    </Text>
                  </View>
                ) : null}
                {authError ? (
                  <View style={styles.helperWrap}>
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                ) : null}
                <PrimaryAction
                  label={submitting ? 'Continuando...' : 'Continuar'}
                  onPress={handleEmailContinue}
                  disabled={!canSubmit}
                  loading={submitting}
                />
                <View style={styles.emailActionsRow}>
                  <Pressable
                    onPress={() => setShowEmailForm(false)}
                    style={styles.emailActionLinkWrap}
                  >
                    <Text style={styles.backToMethodsLabel}>Otros métodos</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    style={styles.emailActionLinkWrap}
                  >
                    <Text style={styles.backToMethodsLabel}>Olvidé mi contraseña</Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </Animated.View>

          {authError && !showEmailForm ? (
            <View style={[styles.helperWrap, styles.globalErrorWrap]}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          <Text style={styles.legalText}>
            Al continuar aceptas los Términos de servicio y la Política de privacidad de Spots.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 3, 6, 0.62)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 36,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentCompact: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoWrapCompact: {
    paddingTop: 0,
  },
  hero: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  logoImage: {
    width: 62,
    height: 82,
  },
  title: {
    fontSize: 44,
    lineHeight: 46,
    fontWeight: '900',
    color: '#231725',
    textAlign: 'center',
  },
  quote: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: '#fff7fb',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  quoteCompact: {
    fontSize: 22,
    lineHeight: 28,
  },
  formStage: {
    width: '100%',
    maxWidth: 360,
    position: 'relative',
  },
  stageLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  socialWrap: {
    gap: 12,
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,247,251,0.28)',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff7fb',
  },
  providerButton: {
    minHeight: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  providerButtonDisabled: {
    opacity: 0.78,
  },
  providerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  providerLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderColor: '#ece3e8',
  },
  googleLabel: {
    color: '#231725',
  },
  appleButton: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  appleLabel: {
    color: '#ffffff',
  },
  emailButton: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: '#ffffff',
  },
  emailLabel: {
    color: '#ffffff',
  },
  emailFormWrap: {
    gap: 18,
    width: '100%',
    alignItems: 'center',
  },
  form: {
    gap: 16,
    width: '100%',
  },
  emailActionsRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  emailActionLinkWrap: {
    justifyContent: 'center',
  },
  backToMethodsLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#fff7fb',
    textAlign: 'center',
  },
  helperWrap: {
    marginTop: -2,
  },
  globalErrorWrap: {
    width: '100%',
    maxWidth: 360,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#f1dfe7',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d74d72',
    fontWeight: '600',
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 6,
  },
  bottomBlockCompact: {
    gap: 8,
  },
  legalText: {
    width: '100%',
    maxWidth: 250,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,247,251,0.42)',
    textAlign: 'center',
  },
  googleGlyphImage: {
    width: 18,
    height: 18,
  },
});
