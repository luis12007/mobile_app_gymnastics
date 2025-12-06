import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function Index() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | null>('annual');

  const handleSubscribe = () => {
    // TODO: Implementar lógica de suscripción (integración con RevenueCat, Stripe, etc.)
    console.log('Procesando suscripción anual...');
    
    // Navegar a la pantalla de selección de disciplina
    router.replace('/discipline-select');
  };

  const handleRestore = () => {
    // TODO: Implementar lógica de restaurar compras
    console.log('Restaurando compras...');
    
    // Si la restauración es exitosa, navegar a selección de disciplina
    // router.replace('/discipline-select');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#004aad" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Gym Judge</Text>
          <Text style={styles.subtitle}>Herramienta Profesional de Evaluación</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>✨ Funcionalidades Premium</Text>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Evaluaciones Completas</Text>
              <Text style={styles.featureDescription}>
                Sistema completo de puntuación para Floor y Vault
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎨</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Whiteboard Interactivo</Text>
              <Text style={styles.featureDescription}>
                Dibuja y anota directamente sobre las rutinas
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📄</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reportes PDF</Text>
              <Text style={styles.featureDescription}>
                Genera reportes profesionales para compartir
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📁</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Organización Ilimitada</Text>
              <Text style={styles.featureDescription}>
                Crea carpetas y gestiona múltiples competencias
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>☁️</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Almacenamiento Local</Text>
              <Text style={styles.featureDescription}>
                Todos tus datos seguros en tu dispositivo
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔄</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Actualizaciones Continuas</Text>
              <Text style={styles.featureDescription}>
                Nuevas funcionalidades y mejoras regulares
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingContainer}>
          <TouchableOpacity 
            style={[styles.pricingCard, selectedPlan === 'annual' && styles.selectedCard]}
            onPress={() => setSelectedPlan('annual')}
            activeOpacity={0.8}
          >
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>MEJOR VALOR</Text>
              </View>
            </View>
            
            <Text style={styles.planTitle}>Suscripción Anual</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>29.99</Text>
              <Text style={styles.period}>/año</Text>
            </View>

            <View style={styles.savingsContainer}>
              <Text style={styles.savingsText}>Ahorra 50% vs. mensual</Text>
            </View>

            <View style={styles.benefitsList}>
              <Text style={styles.benefit}>✓ Acceso completo a todas las funciones</Text>
              <Text style={styles.benefit}>✓ Sin anuncios</Text>
              <Text style={styles.benefit}>✓ Soporte prioritario</Text>
              <Text style={styles.benefit}>✓ Cancela cuando quieras</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          activeOpacity={0.9}
        >
          <Text style={styles.subscribeButtonText}>Suscribirme Ahora</Text>
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity 
          style={styles.restoreButton}
          onPress={handleRestore}
        >
          <Text style={styles.restoreButtonText}>Restaurar Compras</Text>
        </TouchableOpacity>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            La suscripción se renueva automáticamente a menos que se cancele 
            al menos 24 horas antes del final del período actual.
          </Text>
          <View style={styles.termsLinks}>
            <Text style={styles.termsLink}>Términos de Servicio</Text>
            <Text style={styles.termsSeparator}>•</Text>
            <Text style={styles.termsLink}>Política de Privacidad</Text>
          </View>
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
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#004aad',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pricingContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  pricingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#004aad',
    borderWidth: 3,
  },
  badgeContainer: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 10,
  },
  currency: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#004aad',
    marginTop: 5,
  },
  price: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#004aad',
    lineHeight: 56,
  },
  period: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  savingsContainer: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  benefitsList: {
    marginTop: 10,
  },
  benefit: {
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  subscribeButton: {
    backgroundColor: '#004aad',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: '#004aad',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  restoreButton: {
    marginHorizontal: 20,
    marginTop: 15,
    paddingVertical: 12,
  },
  restoreButtonText: {
    color: '#004aad',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  termsContainer: {
    paddingHorizontal: 30,
    marginTop: 30,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  termsLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  termsLink: {
    fontSize: 12,
    color: '#004aad',
    fontWeight: '600',
  },
  termsSeparator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 8,
  },
});
