import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';

type Props = {
  uri?: string | null;
  initials?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
};

/** Avatar circulaire — photo durable ou initiales si absente / cassée. */
export function ProfileAvatar({
  uri,
  initials = '?',
  size = 40,
  style,
  borderColor,
}: Props) {
  const { colors } = useThemeColors();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const showImage = Boolean(uri) && !failed;
  const letter = (initials.trim() || '?').slice(0, 2).toUpperCase();

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
          borderColor: borderColor ?? colors.border,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={styles.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.text, { color: colors.accent, fontSize: size * 0.36 }]}>
          {letter}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  text: { fontWeight: '800' },
});
