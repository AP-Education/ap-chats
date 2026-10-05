import { Sticker } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../../shell/theme';

export function StickerTab() {
  return (
    <View style={styles.root}>
      <Sticker size={28} color={colors.textSecondary} />
      <Text style={styles.text}>Набори стікерів з’являться незабаром.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  text: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
});
