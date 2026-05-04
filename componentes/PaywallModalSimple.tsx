import React, { useEffect, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import Purchases from 'react-native-purchases';

interface Props {
  visible: boolean;
  onPurchaseSuccess?: () => void;
  dismissible?: boolean;
}

export default function PaywallModalSimple({ visible, onPurchaseSuccess, dismissible = false }: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (visible) setIsLoading(false);
    else setIsLoading(true);
  }, [visible]);

  const handleSubscribe = async () => {
    setIsPurchasing(true);
    try {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.current ?? Object.values(offerings.all)[0];
      const pkg = offering?.availablePackages?.[0];
      if (!pkg) {
        Alert.alert('No offerings', 'No subscription packages are available.');
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasEntitlement = Object.keys(customerInfo.entitlements.active ?? {}).length > 0;
      if (hasEntitlement) {
        onPurchaseSuccess?.();
      } else {
        Alert.alert('Purchase completed', 'No active entitlement detected.');
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase failed', e?.message ?? 'An error occurred');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement = Object.keys(customerInfo.entitlements.active ?? {}).length > 0;
      if (hasEntitlement) onPurchaseSuccess?.();
      else Alert.alert('Restore', 'No active purchases found.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Could not restore purchases.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { /* no-op to prevent hardware back closing */ }}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#222" />
        <View style={styles.overlay} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Gym Judge — Acceso requerido</Text>
          <Text style={styles.msg}>Compra la suscripción para activar la app.</Text>

          <TouchableOpacity
            style={[styles.button, isPurchasing && styles.buttonDisabled]}
            onPress={handleSubscribe}
            disabled={isPurchasing}
          >
            {isPurchasing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Comprar suscripción</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={handleRestore} disabled={isPurchasing}>
            <Text style={styles.linkText}>Restaurar compras</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    width: '92%',
    maxHeight: '84%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  msg: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#004aad', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, width: '100%' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  link: { marginTop: 12 },
  linkText: { color: '#004aad', textDecorationLine: 'underline' },
});
