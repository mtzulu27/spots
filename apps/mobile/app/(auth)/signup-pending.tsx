import {
  AuthLayout,
  PrimaryAction,
  SecondaryAction,
} from '@/components/auth-wireframe';

export default function SignupPendingScreen() {
  return (
    <AuthLayout
      title="Revisa tu correo"
      description="Tu cuenta ya fue creada, pero Supabase está pidiendo confirmación por email antes de dejarte entrar. Cuando confirmes, vuelve a iniciar sesión."
      showSocialOptions={false}
      footer={
        <SecondaryAction
          label="Volver al login"
          href="/(auth)/login-email"
        />
      }
    >
      <PrimaryAction label="Ya confirmé mi correo" href="/(auth)/login-email" />
    </AuthLayout>
  );
}
