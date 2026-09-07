import { Modal, Platform, View, type ModalProps } from 'react-native';

type Props = Pick<
  ModalProps,
  'visible' | 'children' | 'animationType' | 'onRequestClose' | 'transparent'
>;

/**
 * Sur web, Modal RN s’affiche plein écran (hors PhoneShell).
 * Ici : overlay absolu dans le cadre téléphone sur PC.
 */
export function PhoneModal({
  visible,
  children,
  animationType = 'fade',
  onRequestClose,
  transparent = true,
}: Props) {
  if (!visible) return null;

  if (Platform.OS === 'web') {
    return (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 10000,
        }}
        accessibilityViewIsModal
      >
        <View style={{ flex: 1, width: '100%', height: '100%' }}>{children}</View>
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
}
