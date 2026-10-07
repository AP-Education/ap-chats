import { useAppBasePath, useIsAppActive, useShellLocation, useShellNavigate } from '@ap/shell-sdk';
import { type PropsWithChildren, useMemo, useState } from 'react';
import { createPath, type Navigator, parsePath, Router, type To } from 'react-router-dom';

function toHref(to: To): string {
  return typeof to === 'string' ? to : createPath(to);
}

/**
 * Chats' own router over the shell's URL, mounted at the shell's base path, so routes and links
 * stay plain ('/channels'). While another application is shown the URL is not Chats', so the
 * router keeps the last Chats location instead of unmounting the panel and the rail.
 */
export function ShellRouter({ children }: PropsWithChildren) {
  const basename = useAppBasePath();
  const href = useShellLocation();
  const navigate = useShellNavigate();
  const isActive = useIsAppActive();
  const [own, setOwn] = useState({ href: basename, key: 0 });

  if (isActive && href !== own.href) setOwn({ href, key: own.key + 1 });

  const location = useMemo(() => ({ ...parsePath(own.href), key: String(own.key) }), [own]);
  const navigator = useMemo<Navigator>(
    () => ({
      createHref: toHref,
      push: (to) => navigate(toHref(to)),
      replace: (to) => navigate(toHref(to), { replace: true }),
      go: (delta) => window.history.go(delta),
    }),
    [navigate],
  );

  return (
    <Router basename={basename} location={location} navigator={navigator}>
      {children}
    </Router>
  );
}
