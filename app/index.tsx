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

export default function Index() {
  const router = useRouter();
  const { height } = useWindowDimensions();

  const isSmall = height < 720;
  const titleSize = isSmall ? 34 : 40;
  const subtitleSize = isSmall ? 14 : 16;
  const sectionSize = isSmall ? 18 : 20;

  const handleSubscribe = () => {
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
          <Text style={[styles.sectionTitle, { fontSize: sectionSize }]}>Subscription</Text>

          <View style={styles.planCard}>
            <Text style={styles.planName}>Month to Month</Text>
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>$40</Text>
              <Text style={styles.planPeriod}>/mo</Text>
            </View>
            <Text style={styles.planDetail}>Full access to the application</Text>

            <View style={styles.planBenefits}>
              <Text style={styles.planBenefit}>✓ Complete scoring for Floor and Vault</Text>
              <Text style={styles.planBenefit}>✓ PDF export</Text>
              <Text style={styles.planBenefit}>✓ Interactive whiteboard</Text>
              <Text style={styles.planBenefit}>✓ Unlimited folders and organization</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} activeOpacity={0.9}>
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
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

});
