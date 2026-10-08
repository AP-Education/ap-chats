import { Sticker } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '../../../shell/theme';
import { type ShellPalette, useShellPalette, useThemedStyles } from '../../appearance';

export function StickerTab() {
  const palette = useShellPalette();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.root}>
      <Sticker size={28} color={palette.textSecondary} />
      <Text style={styles.text}>Набори стікерів з’являться незабаром.</Text>
    </View>
  );
}

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    text: { color: palette.textSecondary, fontSize: 13, textAlign: 'center' },
  });
