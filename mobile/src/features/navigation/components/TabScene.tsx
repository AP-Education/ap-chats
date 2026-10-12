import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { PortalHost } from 'react-native-teleport';

interface TabSceneProps {
  id: string;
  active: boolean;
  barHidden: boolean;
  /** How much of the page's bottom the bar covers, so its lists keep clear of it. */
  onInset: (bottom: number) => void;
}

/** A tab's place for the page: the one WebView is teleported into whichever tab is active. */
export function TabScene({ id, active, barHidden, onInset }: TabSceneProps) {
  const barHeight = useBottomTabBarHeight();
  // iOS floats its glass bar over the page; Android lays the page out above its bar.
  const covered = Platform.OS === 'ios' && !barHidden ? barHeight : 0;

  useEffect(() => {
    if (active) onInset(covered);
  }, [active, covered, onInset]);

  return <PortalHost name={id} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1 },
});
