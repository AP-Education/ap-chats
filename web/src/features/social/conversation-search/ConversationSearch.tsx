import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';

import styles from './Search.module.css';
import { SearchDialog } from './SearchDialog';

/** The open search is a navigation step, so system Back returns to the conversation. */
export function ConversationSearch({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const open = params.get('chatSearch') === '1';
  const fromTrigger = Boolean(location.state?.chatSearch);

  function close() {
    if (fromTrigger) navigate(-1);
    else {
      params.delete('chatSearch');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }

  return (
    <div className={styles.triggerWrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={(event) => {
          if (params.get('chatSearch') === '1') return;
          // WebKit does not focus a button on tap; the dialog restores this trigger on closing.
          event.currentTarget.focus({ preventScroll: true });
          params.set('chatSearch', '1');
          navigate(
            { pathname: location.pathname, search: params.toString() },
            { state: { ...location.state, chatSearch: true } },
          );
        }}
        aria-label="Відкрити пошук людей і чатів"
      >
        <MagnifyingGlassIcon size={20} aria-hidden="true" />
        <span>Пошук людей і чатів</span>
      </button>
      <SearchDialog
        key={workspaceId}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        open={open}
        onClose={close}
        onNavigate={(path) => navigate(path, { replace: true })}
      />
    </div>
  );
}
