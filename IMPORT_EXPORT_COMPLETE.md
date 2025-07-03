# Funcionalidad de Import/Export - COMPLETADA

## Resumen de la implementación

Se ha añadido exitosamente la funcionalidad de Import/Export al menú principal (index.tsx) de la aplicación de gimnasia.

### Características implementadas:

#### 1. **Botones de Import/Export**
- **Ubicación**: Esquina superior izquierda de la pantalla principal
- **Estilos**: Botones verdes con texto blanco, adaptables a diferentes tamaños de dispositivo
- **Visibilidad**: Siempre visibles en la pantalla principal

#### 2. **Funcionalidad de Export**
- **Selección de Folder**: Modal que permite al usuario seleccionar un folder de sus carpetas existentes
- **Exportación Segura**: Los datos se exportan en formato JSON seguro con:
  - Codificación Base64 para proteger los datos
  - Checksum SHA256 para verificar integridad
  - Metadatos de versión y fecha de exportación
- **Datos Exportados**:
  - Información del folder completa
  - Todas las competencias dentro del folder
  - Todas las tablas principales de cada competencia
  - Todas las tablas de calificación (general y salto) asociadas
- **Compartir**: El archivo se crea y se comparte usando el sistema nativo del dispositivo

#### 3. **Funcionalidad de Import**
- **Selección de Archivo**: Permite al usuario seleccionar un archivo JSON de importación
- **Validación de Seguridad**:
  - Verifica la integridad del archivo usando checksum
  - Valida la estructura de datos
  - Previene corrupción de datos
- **Remapeo de IDs**: Los IDs se remapean automáticamente para evitar conflictos
- **Asignación de Usuario**: Los datos importados se asignan al usuario actual
- **Recreación Completa**: Se recrean todas las relaciones entre folders, competencias y tablas

#### 4. **Funciones de Base de Datos**
- `exportFolderData(folderId)`: Exporta un folder completo con toda su información relacionada
- `importFolderData(importDataString, targetUserId)`: Importa datos y los asigna a un usuario específico
- `generateChecksum(data)`: Genera checksums para verificación de integridad

#### 5. **Interfaz de Usuario**
- **Modal de Exportación**: 
  - Lista de folders del usuario
  - Selección visual del folder
  - Botón de exportar con estado de carga
  - Botón de cerrar
- **Modal de Importación**:
  - Botón para seleccionar archivo
  - Estado de carga durante importación
  - Mensajes de éxito/error
  - Botón de cerrar

### Seguridad y Integridad
- **Codificación Base64**: Protege los datos durante la transferencia
- **Checksums SHA256**: Garantiza que los datos no se han corrompido
- **Validación de Estructura**: Verifica que el archivo tenga el formato correcto
- **Remapeo de IDs**: Previene conflictos con datos existentes

### Experiencia de Usuario
- **Feedback Visual**: Botones de carga y mensajes informativos
- **Manejo de Errores**: Alertas claras en caso de problemas
- **Proceso Intuitivo**: Interfaz simple y clara para ambas operaciones
- **Compatibilidad**: Funciona en todos los tamaños de dispositivo soportados

### Archivos Modificados
1. **app/index.tsx**: Interfaz principal con botones y modales
2. **Database/database.ts**: Funciones de exportación e importación (ya existían)

### Uso de la Funcionalidad
1. **Para Exportar**:
   - Hacer clic en el botón "Export" (esquina superior izquierda)
   - Seleccionar el folder que se desea exportar
   - Hacer clic en "Exportar Folder"
   - Compartir el archivo generado

2. **Para Importar**:
   - Hacer clic en el botón "Import" (esquina superior izquierda)
   - Hacer clic en "Seleccionar archivo"
   - Elegir el archivo JSON de importación
   - Confirmar la importación

La funcionalidad está lista para uso en producción y proporciona una forma segura y confiable de transferir datos de folders completos entre dispositivos o usuarios.
