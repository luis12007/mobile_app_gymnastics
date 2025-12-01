import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase, setDiscipline } from '../lib/database';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Inicializar la base de datos al cargar la app
    initDatabase().catch(error => {
      console.error('Error al inicializar la base de datos:', error);
    });
  }, []);

  const handleDisciplineSelect = async (discipline: 'MAG' | 'WAG') => {
    try {
      await setDiscipline(discipline);
      console.log(`Disciplina seleccionada: ${discipline}`);
      router.push('/main-menu');
    } catch (error) {
      console.error('Error al establecer disciplina:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gym Judge</Text>
      <Text style={styles.version}>v1.6.0</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.magButton]}
          onPress={() => handleDisciplineSelect('MAG')}
        >
          <Text style={styles.buttonText}>MAG</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.wagButton]}
          onPress={() => handleDisciplineSelect('WAG')}
        >
          <Text style={styles.buttonText}>WAG</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  magButton: {
    backgroundColor: '#004aad',
  },
  wagButton: {
    backgroundColor: '#e91e63',
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
