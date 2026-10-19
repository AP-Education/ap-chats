import { useIsMobile } from '@ap-education/ui';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { RoleBadge } from '@/features/roles/types';

import { useMemberCard } from '../../stores/member-card-context';
import { AddRolePopover } from './AddRolePopover';
import { MemberRoleChips } from './MemberRoleChips';

const useStyles = createStyles(({ token, css }) => ({
  // Never squeezed by a short sheet: its scrolling chips would give way first, down to nothing.
  section: css`
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  `,
  heading: css`
    margin: 0;
    color: ${token.colorTextTertiary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  `,
}));

interface MemberRoleSectionProps {
  /** On a phone, managing roles opens their own view in place of the profile. */
  onManageRoles: () => void;
}

export function MemberRoleSection({ onManageRoles }: MemberRoleSectionProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('people');
  const isMobile = useIsMobile();
  const { profile, canManageRoles, toggleRole } = useMemberCard();
  const roles = profile?.roles ?? [];
  if (!roles.length && !canManageRoles) return null;

  const removeRole = canManageRoles ? (role: RoleBadge) => toggleRole(role, false) : undefined;
  const addOnDesktop = canManageRoles && !isMobile && <AddRolePopover />;

  return (
    <section className={styles.section} aria-label={t(($) => $.roles.title)}>
      <h4 className={styles.heading}>{t(($) => $.roles.title)}</h4>
      <MemberRoleChips roles={roles} onRemove={removeRole}>
        {addOnDesktop}
      </MemberRoleChips>
      {canManageRoles && isMobile && (
        <Button size="small" onClick={onManageRoles}>
          {t(($) => $.roles.manage)}
        </Button>
      )}
    </section>
  );
}
