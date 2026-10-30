import './fixture.css';

import { CurrentUserContext } from '@ap-education/shell-sdk';
import { ThemeProvider } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button, Layout } from 'antd';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';

import { RealtimeContext } from '@/features/realtime/stores/realtime-context';
import type { RealtimeSocketClient } from '@/features/realtime/types';
import { ConversationSearch } from '@/features/social/conversation-search/ConversationSearch';

const listeners = new Map<string, Set<(value: unknown) => void>>();
const socket = {
  on(name: string, handler: (value: unknown) => void) {
    const group = listeners.get(name) ?? new Set();
    group.add(handler);
    listeners.set(name, group);
  },
  off(name: string, handler: (value: unknown) => void) {
    listeners.get(name)?.delete(handler);
  },
} as unknown as RealtimeSocketClient;

function Fixture() {
  const [workspace, setWorkspace] = useState('first');
  const [identity, setIdentity] = useState('fixture');
  const location = useLocation();
  useEffect(() => {
    const changeWorkspace = () => setWorkspace((value) => (value === 'first' ? 'second' : 'first'));
    const changeAccount = () => setIdentity((value) => `${value}-next`);
    window.addEventListener('fixture:workspace-change', changeWorkspace);
    window.addEventListener('fixture:account-change', changeAccount);
    const changed = () =>
      listeners
        .get('communities:channel-revoked')
        ?.forEach((handler) => handler({ workspaceId: workspace, channelId: 'design' }));
    window.addEventListener('fixture:access-changed', changed);
    return () => {
      window.removeEventListener('fixture:access-changed', changed);
      window.removeEventListener('fixture:workspace-change', changeWorkspace);
      window.removeEventListener('fixture:account-change', changeAccount);
    };
  }, [workspace]);
  return (
    <CurrentUserContext.Provider
      value={{
        status: 'signed-in',
        accessToken: 'fixture-only',
        queryIdentity: identity,
        signOut: () => undefined,
      }}
    >
      <Layout className="fixture-shell">
        <aside>
          <h1>Команда продукту</h1>
          <ConversationSearch
            workspaceId={workspace}
            workspaceName={workspace === 'first' ? 'Команда продукту' : 'Інша компанія'}
          />
          <p className="fixture-help">Канали та особисті розмови</p>
          <Button onClick={() => setWorkspace((value) => (value === 'first' ? 'second' : 'first'))}>
            Змінити компанію
          </Button>
          <Button onClick={() => setIdentity((value) => `${value}-next`)}>Змінити акаунт</Button>
        </aside>
        <main>
          <h2>
            {location.pathname === '/channels/design'
              ? '# Design room'
              : location.pathname.startsWith('/direct/')
                ? 'Особиста розмова'
                : 'Ваші чати'}
          </h2>
          <p>Відкрийте пошук, щоб перейти до каналу або написати колезі.</p>
          <output aria-label="Поточний маршрут">{location.pathname}</output>
        </main>
      </Layout>
    </CurrentUserContext.Provider>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider appearance={new URLSearchParams(location.search).has('dark') ? 'dark' : 'light'}>
      <QueryClientProvider client={client}>
        <RealtimeContext.Provider value={{ status: 'idle', socket, error: null }}>
          <BrowserRouter>
            <Fixture />
          </BrowserRouter>
        </RealtimeContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
