import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appColors } from '@/components/app-ui';
import { useAuthStore } from '@/lib/auth-store';

const slideOneImage = require('../../assets/onboarding_slide_1.png');
const slideTwoImage = require('../../assets/onboarding_slide_2.png');
const slideThreeImage = require('../../assets/onboarding_slide_3.png');
const slideFourImage = require('../../assets/onboarding_slide_4.png');

type Slide = {
  key: string;
  title: string;
  copy: string;
  extra?: string;
  image: ImageSourcePropType;
  kind: 'slide' | 'closing';
};

const slides: Slide[] = [
  {
    key: 'find',
    title: 'ENCUENTRA',
    copy: 'Los mejores lugares para explorar en tu ciudad',
    image: slideOneImage,
    kind: 'slide',
  },
  {
    key: 'share',
    title: 'COMPARTE',
    copy: 'Guarda, comparte y prepara mejores parches con tus amigos',
    image: slideTwoImage,
    kind: 'slide',
  },
  {
    key: 'decide',
    title: 'DECIDE',
    copy: 'Usa filtros y explora por categorías para aterrizar rápido un plan',
    image: slideThreeImage,
    kind: 'slide',
  },
  {
    key: 'close',
    title: '¡Hola!',
    copy: 'Llegaste al lugar indicado',
    extra: 'Ven y armemos los mejores parches',
    image: slideFourImage,
    kind: 'closing',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuthStore();
  const { width, height } = useWindowDimensions();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const finalButtonOpacity = useRef(new Animated.Value(0)).current;
  const finalButtonTranslateY = useRef(new Animated.Value(20)).current;
  const finalButtonScale = useRef(new Animated.Value(0.96)).current;

  const baseTranslateX = useRef(new Animated.Value(0)).current;
  const dragTranslateX = useRef(new Animated.Value(0)).current;
  const trackTranslateX = useMemo(
    () => Animated.add(baseTranslateX, dragTranslateX),
    [baseTranslateX, dragTranslateX],
  );
  const currentSlideBlurOpacity = useMemo(
    () =>
      dragTranslateX.interpolate({
        inputRange: [-width * 0.28, 0, width * 0.28],
        outputRange: [0.98, 0, 0.98],
        extrapolate: 'clamp',
      }),
    [dragTranslateX, width],
  );
  const currentSlideTextOpacity = useMemo(
    () =>
      dragTranslateX.interpolate({
        inputRange: [-width * 0.6, 0, width * 0.6],
        outputRange: [0.08, 1, 0.08],
        extrapolate: 'clamp',
      }),
    [dragTranslateX, width],
  );
  const currentSlideTextTranslateY = useMemo(
    () =>
      dragTranslateX.interpolate({
        inputRange: [-width * 0.6, 0, width * 0.6],
        outputRange: [18, 0, 18],
        extrapolate: 'clamp',
      }),
    [dragTranslateX, width],
  );

  function snapToSlide(nextIndex: number) {
    const boundedIndex = Math.max(0, Math.min(nextIndex, slides.length - 1));
    setCurrentSlideIndex(boundedIndex);
    dragTranslateX.setValue(0);
    Animated.timing(baseTranslateX, {
      toValue: -boundedIndex * width,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 8,
        onPanResponderMove: (_event, gestureState) => {
          dragTranslateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const swipeThreshold = width * 0.18;
          const velocityThreshold = 0.22;

          let nextIndex = currentSlideIndex;

          if (
            gestureState.dx <= -swipeThreshold ||
            gestureState.vx <= -velocityThreshold
          ) {
            nextIndex = currentSlideIndex + 1;
          } else if (
            gestureState.dx >= swipeThreshold ||
            gestureState.vx >= velocityThreshold
          ) {
            nextIndex = currentSlideIndex - 1;
          }

          snapToSlide(nextIndex);
        },
        onPanResponderTerminate: () => {
          snapToSlide(currentSlideIndex);
        },
      }),
    [currentSlideIndex, dragTranslateX, width],
  );

  async function handleFinish() {
    setSubmitting(true);
    const error = await completeOnboarding();
    setSubmitting(false);

    if (error) {
      Alert.alert('No pudimos cerrar el onboarding', error);
      return;
    }

    router.replace('/(tabs)/explore');
  }

  useEffect(() => {
    if (currentSlideIndex !== slides.length - 1) {
      finalButtonOpacity.setValue(0);
      finalButtonTranslateY.setValue(20);
      finalButtonScale.setValue(0.96);
      return;
    }

    const timeoutId = setTimeout(() => {
      Animated.parallel([
        Animated.timing(finalButtonOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(finalButtonTranslateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.timing(finalButtonScale, {
          toValue: 1,
          duration: 320,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    }, 320);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    currentSlideIndex,
    finalButtonOpacity,
    finalButtonScale,
    finalButtonTranslateY,
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.mainContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sliderTrack,
            {
              width: width * slides.length,
              transform: [{ translateX: trackTranslateX }],
            },
          ]}
        >
          {slides.map((slide, index) => (
            <View key={slide.key} style={[styles.slide, { width }]}>
              <View style={styles.heroImage}>
                <Image
                  source={slide.image}
                  style={styles.heroImageAsset}
                  resizeMode="cover"
                />
                <Animated.Image
                  source={slide.image}
                  style={[
                    styles.heroImageAsset,
                    {
                      opacity:
                        index === currentSlideIndex
                          ? currentSlideBlurOpacity
                          : 0,
                    },
                  ]}
                  resizeMode="cover"
                  blurRadius={52}
                />
                <View
                  style={[
                    styles.imageOverlay,
                    slide.kind === 'closing' ? styles.imageOverlayClosing : styles.imageOverlayRegular,
                  ]}
                />
                <View
                  style={[
                    styles.contentOverlay,
                    slide.kind === 'closing' ? styles.contentOverlayClosing : styles.contentOverlayRegular,
                    {
                      paddingTop: Math.max(insets.top, 18) + (slide.kind === 'closing' ? 62 : 118),
                      paddingBottom: Math.max(insets.bottom, 24) + 34,
                    },
                  ]}
                >
                  {slide.kind === 'slide' ? (
                    <View style={styles.slideContent}>
                      <Animated.View
                        style={{
                          opacity:
                            index === currentSlideIndex
                              ? currentSlideTextOpacity
                              : trackTranslateX.interpolate({
                                  inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                                  outputRange: [0, 1, 0],
                                  extrapolate: 'clamp',
                                }),
                          transform: [
                            {
                              translateY:
                                index === currentSlideIndex
                                  ? currentSlideTextTranslateY
                                  : trackTranslateX.interpolate({
                                      inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                                      outputRange: [20, 0, 20],
                                      extrapolate: 'clamp',
                                    }),
                            },
                            {
                              scale: trackTranslateX.interpolate({
                                inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                                outputRange: [0.975, 1, 0.975],
                                extrapolate: 'clamp',
                              }),
                            },
                          ],
                        }}
                      >
                        <View style={styles.copyWrap}>
                          <Text style={styles.headline}>{slide.title}</Text>
                          <Text style={styles.bodyText}>{slide.copy}</Text>
                        </View>
                      </Animated.View>
                    </View>
                  ) : (
                    <View style={styles.finalContent}>
                      <Animated.View
                        style={[
                          styles.finalCopyMotion,
                          {
                            opacity: trackTranslateX.interpolate({
                              inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                              outputRange: [0, 1, 0],
                              extrapolate: 'clamp',
                            }),
                            transform: [
                              {
                                translateY: trackTranslateX.interpolate({
                                  inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                                  outputRange: [20, 0, 20],
                                  extrapolate: 'clamp',
                                }),
                              },
                              {
                                scale: trackTranslateX.interpolate({
                                  inputRange: [(-index - 0.75) * width, -index * width, (-index + 0.75) * width],
                                  outputRange: [0.975, 1, 0.975],
                                  extrapolate: 'clamp',
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <View style={styles.finalCopy}>
                          <Text style={styles.finalTitle}>{slide.title}</Text>
                          <Text style={styles.finalSubtitle}>{slide.copy}</Text>
                          <Text style={styles.finalText}>{slide.extra}</Text>
                        </View>
                      </Animated.View>
                      <Pressable
                        onPress={handleFinish}
                        disabled={submitting}
                      >
                        <Animated.View
                          style={[
                            styles.startButton,
                            submitting && styles.startButtonDisabled,
                            {
                              opacity: finalButtonOpacity,
                              transform: [
                                {
                                  translateY: finalButtonTranslateY,
                                },
                                {
                                  scale: finalButtonScale,
                                },
                              ],
                            },
                          ]}
                        >
                          {submitting ? (
                            <ActivityIndicator size="small" color="#fff7fb" />
                          ) : null}
                          <Text style={styles.startButtonText}>
                            {submitting ? 'Entrando...' : 'Empezar'}
                          </Text>
                        </Animated.View>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {currentSlideIndex < slides.length - 1 ? (
          <PaginationDots currentSlideIndex={currentSlideIndex} total={slides.length} />
        ) : null}
      </View>
    </View>
  );
}

function PaginationDots({
  currentSlideIndex,
  total,
}: {
  currentSlideIndex: number;
  total: number;
}) {
  return (
    <View style={styles.paginationDots} pointerEvents="none">
      {Array.from({ length: total }).map((_, index) => {
        const active = index === currentSlideIndex;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              active ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080508',
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  slide: {
    flex: 1,
  },
  heroImage: {
    flex: 1,
    backgroundColor: '#080508',
  },
  heroImageAsset: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlayRegular: {
    backgroundColor: 'rgba(8, 5, 8, 0.52)',
  },
  imageOverlayClosing: {
    backgroundColor: 'rgba(14, 8, 12, 0.48)',
  },
  contentOverlay: {
    flex: 1,
    paddingHorizontal: 30,
  },
  contentOverlayRegular: {
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  contentOverlayClosing: {
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyWrap: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 300,
  },
  headline: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff7fb',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  bodyText: {
    fontSize: 19,
    lineHeight: 27,
    color: '#fff7fb',
    textAlign: 'center',
  },
  finalContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  finalCopy: {
    alignItems: 'flex-end',
    gap: 10,
  },
  finalCopyMotion: {
    alignSelf: 'stretch',
  },
  finalTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff7fb',
    textAlign: 'right',
  },
  finalSubtitle: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: '#fff7fb',
    textAlign: 'right',
    maxWidth: 260,
  },
  finalText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: 'rgba(255,247,251,0.9)',
    textAlign: 'right',
    maxWidth: 260,
  },
  startButton: {
    minHeight: 58,
    borderRadius: 29,
    backgroundColor: '#fff7fb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: appColors.primary,
  },
  paginationDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255,247,251,0.42)',
  },
  dotActive: {
    width: 20,
    height: 8,
    backgroundColor: '#ffffff',
  },
});
