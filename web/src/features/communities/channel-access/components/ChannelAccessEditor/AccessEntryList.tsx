import { Select } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { AccessEntry } from '../../access-entries';
import { principalFromKey, principalKey } from '../../principals';
import type { Principal } from '../../types';
import { AccessEntryRows } from './AccessEntryRows';
import { PrincipalLabel } from './PrincipalLabel';
import type { PrincipalDirectory } from './usePrincipalDirectory';

const useStyles = createStyles(({ css }) => ({
  add: css`
    width: 100%;
  `,
}));

interface AccessEntryListProps {
  entries: AccessEntry[];
  directory: PrincipalDirectory;
  disabled?: boolean;
  onOpen: (key: string) => void;
  onAdd: (principal: Principal) => void;
}

export function AccessEntryList({
  entries,
  directory,
  disabled,
  onOpen,
  onAdd,
}: AccessEntryListProps) {
  const { t } = useTranslation('communities');
  const { styles } = useStyles();

  const listed = new Set(entries.map((entry) => principalKey(entry.principal)));
  const candidates = directory.known
    .filter((details) => !listed.has(details.key))
    .map((details) => ({
      value: details.key,
      title: details.name,
      label: <PrincipalLabel details={details} />,
    }));

  return (
    <div>
      <AccessEntryRows
        entries={entries}
        describe={directory.describe}
        disabled={disabled}
        onOpen={onOpen}
      />
      <Select
        showSearch
        className={styles.add}
        aria-label={t(($) => $.access.addPrincipal)}
        placeholder={t(($) => $.access.addPrincipal)}
        value={null}
        options={candidates}
        optionFilterProp="title"
        loading={directory.isLoading}
        disabled={disabled}
        onChange={(key: string) => onAdd(principalFromKey(key))}
      />
    </div>
  );
}
