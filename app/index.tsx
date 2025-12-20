import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

type PlanId = 'monthly' | 'annual' | 'one_time';

export default function Index() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();

  const isSmall = height < 720;
  const titleSize = isSmall ? 34 : 40;
  const subtitleSize = isSmall ? 14 : 16;
  const sectionSize = isSmall ? 18 : 20;

  const planCardWidth = Math.min(320, Math.max(260, Math.floor(width * 0.78)));

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const plans = useMemo(
    () => [
      {
        id: 'monthly' as const,
        title: 'Monthly',
        price: '$4.99',
        detail: 'Billed every month',
        benefits: ['Full access to scoring', 'PDF export', 'Whiteboard'],
      },
      {
        id: 'annual' as const,
        title: 'Annual',
        price: '$29.99',
        detail: 'Best value (12 months)',
        benefits: ['Full access to scoring', 'PDF export', 'Whiteboard', 'Save vs monthly'],
      },
      {
        id: 'one_time' as const,
        title: 'One-time payment',
        price: '$49.99',
        detail: 'Single payment, no renewals',
        benefits: ['Full access to scoring', 'PDF export', 'Whiteboard'],
      },
    ],
    []
  );

  const handleSubscribe = () => {
    // No subscription logic yet — just continue.
    // If nothing selected, keep it simple: default to annual.
    const planToUse: PlanId = selectedPlan ?? 'annual';
    setSelectedPlan(planToUse);
    router.replace('/discipline-select');
  };

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
          <Text style={[styles.sectionTitle, { fontSize: sectionSize }]}>Choose a plan</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planCarousel}
            snapToInterval={planCardWidth + 14}
            decelerationRate="fast"
          >
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedPlan(p.id)}
                  style={[
                    styles.planCard,
                    { width: planCardWidth },
                    isSelected && styles.planCardSelected,
                  ]}
                >
                  <Text style={styles.planName}>{p.title}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>{p.price}</Text>
                    <Text style={styles.planPeriod}>{p.id === 'monthly' ? '/mo' : p.id === 'annual' ? '/yr' : ''}</Text>
                  </View>
                  <Text style={styles.planDetail}>{p.detail}</Text>

                  <View style={styles.planBenefits}>
                    {p.benefits.slice(0, 3).map((b) => (
                      <Text key={b} style={styles.planBenefit}>
                        ✓ {b}
                      </Text>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} activeOpacity={0.9}>
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>

          <Text style={styles.smallNote}>
            {selectedPlan ? 'Plan selected. Tap Subscribe Now to continue.' : 'Select a plan to continue.'}
          </Text>
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
  smallNote: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: '#777',
  },

  planCarousel: {
    paddingRight: 20,
    paddingLeft: 20,
    paddingBottom: 6,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  planCardSelected: {
    borderColor: '#004aad',
    borderWidth: 3,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#004aad',
  },
  planPeriod: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    marginBottom: 4,
  },
  planDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  planBenefits: {
    marginTop: 12,
  },
  planBenefit: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
  },

});
