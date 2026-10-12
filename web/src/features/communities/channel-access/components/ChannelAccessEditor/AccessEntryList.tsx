import { Select } from 'antd';
import { createStyles } from 'antd-style';

import type { AccessEntry } from '../../access-entries';
import { principalFromKey, principalKey } from '../../principals';
import type { Principal } from '../../types';
import { AccessEntryRows } from './AccessEntryRows';
import { PrincipalLabel } from './PrincipalLabel';
import type { PrincipalDetails } from './usePrincipalDirectory';

const useStyles = createStyles(({ css }) => ({
  add: css`
    width: 100%;
  `,
}));

interface AccessEntryListProps {
  entries: AccessEntry[];
  describe: (principal: Principal) => PrincipalDetails;
  known: PrincipalDetails[];
  isLoading: boolean;
  disabled?: boolean;
  onOpen: (key: string) => void;
  onAdd: (principal: Principal) => void;
}

export function AccessEntryList({
  entries,
  describe,
  known,
  isLoading,
  disabled,
  onOpen,
  onAdd,
}: AccessEntryListProps) {
  const { styles } = useStyles();

  const listed = new Set(entries.map((entry) => principalKey(entry.principal)));
  const candidates = known
    .filter((details) => !listed.has(details.key))
    .map((details) => ({
      value: details.key,
      title: details.name,
      label: <PrincipalLabel details={details} />,
    }));

  return (
    <div>
      <AccessEntryRows entries={entries} describe={describe} disabled={disabled} onOpen={onOpen} />
      <Select
        showSearch
        className={styles.add}
        aria-label="Додати роль або людину"
        placeholder="Додати роль або людину"
        value={null}
        options={candidates}
        optionFilterProp="title"
        loading={isLoading}
        disabled={disabled}
        onChange={(key: string) => onAdd(principalFromKey(key))}
      />
    </div>
  );
}
