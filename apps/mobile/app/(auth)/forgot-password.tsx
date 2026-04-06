import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PrimaryAction,
  WireframeField,
} from '@/components/auth-wireframe';
import { useAuthStore } from '@/lib/auth-store';

const spotsLogo = require('../../assets/logo_spots_blanco.png');
const resetBackground = require('../../assets/auth_reset_bg.png');

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { sendPasswordReset } = useAuthStore();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const logoProgress = useRef(new Animated.Value(0)).current;
  const bottomProgress = useRef(new Animated.Value(0)).current;

  const emailError = useMemo(() => {
    if (!email.length) return '';
    return isValidEmail(email.trim()) ? '' : 'Ingresa un correo válido';
  }, [email]);

  const canSubmit = isValidEmail(email.trim()) && !submitting;

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

  async function handleReset() {
    if (!canSubmit) {
      setEmailTouched(true);
      return;
    }

    setSubmitting(true);
    setAuthError('');
    const error = await sendPasswordReset(email.trim());
    setSubmitting(false);

    if (error) {
      setAuthError(error);
      return;
    }

    router.push('/(auth)/reset-confirmation');
  }

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
        source={resetBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoWrap,
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
            {
              opacity: bottomOpacity,
              transform: [{ translateY: bottomTranslate }],
            },
          ]}
        >
          <View style={styles.hero}>
            <Text style={styles.quote}>Recupera tu acceso</Text>
            <Text style={styles.description}>
              Déjanos tu correo y te enviamos un enlace para volver a entrar
            </Text>
          </View>

          <View style={styles.formWrap}>
            <View style={styles.form}>
              <WireframeField
                label=""
                placeholder="Tu email"
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailTouched(true)}
                keyboardType="email-address"
                leadingIcon="mail-outline"
                error={emailTouched ? emailError : ''}
              />
              {authError ? (
                <View style={styles.helperWrap}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              ) : null}
              <PrimaryAction
                label={submitting ? 'Enviando...' : 'Enviar enlace'}
                onPress={handleReset}
                disabled={!canSubmit}
                loading={submitting}
              />
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.replace('/(auth)/login')}
                  style={styles.actionLinkWrap}
                >
                  <Text style={styles.actionLink}>Volver</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Text style={styles.legalText}>
            Te enviaremos un enlace seguro para restablecer tu contraseña
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
    paddingTop: 48,
    paddingBottom: 36,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
  },
  logoImage: {
    width: 62,
    height: 82,
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
    paddingBottom: 6,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  quote: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
    color: '#fff7fb',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,247,251,0.82)',
    textAlign: 'center',
    maxWidth: 300,
  },
  formWrap: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 8,
  },
  form: {
    gap: 16,
    width: '100%',
  },
  helperWrap: {
    marginTop: -2,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d74d72',
    fontWeight: '600',
  },
  actionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionLinkWrap: {
    justifyContent: 'center',
  },
  actionLink: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#fff7fb',
    textAlign: 'center',
  },
  legalText: {
    width: '100%',
    maxWidth: 250,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,247,251,0.42)',
    textAlign: 'center',
  },
});
