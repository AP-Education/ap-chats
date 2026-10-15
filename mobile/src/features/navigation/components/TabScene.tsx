import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useBottomTabBarHeight } from 'react-native-bottom-tabs';
import { PortalHost } from 'react-native-teleport';

interface TabSceneProps {
  id: string;
  active: boolean;
  barHidden: boolean;
  /** Set where the app draws its own bar over the scene, rather than the system's. */
  ownBarSpace?: number;
  /** How much of the screen's bottom the bar covers, so the page's lists keep clear of it. */
  onInset: (bottom: number) => void;
}

/** A tab's place for the page: the one WebView is teleported into whichever tab is active. */
export function TabScene({ id, active, barHidden, ownBarSpace, onInset }: TabSceneProps) {
  const barHeight = useBottomTabBarHeight();
  // Both bars float over the page rather than push it up.
  const covered = barHidden ? 0 : (ownBarSpace ?? barHeight);

  useEffect(() => {
    if (active) onInset(covered);
  }, [active, covered, onInset]);

  return <PortalHost name={id} style={styles.host} />;
}

const styles = StyleSheet.create({
  host: { flex: 1 },
});
