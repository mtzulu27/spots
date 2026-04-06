import { useMemo, useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthLayout,
  PrimaryAction,
  SecondaryAction,
  WireframeField,
} from '@/components/auth-wireframe';
import { useAuthStore } from '@/lib/auth-store';

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function RegisterEmailScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const canSubmit =
    isValidEmail(email.trim()) && password.length >= 8 && !submitting;

  async function handleRegister() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password);
    setSubmitting(false);

    if (result.status === 'error') {
      Alert.alert('No pudimos crear la cuenta', result.error);
      return;
    }

    if (result.status === 'confirmation_required') {
      router.replace('/(auth)/signup-pending');
      return;
    }

    router.replace('/');
  }

  return (
    <AuthLayout
      title="Regístrate con email"
      description="Crea tu cuenta con correo y contraseña para seguir al setup inicial."
      emailSectionLabel="o"
      footer={
        <SecondaryAction label="Ya tengo una cuenta" href="/(auth)/login-email" />
      }
    >
      <WireframeField
        label="Correo electrónico"
        placeholder="hola@spots.app"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        error={emailError}
      />
      <WireframeField
        label="Contraseña"
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        error={passwordError}
      />
      {!canSubmit && (email.length > 0 || password.length > 0) ? (
        <View style={styles.helperWrap}>
          <Text style={styles.helperText}>
            Revisa los campos marcados para poder continuar.
          </Text>
        </View>
      ) : null}
      <PrimaryAction
        label={submitting ? 'Creando cuenta...' : 'Continuar'}
        onPress={handleRegister}
        disabled={!canSubmit}
        loading={submitting}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  helperWrap: {
    marginTop: -2,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7d6a78',
  },
});
