import { useLayoutEffect } from 'react';

export function BootstrapHandoff() {
  useLayoutEffect(() => {
    document.getElementById('app-bootstrap')?.remove();
  }, []);

  return null;
}
