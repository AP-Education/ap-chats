import {
  type AppManifest,
  type ShellActions,
  ShellActionsContext,
  ShellLocationContext,
} from '@ap/shell-sdk';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { loadApp } from '@/features/apps/api/load-app';
import { resolveApp } from '@/features/apps/api/resolve-app';
import { useMountedApps } from '@/features/apps/hooks/useMountedApps';
import { useRememberedLocations } from '@/features/apps/hooks/useRememberedLocations';
import { type SignOutHook, SignOutHooksContext } from '@/features/apps/stores/sign-out-hooks';
import type { RailTile } from '@/features/layout/components/AppRail';
import { ShellLayout } from '@/features/layout/components/ShellLayout';

import { AppHosts } from './AppHosts';

interface ShellHostProps {
  apps: AppManifest[];
  /** Spans the bottom of the sider, e.g. the signed-in user. */
  footer: ReactNode;
}

/** Runs the applications: routes to the active one, keeps recent ones alive, draws the frame. */
export function ShellHost({ apps, footer }: ShellHostProps) {
  const { pathname, search, hash, key } = useLocation();
  const navigate = useNavigate();
  const active = resolveApp(apps, pathname);
  const mountedIds = useMountedApps(apps, active?.id);
  const href = pathname + search + hash;
  const locations = useRememberedLocations(active?.id, href);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [signOutHooks] = useState(() => new Set<SignOutHook>());
  const latest = useRef({ apps, locations, navigate });

  useEffect(() => {
    latest.current = { apps, locations, navigate };
  });

  const actions = useMemo<ShellActions>(
    () => ({
      openApp: (appId, to) => {
        const app = latest.current.apps.find((candidate) => candidate.id === appId);
        if (app) void latest.current.navigate(to ?? latest.current.locations[appId] ?? app.home);
      },
      navigate: (to, options) => void latest.current.navigate(to, { replace: options?.replace }),
      setBadge: (appId, count) =>
        setBadges((previous) =>
          previous[appId] === count ? previous : { ...previous, [appId]: count },
        ),
      registerBeforeSignOut: (hook) => {
        signOutHooks.add(hook);
        return () => void signOutHooks.delete(hook);
      },
    }),
    [signOutHooks],
  );

  // The active tile leads home, any other back to where the user left that application.
  const tiles: RailTile[] = apps
    .filter((app) => app.rail === 'tile')
    .map((app) => ({
      app,
      href: app.id === active?.id ? app.home : (locations[app.id] ?? app.home),
      active: app.id === active?.id,
      badge: badges[app.id] ?? 0,
      prefetch: () => void loadApp(app).catch(() => undefined),
    }));

  const mountedApps = mountedIds.flatMap((id) => apps.find((app) => app.id === id) ?? []);

  return (
    <ShellActionsContext.Provider value={actions}>
      <ShellLocationContext.Provider value={href}>
        <SignOutHooksContext.Provider value={signOutHooks}>
          <ShellLayout
            locationKey={key}
            menuOpenByDefault={active?.opensMobileMenuAt?.(pathname) ?? false}
            badgeCount={Object.values(badges).reduce((sum, count) => sum + count, 0)}
            tiles={tiles}
            footer={footer}
          >
            <AppHosts apps={mountedApps} activeId={active?.id} />
          </ShellLayout>
        </SignOutHooksContext.Provider>
      </ShellLocationContext.Provider>
    </ShellActionsContext.Provider>
  );
}
