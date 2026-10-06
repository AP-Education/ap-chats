import { matchesAppPath, type ShellActions, ShellActionsContext } from '@ap/shell-sdk';
import { type RailApp, ShellLayout } from '@ap/shell-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppHosts } from '../apps/AppHosts';
import { loadApp } from '../apps/load-app';
import { apps } from '../apps/registry';
import { useMountedApps } from '../apps/use-mounted-apps';
import { useRememberedLocations } from '../apps/use-remembered-locations';
import { AuthFailureScreen } from '../features/auth/components/AuthFailureScreen';
import { AuthStatus } from '../features/auth/components/AuthStatus';

type SignOutHook = () => void | Promise<void>;

export function Shell() {
  const { pathname, search, hash, key } = useLocation();
  const navigate = useNavigate();
  const active = apps.find((app) => matchesAppPath(app, pathname));
  const mountedIds = useMountedApps(apps, active?.id);
  const locations = useRememberedLocations(active?.id, pathname + search + hash);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const signOutHooks = useRef(new Set<SignOutHook>());
  const latest = useRef({ locations, navigate });

  useEffect(() => {
    latest.current = { locations, navigate };
  });

  const actions = useMemo<ShellActions>(
    () => ({
      openApp: (appId, to) => {
        const app = apps.find((candidate) => candidate.id === appId);
        if (app) void latest.current.navigate(to ?? latest.current.locations[appId] ?? app.home);
      },
      setBadge: (appId, count) =>
        setBadges((previous) =>
          previous[appId] === count ? previous : { ...previous, [appId]: count },
        ),
      registerBeforeSignOut: (hook) => {
        signOutHooks.current.add(hook);
        return () => void signOutHooks.current.delete(hook);
      },
    }),
    [],
  );

  if (apps.length === 0) {
    return (
      <AuthFailureScreen
        title="Застосунки не налаштовані"
        description="Зверніться до адміністратора, щоб отримати доступ."
      />
    );
  }

  const railApps: RailApp[] = apps
    .filter((app) => app.rail === 'tile')
    .map(({ id, label, icon, home }) => ({
      id,
      label,
      icon,
      href: locations[id] ?? home,
      active: id === active?.id,
      badge: badges[id] ?? 0,
    }));

  function selectApp(id: string) {
    const app = apps.find((candidate) => candidate.id === id);
    if (!app) return;
    void navigate(id === active?.id ? app.home : (locations[id] ?? app.home));
  }

  function prefetchApp(id: string) {
    const app = apps.find((candidate) => candidate.id === id);
    if (app) loadApp(app).catch(() => undefined);
  }

  async function runBeforeSignOut() {
    await Promise.allSettled([...signOutHooks.current].map((hook) => hook()));
  }

  const mountedApps = mountedIds.flatMap((id) => apps.find((app) => app.id === id) ?? []);

  return (
    <ShellActionsContext.Provider value={actions}>
      <ShellLayout
        locationKey={key}
        menuOpenByDefault={active?.opensMobileMenuAt?.(pathname) ?? false}
        unreadCount={Object.values(badges).reduce((sum, count) => sum + count, 0)}
      >
        <ShellLayout.Banner />
        <ShellLayout.Body>
          <ShellLayout.Sider>
            <ShellLayout.Main>
              <ShellLayout.Rail tiles={railApps} onSelect={selectApp} onPrefetch={prefetchApp} />
              <ShellLayout.Panel />
            </ShellLayout.Main>
            <ShellLayout.Footer>
              <AuthStatus beforeSignOut={runBeforeSignOut} />
            </ShellLayout.Footer>
          </ShellLayout.Sider>
          <ShellLayout.Content />
        </ShellLayout.Body>
        <AppHosts apps={mountedApps} activeId={active?.id} />
      </ShellLayout>
    </ShellActionsContext.Provider>
  );
}
