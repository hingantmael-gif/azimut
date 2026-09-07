import { forwardRef, useCallback, useMemo } from 'react';
import {
  Platform,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useIsPhoneExperience } from './platformExperience';

/**
 * Champs texte : clavier virtuel sur téléphone uniquement.
 * Sur PC (web large), saisie au clavier physique + curseur texte visible.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { onFocus, showSoftInputOnFocus, style, ...props },
  ref,
) {
  const isPhone = useIsPhoneExperience();

  const handleFocus = useCallback(
    (e: any) => {
      onFocus?.(e);
    },
    [onFocus],
  );

  const softInput =
    showSoftInputOnFocus !== undefined
      ? showSoftInputOnFocus
      : Platform.OS === 'web'
        ? isPhone
        : isPhone;

  const webCursorStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? ({
            // Empêche le pointeur de « disparaître » au survol des champs (RN Web).
            cursor: 'text',
            caretColor: '#1A1A1A',
          } as TextStyle)
        : null,
    [],
  );

  return (
    <TextInput
      ref={ref}
      {...props}
      showSoftInputOnFocus={softInput}
      onFocus={handleFocus}
      style={[webCursorStyle, style] as StyleProp<TextStyle>}
    />
  );
});
