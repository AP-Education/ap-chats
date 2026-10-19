import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useState } from 'react';

import { PeopleSearchResults } from './PeopleSearchResults';

const useStyles = createStyles(({ css }) => ({
  people: css`
    min-height: 100px;
    max-height: 320px;
    overflow-y: auto;
    padding-top: 8px;
  `,
}));

interface FindPersonSearchProps {
  workspaceId: string;
  /** The conversation with the chosen person is open. */
  onOpened: () => void;
}

export function FindPersonSearch({ workspaceId, onOpened }: FindPersonSearchProps) {
  const { styles } = useStyles();
  const [query, setQuery] = useState('');

  return (
    <>
      <Input
        autoFocus
        placeholder="Ім’я колеги"
        aria-label="Ім’я колеги"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.people}>
        <PeopleSearchResults
          workspaceId={workspaceId}
          query={query}
          showEmpty
          onNavigate={onOpened}
        />
      </div>
    </>
  );
}
