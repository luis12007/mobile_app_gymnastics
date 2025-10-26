# 🔧 Fix: Text strings must be rendered within a <Text> component

## Problema
La aplicación se cerraba sin mensaje de error en Android. Al revisar los logs de Expo, apareció:

```
ERROR  Text strings must be rendered within a <Text> component.
Call Stack: folderPath.map$argument_0 (app\main-menu.tsx)
```

## Causa Raíz
En React Native, **cualquier valor primitivo (string, number, boolean, null, undefined) DEBE estar dentro de un componente `<Text>`**. Si una expresión JSX retorna un valor primitivo directamente, la app crashea silenciosamente en Android.

## Cambios Aplicados

### 1. **`app/main-menu.tsx` - Línea ~2710**
**Antes:**
```tsx
<Text>{folder.name}</Text>
```

**Después:**
```tsx
<Text>{folder.name || 'Unnamed'}</Text>
```

**Por qué:** Si `folder.name` es `null` o `undefined`, React intentaría renderizar esos valores directamente, causando crash.

---

### 2. **`components/WhiteboardScreen_jump.tsx` - Línea ~1665**
**Antes:**
```tsx
<Text style={styles.strokeValue}>{currentStrokeWidth}</Text>
```

**Después:**
```tsx
<Text style={styles.strokeValue}>{currentStrokeWidth || 2}</Text>
```

**Por qué:** Si `currentStrokeWidth` es `undefined` al inicializar, crashea.

---

### 3. **`components/WhiteboardScreen_jump.tsx` - Línea ~1970**
**Antes:**
```tsx
<Text style={styles.percentageText}>{percentage}</Text>
```

**Después:**
```tsx
<Text style={styles.percentageText}>{percentage !== null && percentage !== undefined ? percentage : '0.0'}</Text>
```

**Por qué:** Si `percentage` es `null` o `undefined`, crashea. Usamos validación explícita porque `0` es un valor válido.

---

## ✅ Soluciones Preventivas

### Patrón Seguro #1: Valores con fallback
```tsx
// ❌ MAL
<Text>{userName}</Text>

// ✅ BIEN
<Text>{userName || 'Guest'}</Text>
<Text>{count || 0}</Text>
```

### Patrón Seguro #2: Validación explícita
```tsx
// ❌ MAL
<Text>{score}</Text>

// ✅ BIEN
<Text>{score !== null && score !== undefined ? score : '0'}</Text>
```

### Patrón Seguro #3: Condicional con ternario
```tsx
// ❌ MAL
{isLoading && 'Loading...'}

// ✅ BIEN
{isLoading && <Text>Loading...</Text>}
{isLoading ? <Text>Loading...</Text> : null}
```

### Patrón Seguro #4: Conversión a string
```tsx
// ❌ MAL
<Text>{userData.age}</Text>

// ✅ BIEN
<Text>{String(userData.age ?? 'N/A')}</Text>
```

---

## 🐛 Cómo Detectar Este Error

### Síntomas:
- ✅ App se cierra **sin mensaje de error**
- ✅ No aparece stack trace en la terminal
- ✅ Solo en **Android** (iOS puede ser más permisivo)
- ✅ El crash es **silencioso**

### En los logs de Expo aparece:
```
ERROR  Text strings must be rendered within a <Text> component.
```

### Cómo revisar:
```powershell
# Ver logs en tiempo real
npx expo start

# Conectar móvil y ver logs
# Buscar "Text strings" en la salida
```

---

## 📋 Checklist de Revisión

Antes de deploy, verifica:

- [ ] Todos los valores primitivos están dentro de `<Text>`
- [ ] Todos los números tienen fallback: `{value || 0}`
- [ ] Todos los strings tienen fallback: `{text || 'Default'}`
- [ ] Los valores que pueden ser 0 usan validación explícita: `{val !== null && val !== undefined ? val : 'N/A'}`
- [ ] No hay expresiones que retornen string directamente en JSX
- [ ] No hay booleanos renderizados directamente: `{isActive}` ❌

---

## 🔍 Errores Comunes

### ❌ Error #1: Renderizar boolean
```tsx
// CRASH
<View>
  {isActive}
</View>

// FIX
<View>
  {isActive && <Text>Active</Text>}
</View>
```

### ❌ Error #2: Renderizar null/undefined
```tsx
// CRASH
<Text>{user.name}</Text>  // si user.name es undefined

// FIX
<Text>{user.name || 'Unknown'}</Text>
```

### ❌ Error #3: Renderizar number sin protección
```tsx
// CRASH (si count es undefined)
<Text>{count}</Text>

// FIX
<Text>{count ?? 0}</Text>
```

### ❌ Error #4: Ternario que retorna string
```tsx
// CRASH
{isError ? 'Error occurred' : null}

// FIX
{isError ? <Text>Error occurred</Text> : null}
```

---

## 🚀 Testing

### Para verificar que el fix funciona:

1. **Recarga la app:**
   ```
   npx expo start
   Presiona 'r' para reload
   ```

2. **Prueba las rutas que crasheaban:**
   - Main Menu → Navega carpetas
   - Whiteboard Jump → Verifica que carga
   - Cambia valores (strokeWidth, percentage)

3. **Verifica que NO aparezca:**
   ```
   ERROR  Text strings must be rendered within a <Text> component.
   ```

---

## 📚 Recursos

- [React Native Text Component](https://reactnative.dev/docs/text)
- [Common Errors](https://reactnative.dev/docs/debugging#common-errors)

---

**Fecha:** 19 de octubre de 2025
**Archivos Modificados:**
- `app/main-menu.tsx`
- `components/WhiteboardScreen_jump.tsx`

**Status:** ✅ Resuelto
