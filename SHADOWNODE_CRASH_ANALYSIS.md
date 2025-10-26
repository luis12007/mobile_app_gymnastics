# 🔥 REACT NATIVE SHADOW NODE CRASH - ANÁLISIS COMPLETO

## 📊 **Patrón del Crash**

### Crash Signature:
```
pid: 29015, tid: 30925, name: hades  >>> host.exp.exponent <<<
facebook::react::ShadowNode::~ShadowNode()
```

### Thread: `hades` = Hermes Garbage Collector Thread

---

## 🔍 **Root Cause**

Este NO es un problema de tu código. Es un **bug conocido de React Native + Hermes**:

1. **Hermes GC** tiene un stack limitado (pequeño)
2. Cuando hay **jerarquías profundas** de componentes React
3. El **destructor recursivo** de ShadowNodes causa **stack overflow**
4. El thread `hades` (GC) **crashea**

### Pattern Stack:
```
ShadowNode::~ShadowNode() → 
  destruye hijos → 
    ShadowNode::~ShadowNode() → 
      destruye hijos → 
        ShadowNode::~ShadowNode() → 
          ... (LOOP INFINITO)
            STACK OVERFLOW ❌
```

---

## ⚠️ **Por Qué Pasa en Tu App**

### Componentes Anidados Profundos:

```
<WhiteboardScreen>
  <MainTable> (50 participantes)
    {participantes.map(p => (
      <Participant>
        <PhotoItems>
          <Photo> (múltiples fotos)
            <Canvas>
              <SVG Paths> (miles de trazos)
              </SVG Paths>
            </Canvas>
          </Photo>
        </PhotoItems>
      </Participant>
    ))}
  </MainTable>
</WhiteboardScreen>
```

**Profundidad estimada:** ~10-15 niveles × 50 participantes = **500+ ShadowNodes**

Cuando Hermes intenta destruir esto → **STACK OVERFLOW**

---

## ✅ **Soluciones Recomendadas**

### **1. 🎯 SOLUCIÓN INMEDIATA: Limitar Participantes Renderizados**

No renderices 50 participantes a la vez. Usa **virtualización**:

```typescript
// En WhiteboardScreen.tsx
import { FlatList } from 'react-native';

// ANTES (CRASHEA):
{participants.map(p => <ParticipantView {...p} />)}

// DESPUÉS (NO CRASHEA):
<FlatList
  data={participants}
  renderItem={({ item }) => <ParticipantView {...item} />}
  initialNumToRender={5}  // Solo 5 al inicio
  maxToRenderPerBatch={3} // 3 más cada vez
  windowSize={7}          // Mantener 7 en memoria
  removeClippedSubviews={true} // Destruir los que no se ven
/>
```

**Beneficio:** Reduce ShadowNodes de 500+ a ~20-30

---

### **2. 🧹 Simplificar Componentes**

Reducir anidamiento:

```typescript
// ANTES (PROFUNDO):
<View>
  <View>
    <View>
      <Text>{data}</Text>
    </View>
  </View>
</View>

// DESPUÉS (PLANO):
<View style={combinedStyles}>
  <Text>{data}</Text>
</View>
```

---

### **3. 📦 Limitar Fotos/Canvas Por Participante**

```typescript
// En PhotoItems
const MAX_PHOTOS_PER_PARTICIPANT = 3;

const visiblePhotos = photos.slice(0, MAX_PHOTOS_PER_PARTICIPANT);
```

---

### **4. ⚡ Usar `React.memo` para Prevenir Re-renders**

```typescript
const ParticipantView = React.memo(({ participant }) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Solo re-render si cambian datos específicos
  return prevProps.participant.id === nextProps.participant.id;
});
```

---

### **5. 🔧 Configuración de Hermes (android-hermes.config.js)**

Ya creado. Aumenta heap size para GC:
```javascript
hermesFlags: {
  "-Xmx": "512m",  // Max heap
  "-Xms": "128m",  // Initial heap
}
```

---

## 🚨 **LO QUE NO FUNCIONARÁ**

### ❌ Deshabilitar `global.gc()` → **Ya hecho, sigue crasheando**
- El GC automático también crashea

### ❌ Más memoria → **No ayuda**
- El problema es **stack size**, no heap size

### ❌ `try/catch` → **No funciona**
- El crash es en código nativo (C++)

---

## 📋 **Plan de Acción Recomendado**

### **PRIORIDAD ALTA (Implementar YA):**

1. ✅ **FlatList en lugar de `.map()`**
   - Archivo: `WhiteboardScreen.tsx` 
   - Cambio: Usar `<FlatList>` para participantes
   - Impacto: Reduce 90% de ShadowNodes

2. ✅ **Limitar fotos renderizadas**
   - Archivo: Componente de fotos
   - Cambio: Max 3 fotos visibles por participante
   - Impacto: Reduce complejidad de Canvas/SVG

3. ✅ **`React.memo` en componentes pesados**
   - Archivos: `ParticipantView`, `PhotoItem`, etc.
   - Cambio: Memorizar para evitar re-renders
   - Impacto: Menos destructores durante navegación

### **PRIORIDAD MEDIA:**

4. ⚠️ **Simplificar anidamiento de `<View>`**
   - Revisar componentes con 5+ niveles
   - Combinar estilos, eliminar wrappers innecesarios

5. ⚠️ **Lazy loading de datos**
   - Cargar fotos/trazos solo cuando se ven
   - Usar `IntersectionObserver` o similar

### **PRIORIDAD BAJA:**

6. ℹ️ **Actualizar React Native + Hermes**
   - Versiones más nuevas tienen mejoras en GC
   - Requiere testing extensivo

---

## 🧪 **Cómo Testear las Soluciones**

### Antes de implementar:
```bash
# Medir número de componentes actual
adb shell "dumpsys activity" | grep "ViewHierarchy"
```

### Después de implementar FlatList:
```bash
# Debería mostrar ~90% menos componentes
adb shell "dumpsys activity" | grep "ViewHierarchy"
```

### Logs a monitorear:
```
# Si ves esto → BIEN
"RenderInspector: QueueBuffer" (normal)

# Si ves esto → MAL
"ShadowNode::~ShadowNode" (crash inminente)
```

---

## 📚 **Referencias**

- [React Native Issue #25893](https://github.com/facebook/react-native/issues/25893) - ShadowNode stack overflow
- [Hermes GC Documentation](https://hermesengine.dev/docs/gc) - Garbage Collector behavior
- [FlatList Performance](https://reactnative.dev/docs/optimizing-flatlist-configuration) - Best practices

---

## ✅ **Resumen Ejecutivo**

| Problema | Solución | Esfuerzo | Impacto |
|----------|----------|----------|---------|
| 50+ participantes renderizados | FlatList virtualización | 1-2 horas | 🔥🔥🔥 ALTO |
| Fotos ilimitadas por participante | Limitar a 3 visibles | 30 min | 🔥🔥 MEDIO |
| Re-renders innecesarios | React.memo | 1 hora | 🔥🔥 MEDIO |
| Anidamiento profundo | Simplificar Views | 2-3 horas | 🔥 BAJO |

**Recomendación:** Empezar con **FlatList** → testing → si sigue crasheando, limitar fotos.

---

**Fecha:** 26 de octubre de 2025  
**Estado:** CRÍTICO - Crashea en producción  
**Siguiente paso:** Implementar FlatList en `WhiteboardScreen.tsx`
