import { useIsMobile } from '@ap-education/ui';
import { Popover, theme } from 'antd';
import { createStyles } from 'antd-style';
import {
  cloneElement,
  type ComponentPropsWithRef,
  type ReactElement,
  useRef,
  useState,
} from 'react';

import { useIsNarrowLayout } from '@/shared/hooks/useIsNarrowLayout';

import { useMemberSheet } from '../../stores/member-sheet-context';
import type { MemberSummary } from '../../types';
import { MemberCard } from './MemberCard';
import { memberProfileLabel } from './memberProfileLabel';

const useStyles = createStyles(({ token, css }) => ({
  surface: css`
    overflow: hidden;
    width: min(288px, calc(100vw - 32px));
    padding: 0;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
  `,
  dialog: css`
    outline: none;
  `,
}));

interface MemberProfileTriggerProps {
  member: MemberSummary;
  children: ReactElement<ComponentPropsWithRef<'button'>>;
}

/** Opens the member's profile from its button: a popover on desktop, a bottom sheet on mobile. */
export function MemberProfileTrigger({ member, children }: MemberProfileTriggerProps) {
  const isMobile = useIsMobile();
  const memberSheet = useMemberSheet();

  if (!isMobile) return <MemberPopover member={member}>{children}</MemberPopover>;

  return cloneElement(children, {
    'aria-haspopup': 'dialog',
    onClick: () => memberSheet.show(member),
  });
}

function MemberPopover({ member, children }: MemberProfileTriggerProps) {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const isNarrowLayout = useIsNarrowLayout();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function close() {
    if (dialogRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    setOpen(false);
  }

  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true);
        else close();
      }}
      afterOpenChange={(visible) => {
        if (visible) dialogRef.current?.focus({ preventScroll: true });
      }}
      placement={isNarrowLayout ? 'bottom' : 'rightTop'}
      arrow={false}
      autoAdjustOverflow
      zIndex={isNarrowLayout ? token.zIndexPopupBase + 100 : undefined}
      destroyOnHidden
      classNames={{ container: styles.surface }}
      styles={{ container: { padding: 0 }, content: { padding: 0 } }}
      content={
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={memberProfileLabel(member)}
          tabIndex={-1}
          className={styles.dialog}
          // Portal events still bubble through React to the host row's selection and menu.
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <MemberCard member={member} onConversationOpen={close} />
        </div>
      }
    >
      {cloneElement(children, {
        ref: triggerRef,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
      })}
    </Popover>
  );
}
