import type { ComponentType, PropsWithChildren } from 'react';

export type AppIcon = ComponentType<{ size?: number; weight?: 'regular' | 'fill' }>;

/** Static description the shell needs before an application's code is loaded. */
export interface AppManifest {
  id: string;
  label: string;
  icon: AppIcon;
  /** URL prefixes the application owns; '/' matches only the root path. */
  paths: string[];
  /** Where the rail sends the user when the application has no remembered location. */
  home: string;
  /**
   * `tile`: the shell draws one rail tile for the application.
   * `contributed`: the application draws its own tiles through `AppModule.Rail` (e.g. one per
   * workspace) and stays mounted from the start so they are always there.
   */
  rail: 'tile' | 'contributed';
  /** Module Federation remote entry. */
  entry: string;
  /** On mobile the navigation sheet opens by itself on these routes. */
  opensMobileMenuAt?: (pathname: string) => boolean;
}

/**
 * What an application exposes as `./module`. The shell mounts `Providers` once and keeps
 * it alive while the application is cached; `Panel`, `Banner` and `Content` render into the
 * shell's slots, so they share the application's context but not its DOM position.
 */
export interface AppModule {
  Providers: ComponentType<PropsWithChildren>;
  /** Sider content next to the shared rail. Stays mounted (hidden) while the app is cached. */
  Panel: ComponentType;
  /** Tiles the application adds to the rail; visible while the application is mounted. */
  Rail?: ComponentType;
  /** Strip above the whole layout for activity that outlives navigation, e.g. an ongoing call. */
  Ongoing?: ComponentType;
  /** Strip above the whole layout, rendered only while the app is active. */
  Banner?: ComponentType;
  /** Main area. Mounted only while the app is active. */
  Content: ComponentType;
}

export function defineApp(module: AppModule): AppModule {
  return module;
}

export function matchesAppPath(manifest: Pick<AppManifest, 'paths'>, pathname: string): boolean {
  return manifest.paths.some((path) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`),
  );
}
