import { AppActiveContext, AppIdContext, type AppManifest } from '@ap/shell-sdk';
import { ErrorBoundary } from '@ap/ui';
import { Result, Skeleton } from 'antd';
import { type ReactNode, Suspense, use } from 'react';
import { createPortal } from 'react-dom';

import { loadApp } from '@/features/apps/api/load-app';
import type { ShellHosts } from '@/features/layout/stores/shell-layout-context';

interface AppHostProps {
  app: AppManifest;
  active: boolean;
  hosts: ShellHosts;
}

function intoContent(hosts: ShellHosts, active: boolean, node: ReactNode) {
  return active && hosts.content ? createPortal(node, hosts.content) : null;
}

/**
 * Mounts one application. It renders no DOM of its own: the application's Providers stay
 * alive while it is cached, and its panel, banner and content are portalled into the
 * shell's slots, so switching applications never rebuilds the sider.
 */
export function AppHost({ app, active, hosts }: AppHostProps) {
  return (
    <AppIdContext.Provider value={app.id}>
      <AppActiveContext.Provider value={active}>
        <ErrorBoundary
          label={`app:${app.id}`}
          fallback={intoContent(
            hosts,
            active,
            <Result
              status="warning"
              title={`${app.label} тимчасово недоступні`}
              subTitle="Решта застосунку працює як зазвичай."
            />,
          )}
        >
          <Suspense
            fallback={intoContent(
              hosts,
              active,
              <div role="status" aria-label={`Завантажуємо ${app.label}`} style={{ padding: 24 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>,
            )}
          >
            <LoadedApp app={app} active={active} hosts={hosts} />
          </Suspense>
        </ErrorBoundary>
      </AppActiveContext.Provider>
    </AppIdContext.Provider>
  );
}

function LoadedApp({ app, active, hosts }: AppHostProps) {
  const { Providers, Panel, Rail, Ongoing, Banner, Content } = use(loadApp(app));

  return (
    <Providers>
      {hosts.rail && Rail && createPortal(<Rail />, hosts.rail)}
      {hosts.panel &&
        createPortal(
          <div
            style={{
              display: active ? 'flex' : 'none',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
            }}
          >
            <Panel />
          </div>,
          hosts.panel,
        )}
      {hosts.banner && Ongoing && createPortal(<Ongoing />, hosts.banner)}
      {active && hosts.banner && Banner && createPortal(<Banner />, hosts.banner)}
      {intoContent(hosts, active, <Content />)}
    </Providers>
  );
}
