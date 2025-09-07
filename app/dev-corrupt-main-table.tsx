import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Switch, Alert, Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompetences, getMainTables, insertMainTable, updateMainTable } from '../Database/database';
import { Picker } from '@react-native-picker/picker';

/*
  Debug / Dev Screen: Insert a deliberately "corrupt" MainTable entry.
  - Select an existing competence (or type one manually)
  - Paste/enter partial JSON with fields to override
  - Toggle Corrupt Mode to intentionally break some fields (wrong types / removed keys)
  - Inserted record is written directly to AsyncStorage under key 'main_tables'

  Navigation: with expo-router, open /dev-corrupt-main-table
*/

const MAIN_TABLES_KEY = 'main_tables';

interface CompetenceOption {
  id: number; name: string; folderId: number; type: string;
}

// JSON de ejemplo (sin comentarios) para que no falle JSON.parse.
const placeholderJson = `{
  "name": "Athlete X Corrupt",
  "number": 99,
  "paths": "[ {\\"x\\":1,\\"y\\":2} ]",
  "dv": "not a number",
  "comments": "Injected via corrupt screen"
}`;

// Limpia comentarios // y /* */ y comas colgantes para tolerar entradas no estrictas.
const sanitizeJson = (raw: string): string => {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')          // /* */ comments
    .replace(/(^|[^:])\/\/.*$/gm, '$1')            // // comments (no dentro de valores tipo URL: asume simple)
    .replace(/,\s*([}\]])/g, '$1');                // trailing commas
};

