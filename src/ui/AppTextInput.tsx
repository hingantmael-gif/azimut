import { forwardRef, useCallback, useMemo } from 'react';
import {
  Platform,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { useIsWebPhoneFrame } from './platformExperience';

/**
 * Champs texte : clavier physique sur PC (cadre web), virtuel sur vrai téléphone.
 */
export const AppTextInput = forwardRef<TextInput, TextInputProps>(function AppTextInput(
  { onFocus, showSoftInputOnFocus, style, ...props },
  ref,
) {
  const framedDesktop = useIsWebPhoneFrame();

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
        ? !framedDesktop
        : true;

  const webCursorStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? ({
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
