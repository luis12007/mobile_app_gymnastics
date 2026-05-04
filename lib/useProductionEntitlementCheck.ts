/**
 * Hook para validar que el usuario tiene una entitlemente de producción
 * Devuelve el estado en lugar de redirigir
 */

import { useEffect, useState } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

const ENTITLEMENT_ID = 'entlf790b1e170';

/**
 * Hook que valida si el usuario tiene entitlemente de producción
 * Devuelve un objeto con la información de validación
 * @param screenName - Nombre de la pantalla actual para logging
 * @param skipValidation - Si true, salta la validación
 */
export const useProductionEntitlementCheck = (
  screenName: string,
  skipValidation: boolean = false
): { hasProduction: boolean; isLoading: boolean } => {
  const [hasProduction, setHasProduction] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Si skipValidation es true, permitir acceso sin validar
    if (skipValidation) {
      console.log(`[${screenName}] Validation skipped (SKIP_PAYWALL mode)`);
      setHasProduction(true);
      setIsLoading(false);
      return;
    }

    const validateEntitlement = async () => {
      try {
        const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();

        // Obtener el entitlemente principal
        const activeEntitlements = Object.keys(customerInfo.entitlements.active ?? {});
        const hasActiveEntitlement =
          activeEntitlements.includes(ENTITLEMENT_ID) || activeEntitlements.length > 0;

        // Validar que es de producción (no sandbox)
        const primaryEntitlement =
          customerInfo.entitlements.active?.[ENTITLEMENT_ID] ||
          (activeEntitlements.length > 0
            ? customerInfo.entitlements.active[activeEntitlements[0]]
            : null);

        const isProduction =
          Boolean(primaryEntitlement?.isActive) && primaryEntitlement?.isSandbox === false;

        console.log(`[${screenName}] Entitlement check:`, {
          hasActiveEntitlement,
          isProduction,
          isSandbox: primaryEntitlement?.isSandbox,
          isActive: primaryEntitlement?.isActive,
        });

        setHasProduction(isProduction);
      } catch (error) {
        console.error(`[${screenName}] ❌ Error checking entitlement:`, error);
        setHasProduction(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateEntitlement();
  }, [screenName, skipValidation]);

  return { hasProduction, isLoading };
};

/**
 * Función utilitaria para obtener información de entitlemente
 */
export const getEntitlementInfo = async () => {
  try {
    const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();

    const activeEntitlements = Object.keys(customerInfo.entitlements.active ?? {});
    const hasActiveEntitlement =
      activeEntitlements.includes(ENTITLEMENT_ID) || activeEntitlements.length > 0;

    const primaryEntitlement =
      customerInfo.entitlements.active?.[ENTITLEMENT_ID] ||
      (activeEntitlements.length > 0
        ? customerInfo.entitlements.active[activeEntitlements[0]]
        : null);

    const hasProductionEntitlement =
      Boolean(primaryEntitlement?.isActive) && primaryEntitlement?.isSandbox === false;
    const isSandbox = primaryEntitlement?.isSandbox === true;

    return {
      hasActiveEntitlement,
      hasProductionEntitlement,
      isSandbox,
      primaryEntitlement,
    };
  } catch (error) {
    console.error('[getEntitlementInfo] Error:', error);
    return {
      hasActiveEntitlement: false,
      hasProductionEntitlement: false,
      isSandbox: false,
      primaryEntitlement: null,
    };
  }
};
