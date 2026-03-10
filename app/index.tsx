import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// Set this to match your RevenueCat entitlement identifier
const ENTITLEMENT_ID = 'entlf790b1e170';
const OFFERING_ID = 'Gym Access';

// Hard-coded toggle to enable/disable automatic redirect (useful for testing)
const REDIRECT_ENABLED = true; // <- cambia a false para desactivar

export default function Index() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  const isSmall = height < 720;
  const titleSize = isSmall ? 34 : 40;
  const subtitleSize = isSmall ? 14 : 16;
  const sectionSize = isSmall ? 18 : 20;

  const [currentPackage, setCurrentPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const hasActiveEntitlement = (customerInfo: CustomerInfo) => {
    try {
      const keys = Object.keys(customerInfo.entitlements.active ?? {});
      // If the configured ENTITLEMENT_ID is present or any entitlement is active, consider the user entitled
      return keys.includes(ENTITLEMENT_ID) || keys.length > 0;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    let navigated = false;

    const initPurchases = async () => {
      try {
        console.log('[RC] ⏳ Checking customer info...');
        const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
        console.log('[RC] ✅ Active entitlements:', JSON.stringify(Object.keys(customerInfo.entitlements.active)));

        if (REDIRECT_ENABLED && hasActiveEntitlement(customerInfo)) {
          console.log('[RC] 🎉 User has entitlement, navigating...');
          navigated = true;
          router.replace('/discipline-select');
          return;
        }

        console.log('[RC] ⏳ Fetching offerings...');
        const offerings = await Purchases.getOfferings();
        const offering = offerings.all[OFFERING_ID] ?? offerings.current;
        console.log('[RC] target offering:', offering?.identifier ?? 'null');
        console.log('[RC] availablePackages count:', offering?.availablePackages?.length ?? 0);
        console.log('[RC] all offering keys:', JSON.stringify(Object.keys(offerings.all)));

        if (offering?.availablePackages?.length) {
          const pkg = offering.availablePackages[0];
          console.log('[RC] 📦 Package loaded:', pkg.identifier, pkg.product?.identifier);
          setCurrentPackage(pkg);
        } else {
          console.log('[RC] ⚠️ No packages available');
        }
      } catch (e) {
        console.log('[RC] ❌ init error:', e);
      } finally {
        if (!navigated) setIsCheckingStatus(false);
      }
    };

    initPurchases();
  }, []);

  const handleSubscribe = async () => {
    console.log('[RC] 🛒 Subscribe pressed. currentPackage:', currentPackage?.identifier ?? 'null');
    setIsPurchasing(true);
    try {
      let packageToBuy = currentPackage;
      if (!packageToBuy) {
        console.log('[RC] 🔄 currentPackage is null, re-fetching offerings...');
        const offerings = await Purchases.getOfferings();
        const offering = offerings.all[OFFERING_ID] ?? offerings.current;
        console.log('[RC] re-fetch target offering:', offering?.identifier ?? 'null');
        console.log('[RC] re-fetch packages count:', offering?.availablePackages?.length ?? 0);
        packageToBuy = offering?.availablePackages?.[0] ?? null;
        console.log('[RC] re-fetched package:', packageToBuy?.identifier ?? 'null');
        if (packageToBuy) setCurrentPackage(packageToBuy);
      }

      if (!packageToBuy) {
        console.log('[RC] ❌ Still null after re-fetch. Showing alert.');
        Alert.alert('Not available', 'No subscription packages found. Please try again later.');
        return;
      }

      console.log('[RC] 💳 Purchasing package:', packageToBuy.identifier);
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      console.log('[RC] ✅ Purchase done. Active entitlements:', JSON.stringify(Object.keys(customerInfo.entitlements.active)));
      if (REDIRECT_ENABLED && hasActiveEntitlement(customerInfo)) {
        router.replace('/discipline-select');
      }
    } catch (e: any) {
      console.log('[RC] ❌ Purchase error:', JSON.stringify(e));

      // Silently ignore user cancellations and dev/test environment billing errors
      const message: string = e?.message ?? '';
      const isBillingNotConfigured =
        message.toLowerCase().includes('not configured for billing') ||
        message.toLowerCase().includes('billing is not supported') ||
        e?.code === 'PURCHASE_NOT_ALLOWED' ||
        e?.code === 4;

      if (!e?.userCancelled && !isBillingNotConfigured) {
        Alert.alert('Purchase failed', message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      console.log('[RC] 🔁 Restoring purchases...');
      const customerInfo: CustomerInfo = await Purchases.restorePurchases();
      console.log('[RC] ✅ Restore result entitlements:', JSON.stringify(Object.keys(customerInfo.entitlements.active)));
      if (REDIRECT_ENABLED && hasActiveEntitlement(customerInfo)) {
        router.replace('/discipline-select');
      } else {
        Alert.alert('No subscription found', 'No active subscription was found for this account.');
      }
    } catch (e: any) {
      console.log('[RC] ❌ Restore error:', e);
      Alert.alert('Restore failed', e?.message ?? 'Could not restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#004aad" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.appName, { fontSize: titleSize }]}>Gym Judge</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Professional Judging Tool</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: sectionSize }]}>Premium Features</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Complete scoring</Text>
              <Text style={styles.featureDescription}>Full scoring workflow for Floor and Vault.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧮</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Fast input</Text>
              <Text style={styles.featureDescription}>Optimized number pad and judging flow.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎨</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Interactive whiteboard</Text>
              <Text style={styles.featureDescription}>Draw and annotate routines quickly.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📄</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>PDF reports</Text>
              <Text style={styles.featureDescription}>Generate professional reports to share.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📁</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Unlimited organization</Text>
              <Text style={styles.featureDescription}>Folders, competitions, and exports.</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: sectionSize }]}>Subscription</Text>

          <View style={styles.planCard}>
            <Text style={styles.planName}>Year to Year</Text>
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>$40</Text>
              <Text style={styles.planPeriod}>/year</Text>
            </View>
            <Text style={styles.planDetail}>Full access to the application</Text>

            <View style={styles.planBenefits}>
              <Text style={styles.planBenefit}>✓ Complete scoring for Floor and Vault</Text>
              <Text style={styles.planBenefit}>✓ PDF export</Text>
              <Text style={styles.planBenefit}>✓ Interactive whiteboard</Text>
              <Text style={styles.planBenefit}>✓ Unlimited folders and organization</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.subscribeButton, (isPurchasing || isRestoring) && styles.buttonDisabled]}
            onPress={handleSubscribe}
            activeOpacity={0.9}
            disabled={isPurchasing || isRestoring}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            activeOpacity={0.85}
            disabled={isPurchasing || isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator color="#004aad" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    paddingBottom: 22,
  },
  header: {
    backgroundColor: '#004aad',
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#e3f2fd',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 14,
  },
  featureIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#004aad',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#004aad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 18,
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: '#004aad',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#004aad',
  },
  planPeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
    marginBottom: 4,
  },
  planDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  planBenefits: {
    marginTop: 16,
  },
  planBenefit: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  restoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#004aad',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

});
