/**
 * RevenueCat Error Handling Utilities
 * Maneja errores comunes de configuración de tienda y compras
 */

export interface BillingError {
  code: string;
  message: string;
  isRecoverable: boolean;
  suggestedAction: string;
}

export const BILLING_ERROR_CODES = {
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  BILLING_UNAVAILABLE: 'BILLING_UNAVAILABLE',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

/**
 * Interpreta el error de RevenueCat y proporciona sugerencias
 */
export const interpretBillingError = (error: any): BillingError => {
  const errorStr = String(error);
  const errorMsg = error?.message || errorStr;

  // SERVICE_UNAVAILABLE = No hay acceso a Google Play Billing
  if (
    errorMsg.includes('SERVICE_UNAVAILABLE') ||
    errorMsg.includes('Billing is unavailable') ||
    errorMsg.includes('internal error occurred')
  ) {
    return {
      code: BILLING_ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'El servicio de facturación no está disponible',
      isRecoverable: true,
      suggestedAction:
        'Android: Asegúrate que el emulador tiene Google Play Services instalado. ' +
        'iOS: Usa un dispositivo real (Simulator no soporta compras completas).',
    };
  }

  // PRODUCT_NOT_FOUND
  if (errorMsg.includes('PRODUCT_NOT_FOUND') || errorMsg.includes('Offerings')) {
    return {
      code: BILLING_ERROR_CODES.PRODUCT_NOT_FOUND,
      message: 'El producto no está configurado en la tienda',
      isRecoverable: false,
      suggestedAction:
        'Verifica que "gym_judge_yearly" está creado y activado en Google Play Console/App Store Connect.',
    };
  }

  // Network error
  if (errorMsg.includes('network') || errorMsg.includes('Network')) {
    return {
      code: BILLING_ERROR_CODES.NETWORK_ERROR,
      message: 'Error de conexión con la tienda',
      isRecoverable: true,
      suggestedAction: 'Verifica tu conexión a internet e intenta de nuevo.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: errorMsg || 'Error desconocido en facturación',
    isRecoverable: true,
    suggestedAction: 'Reinicia la app e intenta de nuevo.',
  };
};

/**
 * Determina si el error es temporal y puede reintentar
 */
export const isBillingErrorRetryable = (error: any): boolean => {
  const interpreted = interpretBillingError(error);
  return interpreted.isRecoverable;
};

/**
 * Formatea un error de RevenueCat para logging
 */
export const formatBillingError = (error: any): string => {
  const interpreted = interpretBillingError(error);
  return `[Billing Error] ${interpreted.code}: ${interpreted.message}\n` +
         `Sugerencia: ${interpreted.suggestedAction}`;
};

/**
 * Hook para retry automático con backoff exponencial
 */
export const createBillingRetry = (
  maxAttempts: number = 3,
  initialDelayMs: number = 1000
) => {
  let attempts = 0;

  return async <T,>(fn: () => Promise<T>): Promise<T> => {
    let lastError: any;

    for (attempts = 0; attempts < maxAttempts; attempts++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!isBillingErrorRetryable(error)) {
          throw error; // No retryable, throw immediately
        }

        if (attempts < maxAttempts - 1) {
          const delay = initialDelayMs * Math.pow(2, attempts);
          console.log(
            `[Billing Retry] Intento ${attempts + 1}/${maxAttempts} falló. ` +
            `Reintentando en ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  };
};
