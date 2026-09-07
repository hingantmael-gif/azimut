import { Platform, StyleSheet, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { UI_PLAIN } from '../../constants/authLabels';

type Props = {
  color?: string;
  style?: StyleProp<TextStyle>;
  size?: number;
} & Omit<TextProps, 'children' | 'style'>;

/**
 * Affiche toujours « Nouveau Programme » (jamais « Programme Nouveau »).
 * Deux nœuds texte + direction LTR forcée (web + natif).
 */
export function NewProgramLabel({ color, style, size = 22, ...rest }: Props) {
  const webLtr =
    Platform.OS === 'web'
      ? ({
          direction: 'ltr',
          unicodeBidi: 'isolate',
        } as object)
      : null;

  return (
    <Text
      {...rest}
      accessibilityLabel={UI_PLAIN.newProgram}
      style={[
        styles.row,
        { writingDirection: 'ltr' },
        webLtr,
        size ? { fontSize: size } : null,
        color ? { color } : null,
        style,
      ]}
    >
      <Text style={[styles.word, webLtr, color ? { color } : null]}>Nouveau</Text>
      <Text style={[styles.space, webLtr]}> </Text>
      <Text style={[styles.word, webLtr, color ? { color } : null]}>Programme</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    fontWeight: '700',
    flexDirection: 'row',
  },
  word: {
    writingDirection: 'ltr',
    fontWeight: '700',
  },
  space: {
    writingDirection: 'ltr',
  },
});
