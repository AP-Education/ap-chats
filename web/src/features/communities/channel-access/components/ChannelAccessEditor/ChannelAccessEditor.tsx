import { useReducer } from 'react';

import { type AccessEntry, fromAccessEntries, toAccessEntries } from '../../access-entries';
import { openChannelPermissions, principalKey } from '../../principals';
import type { ChannelCapability, ChannelPermissionsInput, Principal } from '../../types';
import { accessEditorView } from './access-editor-view';
import { AccessEntryDetail } from './AccessEntryDetail';
import { AccessEntryList } from './AccessEntryList';
import { usePrincipalDirectory } from './usePrincipalDirectory';

interface ChannelAccessEditorProps {
  workspaceId: string;
  value?: ChannelPermissionsInput;
  onChange?: (value: ChannelPermissionsInput) => void;
  disabled?: boolean;
}

// Who the channel names, each opening onto three switches; a form field like any other.
export function ChannelAccessEditor({
  workspaceId,
  value = openChannelPermissions,
  onChange,
  disabled,
}: ChannelAccessEditorProps) {
  const directory = usePrincipalDirectory(workspaceId);
  const [view, dispatch] = useReducer(accessEditorView, { screen: 'list' });
  const entries = toAccessEntries(value);

  const change = (next: AccessEntry[]) => onChange?.(fromAccessEntries(next));
  const opened =
    view.screen === 'principal'
      ? entries.find((entry) => principalKey(entry.principal) === view.key)
      : undefined;

  function add(principal: Principal) {
    change([...entries, { principal, level: 'post' }]);
    dispatch({ type: 'open', key: principalKey(principal) });
  }

  function setLevel(entry: AccessEntry, level: ChannelCapability | null) {
    const others = entries.filter((other) => other !== entry);
    if (level === null) {
      change(others);
      dispatch({ type: 'back' });
      return;
    }
    change(entries.map((other) => (other === entry ? { ...entry, level } : other)));
  }

  if (opened)
    return (
      <AccessEntryDetail
        entry={opened}
        details={directory.describe(opened.principal)}
        disabled={disabled}
        onLevelChange={(level) => setLevel(opened, level)}
        onBack={() => dispatch({ type: 'back' })}
      />
    );

  return (
    <AccessEntryList
      entries={entries}
      directory={directory}
      disabled={disabled}
      onOpen={(key) => dispatch({ type: 'open', key })}
      onAdd={add}
    />
  );
}
