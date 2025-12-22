import React, { forwardRef, memo, useCallback, useState } from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import WhiteboardScreen, { WhiteboardRef } from './WhiteboardScreen';
import VaultSelectorModalWag from './ModalVaultWag';
import VaultSelectorModalMag from './ModalVaultMag';

const TEXT_FONT_DELTA = -3;

const Text = ({ style, ...props }: React.ComponentProps<typeof RNText>) => {
  const flattened = style ? (StyleSheet.flatten(style as any) as any) : undefined;
  const adjustedStyle =
    flattened && typeof flattened.fontSize === 'number'
      ? ({ ...flattened, fontSize: Math.max(1, flattened.fontSize + TEXT_FONT_DELTA) } as any)
      : flattened;

  return (
    <RNText
      {...props}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={adjustedStyle}
    />
  );
};

export interface WhiteboardJumpProps {
  gymnastId: number;
  width?: number;
  height?: number;
  onLoaded?: () => void;
  percentage?: number;
  stickBonus?: boolean;
  setStickBonus?: (value: boolean) => void;
  onToggleStickBonus?: () => void;
  oncodetable?: () => void;
  discipline?: boolean; // true = MAG, false = WAG
  event?: string;
}

const WhiteboardJump = memo(forwardRef<WhiteboardRef, WhiteboardJumpProps>(({
  gymnastId,
  width,
  height,
  onLoaded,
  percentage,
  stickBonus,
  setStickBonus,
  onToggleStickBonus,
  oncodetable,
  discipline = true,
  event,
}: WhiteboardJumpProps, ref) => {
  const [vaultModalVisible, setVaultModalVisible] = useState(false);

  const openVaultTable = useCallback(() => {
    if (typeof oncodetable === 'function') {
      try {
        oncodetable();
        return;
      } catch {
        // fallback to internal modal
      }
    }
    setVaultModalVisible(true);
  }, [oncodetable]);

  return (
    <View style={[styles.container, width != null ? { width } : null, height != null ? { height } : null]}>
      <WhiteboardScreen
        ref={ref}
        gymnastId={gymnastId}
        width={width}
        height={height}
        onLoaded={onLoaded}
        percentage={percentage}
        stickBonus={stickBonus}
        setStickBonus={setStickBonus}
        onToggleStickBonus={onToggleStickBonus}
        discipline={discipline}
        event={event}
        showJumpBackground
      />

      {/* VAULT TABLE overlay button (bottom-left), same aesthetic family as existing overlays */}
      <View style={styles.vaultButtonContainer}>
        <TouchableOpacity
          style={styles.vaultButton}
          onPress={openVaultTable}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.vaultButtonText}>VAULT TABLE</Text>
        </TouchableOpacity>
      </View>

      {/* Internal vault modal fallback (only used in jump) */}
      {discipline ? (
        <VaultSelectorModalMag
          visible={vaultModalVisible}
          onClose={() => setVaultModalVisible(false)}
          onSelect={() => setVaultModalVisible(false)}
        />
      ) : (
        <VaultSelectorModalWag
          visible={vaultModalVisible}
          onClose={() => setVaultModalVisible(false)}
          onSelect={() => setVaultModalVisible(false)}
        />
      )}
    </View>
  );
}));

WhiteboardJump.displayName = 'WhiteboardJump';

export default WhiteboardJump;
export { WhiteboardJump, WhiteboardRef };

const styles = StyleSheet.create({
  container: {
    // IMPORTANT: no flex aquí. Si usamos flex:1, el wrapper ocupa toda la pantalla
    // y el contenido que va debajo (ej. ScrollView en gymnast-vault) queda desplazado.
  },
  vaultButtonContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 1500,
  },
  vaultButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
  },
  vaultButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});