export default function DevCorruptMainTableScreen() {
  const [competences, setCompetences] = useState<CompetenceOption[]>([]);
  const [selectedCompetenceId, setSelectedCompetenceId] = useState<number | undefined>();
  const [manualCompetenceId, setManualCompetenceId] = useState('');
  const [jsonInput, setJsonInput] = useState(placeholderJson);
  const [corruptMode, setCorruptMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastId, setLastId] = useState<number | null>(null);
  const [hasBackup, setHasBackup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const comps = await getCompetences();
        // basic shape map
        const mapped: CompetenceOption[] = comps.map(c => ({ id: c.id, name: c.name, folderId: c.folderId, type: c.type }));
        setCompetences(mapped);
      } catch (e) {
        console.warn('Failed loading competences', e);
      }
      try {
        const backup = await AsyncStorage.getItem(MAIN_TABLES_KEY + '_backup');
        if (backup) setHasBackup(true);
      } catch {}
    })();
  }, []);

  const resolveCompetenceId = (): number | null => {
    if (selectedCompetenceId != null) return selectedCompetenceId;
    if (manualCompetenceId.trim()) {
      const n = Number(manualCompetenceId.trim());
      if (!isNaN(n) && n > 0) return n;
    }
    return null;
  };

  const buildBaseRecord = (competenceId: number) => ({
    id: 0, // placeholder; replaced with next id
    competenceId,
    number: 0,
    name: 'CORRUPT_ENTRY',
    event: '',
    noc: '',
    bib: '',
    j: 0, i: 0, h: 0, g: 0, f: 0, e: 0, d: 0, c: 0, b: 0, a: 0,
    dv: 0, eg: 0, sb: 0, nd: 0, cv: 0, sv: 0, e2: 0, d3: 0, e3: 0, delt: 0, percentage: 0,
    stickBonus: false,
    numberOfElements: 0,
    difficultyValues: 0,
    elementGroups1: 0,
    elementGroups2: 0,
    elementGroups3: 0,
    elementGroups4: 0,
    elementGroups5: 0,
    execution: 0,
    eScore: 0,
    myScore: 0,
    compD: 0,
    compE: 0,
    compSd: 0,
    compNd: 0,
    compScore: 0,
    comments: '',
    paths: '[]',
    ded: 0,
    dedexecution: 0,
    vaultNumber: '',
    vaultDescription: '',
    startValue: 0,
    description: '',
    score: 0,
  });

  const insertCorrupt = async () => {
    const compId = resolveCompetenceId();
    if (!compId) {
      Alert.alert('Missing competence', 'Selecciona una competencia o ingresa el ID manual.');
      return;
    }
    let override: any = {};
    if (jsonInput.trim()) {
      try {
        const cleaned = sanitizeJson(jsonInput);
        override = JSON.parse(cleaned);
      } catch (e) {
        Alert.alert('JSON inválido', String(e));
        return;
      }
    }

    setIsSaving(true);
    try {
      const base = buildBaseRecord(compId);
      // Quitar id para usar insertMainTable (lo asigna internamente)
      delete (base as any).id;
      let candidate: any = { ...base, ...override };
      if (corruptMode) {
        // Mantener opción de forzar corrupción: si se corrompe, insertMainTable fallará (validación)
        delete candidate.paths;
        candidate.dv = 'NaN';
        candidate.execution = 'bad';
        candidate.compScore = null;
        candidate.extraUnknownField = { x: 1 };
      }
      const newId = await insertMainTable(candidate);
      if (newId === false) {
        Alert.alert('Creación fallida', corruptMode ? 'Validación bloqueó el registro corrupto (esperado).' : 'No se pudo crear el registro. Revisa los datos.');
      } else {
        setLastId(newId);
        Alert.alert('Insertado', `MainTable ID ${newId} creado${corruptMode ? ' (modo corrupt intentado)' : ''}.`);
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setIsSaving(false);
    }
  };

  // Intenta una actualización inválida usando updateMainTable (sin tocar JSON directo)
  const corruptWithInvalidJson = async () => {
    setIsSaving(true);
    try {
      // Asegurar existencia de un registro para actualizar
      const compId = resolveCompetenceId() || 1;
      let tables = await getMainTables();
      let targetId: number | null = null;
      if (tables.length === 0) {
        const base = buildBaseRecord(compId);
        delete (base as any).id;
        const newId = await insertMainTable({ ...base, name: 'INVALID_UPDATE_TEST' });
        if (newId === false) {
          Alert.alert('No se pudo crear', 'Falló inserción base para la prueba');
          setIsSaving(false);
          return;
        }
        targetId = newId;
      } else {
        targetId = (tables[tables.length - 1] as any).id;
      }
      if (!targetId) {
        Alert.alert('Sin ID', 'No se obtuvo un ID válido para actualizar');
        setIsSaving(false);
        return;
      }
      // Patch inválido: tipos incorrectos y eliminación de paths (mandando valor no string)
      const badPatch: any = {
        dv: 'NaN',
        execution: 'bad',
        compScore: null,
        paths: 12345, // debe ser string
        extraUnknownField: { nope: true }
      };
      const ok = await updateMainTable(targetId, badPatch);
      if (!ok) {
        Alert.alert('Validación', 'updateMainTable bloqueó la actualización inválida (correcto).');
      } else {
        Alert.alert('Inesperado', 'La actualización inválida fue aceptada (revisar validación).');
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setIsSaving(false);
    }
  };

  // Restaura backup previo si existe
  const restoreBackup = async () => {
    try {
      const backup = await AsyncStorage.getItem(MAIN_TABLES_KEY + '_backup');
      if (!backup) {
        Alert.alert('Sin backup', 'No existe backup para restaurar.');
        setHasBackup(false);
        return;
      }
      await AsyncStorage.setItem(MAIN_TABLES_KEY, backup);
      Alert.alert('Restaurado', 'Se restauró el contenido válido de main_tables.');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Insert Corrupt MainTable</Text>

      <Text style={styles.label}>Seleccionar Competence</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCompetenceId}
          onValueChange={(v) => setSelectedCompetenceId(v)}
          mode={Platform.OS === 'ios' ? 'dialog' : 'dropdown'}
        >
          <Picker.Item label="-- Ninguna --" value={undefined} />
          {competences.map(c => (
            <Picker.Item key={c.id} label={`#${c.id} ${c.name}`} value={c.id} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>O ID manual de Competence</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: 5"
        keyboardType="numeric"
        value={manualCompetenceId}
        onChangeText={setManualCompetenceId}
      />

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Corrupt Mode</Text>
        <Switch value={corruptMode} onValueChange={setCorruptMode} />
      </View>

      <Text style={styles.label}>JSON parcial para override</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        value={jsonInput}
        onChangeText={setJsonInput}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.button} onPress={insertCorrupt} disabled={isSaving}>
        <Text style={styles.buttonText}>{isSaving ? 'Guardando...' : 'Insertar Corrupt MainTable'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: '#b30000' }]} onPress={corruptWithInvalidJson} disabled={isSaving}>
        <Text style={styles.buttonText}>{isSaving ? 'Procesando...' : 'Probar update inválido'}</Text>
      </TouchableOpacity>

      {hasBackup && (
        <TouchableOpacity style={[styles.button, { backgroundColor: '#555' }]} onPress={restoreBackup}>
          <Text style={styles.buttonText}>Restaurar Backup main_tables</Text>
        </TouchableOpacity>
      )}

      {lastId && (
        <Text style={styles.info}>Último ID insertado: {lastId}</Text>
      )}

      <Text style={styles.note}>Nota: Esto escribe directamente en AsyncStorage y puede crear datos inválidos para probar la recuperación.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 10, fontSize: 14 },
  textArea: { minHeight: 180, textAlignVertical: 'top' },
  pickerWrapper: { borderWidth: 1, borderColor: '#999', borderRadius: 8, overflow: 'hidden' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  info: { marginTop: 12, fontSize: 14 },
  note: { marginTop: 20, fontSize: 12, color: '#666' }
});
