import { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import TabView from 'react-native-bottom-tabs';
import { useKeyboardState } from 'react-native-keyboard-controller';

import { useShellPalette } from '../../appearance';
import type { NativeTab, TabBarModel } from '../types';
import { FloatingTabBar, useFloatingTabBarSpace } from './FloatingTabBar';
import { TabScene } from './TabScene';

interface TabRoute {
  key: string;
  title: string;
  badge?: string;
  symbol: NativeTab['symbol'];
  picture?: string;
}

interface NativeTabsProps {
  model: TabBarModel;
  onSelect: (id: string) => void;
  onInset: (bottom: number) => void;
}

/**
 * The tab bar for the page's tabs: UIKit's, with Liquid Glass on iOS 26, and a capsule of the same
 * shape drawn here on Android. Each tab holds a host the page is teleported into.
 */
export function NativeTabs({ model, onSelect, onInset }: NativeTabsProps) {
  const palette = useShellPalette();
  const keyboardShown = useKeyboardState((state) => state.isVisible);
  const barHidden = !model.visible || keyboardShown;
  const floatingBarSpace = useFloatingTabBarSpace();
  const drawsOwnBar = Platform.OS === 'android';
  const routes = useMemo(() => model.items.map(toRoute), [model.items]);
  const index = Math.max(
    0,
    routes.findIndex((route) => route.key === model.activeId),
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={({ route }) => (
          <TabScene
            id={route.key}
            active={route.key === model.activeId}
            barHidden={barHidden}
            ownBarSpace={drawsOwnBar ? floatingBarSpace : undefined}
            onInset={onInset}
          />
        )}
        onIndexChange={(next) => {
          const route = routes[next];
          if (route) onSelect(route.key);
        }}
        // Every tab's host exists from the start, so the page can move into any of them.
        getLazy={() => false}
        getIcon={({ route }) =>
          route.picture ? { uri: route.picture } : { sfSymbol: route.symbol.ios }
        }
        // A picture keeps its own colours instead of the bar's tint.
        getIconRenderingMode={({ route }) => (route.picture ? 'original' : 'automatic')}
        tabBarHidden={drawsOwnBar || barHidden}
        tabBarActiveTintColor={palette.primary}
        getSceneStyle={() => ({ backgroundColor: palette.surface })}
      />
      {drawsOwnBar && !barHidden && <FloatingTabBar model={model} onSelect={onSelect} />}
    </View>
  );
}

function toRoute(tab: NativeTab): TabRoute {
  return {
    key: tab.id,
    title: tab.label,
    badge: tab.badge > 0 ? (tab.badge > 99 ? '99+' : String(tab.badge)) : undefined,
    symbol: tab.symbol,
    picture: tab.picture,
  };
}
