import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, Animated, Platform, Modal, SafeAreaView, StatusBar, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { APP_SETTINGS_KEYS, getDiscipline, getSetting, initDatabase, setDiscipline } from '../lib/database';
import { useProductionEntitlementCheck } from '../lib/useProductionEntitlementCheck';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import PaywallModalSimple from '../componentes/PaywallModalSimple';

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value));

export default function DisciplineSelect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; change?: string; skip_validation?: string }>();
  const { width, height } = useWindowDimensions();

  // Si skip_validation=true viene del parámetro, permite acceso sin validar
  const shouldSkipValidation = params?.skip_validation === 'true';
  
  // Validar que el usuario tiene entitlemente de producción
  // Devuelve { hasProduction, isLoading }
  const { hasProduction, isLoading } = useProductionEntitlementCheck('DisciplineSelect', shouldSkipValidation);

  const isChangeMode = params?.mode === 'change' || params?.change === '1';

  const [currentDiscipline, setCurrentDiscipline] = useState<'MAG' | 'WAG'>('WAG');

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const hasShownRef = useRef(false);
  const fadeAnim = useState(() => new Animated.Value(1))[0];

  const isPhone = width < 480 || height < 700;
  const scale = clamp(0.72, width / 430, 1);

  const horizontalPadding = Math.round(clamp(14, 24 * scale, 24));
  const gap = Math.round(clamp(12, 24 * scale, 24));

  // Fit two buttons side-by-side; never exceed the available half width.
  const rawButtonWidth = (width - horizontalPadding * 2 - gap) / 2;
  const buttonWidth = Math.min(360, rawButtonWidth >= 110 ? Math.max(110, rawButtonWidth) : rawButtonWidth);

  const imageSize = Math.round(
    clamp(isPhone ? 64 : 96, buttonWidth * 0.62, isPhone ? 120 : 170)
  );
  const fontSize = Math.round(clamp(isPhone ? 20 : 24, (isPhone ? 28 : 30) * scale, isPhone ? 26 : 30));
  const paddingVertical = Math.round(clamp(isPhone ? 14 : 22, (isPhone ? 20 : 32) * scale, isPhone ? 22 : 32));
  const titleSize = Math.round(clamp(28, 48 * scale, 48));
  const versionSize = Math.round(clamp(12, 16 * scale, 16));
  const versionBottom = Math.round(clamp(18, 60 * scale, 60));
  const radius = Math.round(clamp(22, 36 * scale, 36));
  const imageMarginBottom = Math.round(clamp(8, 14 * scale, 14));

  const navigateWithAnimation = (path: string) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      router.replace(path as any);
    });
  };

  useEffect(() => {
    // Inicializar la base de datos al cargar la app
    initDatabase().catch(error => {
      console.error('Error al inicializar la base de datos:', error);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAndMaybeSkip = async () => {
      try {
        // Mostrar cuál es el default seleccionado
        const d = await getDiscipline();
        if (!cancelled && (d === 'MAG' || d === 'WAG')) setCurrentDiscipline(d);

        // Auto-skip SOLO si el usuario ya eligió explícitamente antes
        // y NO estamos entrando en modo cambio desde main menu.
        if (!isChangeMode) {
          const wasSelected = await getSetting(APP_SETTINGS_KEYS.DISCIPLINE_SELECTED);
          if (!cancelled && wasSelected === '1') {
            navigateWithAnimation('/main-menu');
          }
        }
      } catch (error) {
        console.error('Error loading discipline state:', error);
      }
    };

    loadAndMaybeSkip();

    return () => {
      cancelled = true;
    };
  }, [isChangeMode]);

  // Mostrar modal simplificado UNA vez si no tiene entitlement de producción
  useEffect(() => {
    if (!isLoading && !hasProduction && !shouldSkipValidation && !hasShownRef.current) {
      setShowPaywallModal(true);
      hasShownRef.current = true;
    }
  }, [isLoading, hasProduction, shouldSkipValidation]);

  const handleDisciplineSelect = async (discipline: 'MAG' | 'WAG') => {
    try {
      await setDiscipline(discipline);
      console.log(`Disciplina seleccionada: ${discipline}`);
      setCurrentDiscipline(discipline);
      navigateWithAnimation('/main-menu');
    } catch (error) {
      console.error('Error al establecer disciplina:', error);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={[styles.title, { fontSize: titleSize }]}>CHOOSE YOUR DISCIPLINE</Text>
      <Text style={[styles.version, { fontSize: versionSize, marginBottom: versionBottom }]}>DEFAULT: {currentDiscipline}</Text>
      
      <View style={[styles.buttonContainer, { gap, paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.buttonShadow, { width: buttonWidth, borderRadius: radius }]}>
          <View style={[styles.buttonSurface, { borderRadius: radius }, styles.magButton]}>
            {currentDiscipline === 'MAG' && (
              <View
                pointerEvents="none"
                style={[styles.selectedOverlay, { borderRadius: radius }]}
              />
            )}
            <TouchableOpacity
              style={[styles.buttonInner, { paddingVertical }]}
              onPress={() => handleDisciplineSelect('MAG')}
              disabled={isRedirecting}
              activeOpacity={0.85}
            >
              {currentDiscipline === 'MAG' && <Text style={styles.defaultBadge}>DEFAULT</Text>}
              <Image
                source={require('../assets/images/MAG.webp')}
                style={[styles.buttonImage, { width: imageSize, height: imageSize, marginBottom: imageMarginBottom }]}
                resizeMode="contain"
              />
              <Text style={[styles.buttonText, { fontSize }]}>MAG</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.buttonShadow, { width: buttonWidth, borderRadius: radius }]}>
          <View style={[styles.buttonSurface, { borderRadius: radius }, styles.wagButton]}>
            {currentDiscipline === 'WAG' && (
              <View
                pointerEvents="none"
                style={[styles.selectedOverlay, { borderRadius: radius }]}
              />
            )}
            <TouchableOpacity
              style={[styles.buttonInner, { paddingVertical }]}
              onPress={() => handleDisciplineSelect('WAG')}
              disabled={isRedirecting}
              activeOpacity={0.85}
            >
              {currentDiscipline === 'WAG' && <Text style={styles.defaultBadge}>DEFAULT</Text>}
              <Image
                source={require('../assets/images/WAG.webp')}
                style={[styles.buttonImage, { width: imageSize, height: imageSize, marginBottom: imageMarginBottom }]}
                resizeMode="contain"
              />
              <Text style={[styles.buttonText, { fontSize }]}>WAG</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <PaywallModalSimple
        visible={showPaywallModal}
        dismissible={false}
        onPurchaseSuccess={() => {
          setShowPaywallModal(false);
          // Fuerzar recarga de esta pantalla para que el hook revalide entitlements
          router.replace('/discipline-select');
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#004aad',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
  },
  buttonShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 0,
      },
      default: {},
    }),
  },
  buttonSurface: {
    overflow: 'hidden',
    position: 'relative',
  },
  buttonInner: {
    paddingHorizontal: 18,
    alignItems: 'center',
    width: '100%',
    zIndex: 1,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#004aad',
    zIndex: 2,
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: '#004aad',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  magButton: {
    backgroundColor: '#6E6E6E',
  },
  wagButton: {
    backgroundColor: '#6E6E6E',
  },
  buttonImage: {
    marginBottom: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
});
