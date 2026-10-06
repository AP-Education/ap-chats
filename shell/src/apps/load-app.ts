import type { AppManifest, AppModule } from '@ap/shell-sdk';
import { loadRemote, registerRemotes } from '@module-federation/runtime';

const loading = new Map<string, Promise<AppModule>>();

/** Memoised per application, so prefetching on hover and the real mount share one request. */
export function loadApp({ id, entry }: Pick<AppManifest, 'id' | 'entry'>): Promise<AppModule> {
  let promise = loading.get(id);
  if (!promise) {
    registerRemotes([{ name: id, entry, type: 'module' }]);
    promise = loadRemote<{ default: AppModule }>(`${id}/module`).then((loaded) => {
      if (!loaded) throw new Error(`Application "${id}" returned no module`);
      return loaded.default;
    });
    // A failed load must not stay cached, otherwise retrying needs a page reload.
    promise.catch(() => loading.delete(id));
    loading.set(id, promise);
  }
  return promise;
}
