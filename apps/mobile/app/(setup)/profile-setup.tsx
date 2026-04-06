import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
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
import { appColors } from '@/components/app-ui';
import { useRelayoutSubscription } from '@/lib/relayout';
import { useAuthStore } from '@/lib/auth-store';

const spotsLogo = require('../../assets/logo_spots_blanco.png');
const profileSetupBackground = require('../../assets/profile_setup_bg.png');

const interestGroups = [
  'Rumbita',
  'Comer rico',
  'Plan tranqui',
  'Parche en casa',
  'Cocinar algo',
  'Tomar algo',
  'Salir a caminar',
  'Bailar',
  'Salir con panas',
  'Mover el cuerpo',
  'Naturaleza',
  'Plan de pelis',
  'Cafecito',
  'Parche con amigos',
  'Plan familiar',
  'Brunchcito',
  'Sin gastar mucho',
  'Plan romántico',
  'Algo diferente',
];

export default function ProfileSetupScreen() {
  useRelayoutSubscription();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fullName, interests, saveProfileSetup } = useAuthStore();
  const [nameValue, setNameValue] = useState(fullName);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-12)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;
  const chipsOpacity = useRef(new Animated.Value(0)).current;
  const chipsTranslateY = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(22)).current;
  const isCompactHeight = height < 780;
  const visibleInterests = showAllInterests ? interestGroups : interestGroups.slice(0, 10);

  useEffect(() => {
    setNameValue(fullName);
    setSelectedInterests(interests);
  }, [fullName, interests]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(chipsOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(chipsTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ctaTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    chipsOpacity,
    chipsTranslateY,
    contentOpacity,
    contentTranslateY,
    ctaOpacity,
    ctaTranslateY,
    logoOpacity,
    logoTranslateY,
  ]);

  const canContinue = useMemo(
    () => nameValue.trim().length > 0 && !submitting,
    [nameValue, submitting],
  );

  function toggleInterest(value: string) {
    setSelectedInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleContinue() {
    if (!canContinue) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const error = await saveProfileSetup({
      fullName: nameValue.trim(),
      phone: '',
      interests: selectedInterests,
    });

    if (error) {
      setSubmitting(false);
      setErrorMessage(error);
      return;
    }
    setSubmitting(false);

    router.replace('/(onboarding)/welcome');
  }

  return (
    <View style={styles.screen}>
      <Image source={profileSetupBackground} style={styles.backgroundImage} resizeMode="cover" />
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.canvas,
            {
              paddingTop: Math.max(insets.top, 16) + 12,
              paddingBottom: Math.max(insets.bottom, 24) + 20,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.topSection,
              isCompactHeight && styles.topSectionCompact,
              {
                opacity: logoOpacity,
                transform: [{ translateY: logoTranslateY }],
              },
            ]}
          >
            <Image source={spotsLogo} style={styles.logoImage} resizeMode="contain" />
          </Animated.View>

          <View style={styles.bottomSection}>
            <Animated.View
              style={{
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              }}
            >
            <View style={styles.copyBlock}>
              <Text style={styles.subtitle}>
                Cuéntanos quién eres y qué tipo de parche va más contigo.
              </Text>
            </View>

            <View style={styles.formSection}>
              <WireframeField
                label=""
                placeholder="Tu nombre"
                value={nameValue}
                onChangeText={setNameValue}
                leadingIcon="person-outline"
              />
            </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.interestsSection,
                {
                  opacity: chipsOpacity,
                  transform: [{ translateY: chipsTranslateY }],
                },
              ]}
            >
              <View style={styles.chips}>
                {visibleInterests.map((item) => {
                  const active = selectedInterests.includes(item);
                  return (
                    <Pressable
                      key={item}
                      onPress={() => toggleInterest(item)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {interestGroups.length > 10 ? (
                <Pressable
                  onPress={() => setShowAllInterests((current) => !current)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreLabel}>
                    {showAllInterests ? 'Ver menos' : 'Ver más'}
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>

            {errorMessage ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Animated.View
              style={{
                opacity: ctaOpacity,
                transform: [{ translateY: ctaTranslateY }],
              }}
            >
              <PrimaryAction
                label={submitting ? 'Guardando...' : 'Continuar'}
                onPress={handleContinue}
                disabled={!canContinue}
                loading={submitting}
              />
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050305',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 3, 6, 0.68)',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  canvas: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 24,
  },
  topSection: {
    gap: 0,
  },
  topSectionCompact: {
    gap: 0,
  },
  logoImage: {
    width: 62,
    height: 82,
    alignSelf: 'center',
    marginBottom: 18,
  },
  copyBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,247,251,0.76)',
    textAlign: 'center',
    width: 214,
  },
  formSection: {
    gap: 26,
  },
  bottomSection: {
    marginTop: 120,
    gap: 14,
  },
  interestsSection: {
    gap: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#fff7fb',
    borderColor: '#fff7fb',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff7fb',
  },
  chipLabelActive: {
    color: appColors.primaryDark,
  },
  showMoreButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  showMoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff7fb',
  },
  errorWrap: {
    marginTop: -6,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#d74d72',
    fontWeight: '600',
  },
});
