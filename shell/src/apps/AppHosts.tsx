import type { AppManifest } from '@ap/shell-sdk';
import { useShellHosts } from '@ap/shell-ui';
import { Result } from 'antd';
import { createPortal } from 'react-dom';

import { AppHost } from './AppHost';

interface AppHostsProps {
  apps: AppManifest[];
  activeId: string | undefined;
}

/** Mounts the cached applications into the layout slots; renders no DOM of its own. */
export function AppHosts({ apps, activeId }: AppHostsProps) {
  const hosts = useShellHosts();

  return (
    <>
      {apps.map((app) => (
        <AppHost key={app.id} app={app} active={app.id === activeId} hosts={hosts} />
      ))}
      {!activeId &&
        hosts.content &&
        createPortal(
          <Result status="404" title="Сторінку не знайдено" subTitle="Перевірте адресу сторінки" />,
          hosts.content,
        )}
    </>
  );
}
