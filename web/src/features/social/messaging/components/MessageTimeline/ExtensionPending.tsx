import { type PendingEntry, unsentEntries } from '@ap-education/timeline';
import { type Dispatch, type SetStateAction, useLayoutEffect, useMemo, useState } from 'react';

import type { ConversationExtension } from '@/features/social/conversation-scope/extensions';

import type { ConversationEntry } from '../../timeline/chat-entry';

type Pending = readonly PendingEntry<ConversationEntry>[];

type PendingByExtension = ReadonlyMap<string, Pending>;

type Report = Dispatch<SetStateAction<PendingByExtension>>;

const NOTHING: PendingByExtension = new Map();

/**
 * What the conversation's extensions have on their way, in their order, without what the history
 * already holds. Each extension's hook runs in an `ExtensionPending` part of its own, so one that
 * joins later, as StarMe does once the members load, adds a part rather than a hook.
 */
export function useExtensionPending(
  extensions: readonly ConversationExtension[],
  landed: ReadonlySet<string>,
) {
  const [byExtension, report] = useState(NOTHING);
  const pending = useMemo(
    () =>
      unsentEntries(
        extensions.flatMap(({ id }) => byExtension.get(id) ?? []),
        landed,
      ),
    [extensions, byExtension, landed],
  );

  return { pending, report };
}

interface ExtensionPendingProps {
  id: string;
  usePending: NonNullable<ConversationExtension['usePending']>;
  landed: ReadonlySet<string>;
  report: Report;
}

/** Runs one extension's pending hook and hands what it returns to the timeline before it paints. */
export function ExtensionPending({ id, usePending, landed, report }: ExtensionPendingProps) {
  const pending = usePending(landed);

  useLayoutEffect(() => {
    report((all) => new Map(all).set(id, pending));
  }, [id, pending, report]);

  useLayoutEffect(
    () => () =>
      report((all) => {
        const rest = new Map(all);
        rest.delete(id);
        return rest;
      }),
    [id, report],
  );

  return null;
}
