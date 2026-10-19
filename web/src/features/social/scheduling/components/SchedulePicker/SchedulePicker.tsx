import { useShellLocale } from '@ap-education/shell-sdk';
import { useIsMobile } from '@ap-education/ui';
import { Button } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { AdaptiveModal } from '@/shared/ui/AdaptiveModal';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { useSendTimePick } from '../../hooks/useSendTimePick';
import { sendTimeLabel } from '../../send-times';
import { SendTimeFields } from './SendTimeFields';

const useStyles = createStyles(({ token, css }) => ({
  title: css`
    margin: 0;
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
  `,
  summary: css`
    margin: 2px 0 12px;
    color: ${token.colorTextSecondary};
  `,
  // As the dialog's own footer lays out its buttons on a phone.
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: 16px;

    & .ant-btn {
      flex: 1;
      min-height: 44px;
    }
  `,
}));

interface SchedulePickerProps {
  title: string;
  initial?: Date;
  pending: boolean;
  onPick: (sendAt: Date) => void;
  onClose: () => void;
}

/** When a message goes out: a sheet on a phone, a dialog elsewhere, the same choice in both. */
export function SchedulePicker({ title, initial, pending, onPick, onClose }: SchedulePickerProps) {
  const { styles } = useStyles();
  const { t } = useTranslation(['scheduling', 'common']);
  const locale = useShellLocale();
  const isMobile = useIsMobile();
  const pick = useSendTimePick(initial);
  const { sendAt } = pick;
  const summary = sendAt
    ? t(($) => $.arrivesAt, { when: sendTimeLabel(sendAt, pick.now, t, locale) })
    : t(($) => $.pickPrompt);

  function submit() {
    if (sendAt) onPick(sendAt);
  }

  const fields = <SendTimeFields pick={pick} />;

  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} aria-label={title}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.summary}>{summary}</p>
        {fields}
        <div className={styles.actions}>
          <Button onClick={onClose}>{t(($) => $.common.actions.cancel)}</Button>
          <Button type="primary" loading={pending} disabled={!sendAt} onClick={submit}>
            {t(($) => $.schedule)}
          </Button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <AdaptiveModal
      open
      centered
      destroyOnHidden
      width={400}
      title={title}
      description={summary}
      okText={t(($) => $.schedule)}
      cancelText={t(($) => $.common.actions.cancel)}
      okButtonProps={{ disabled: !sendAt }}
      confirmLoading={pending}
      onOk={submit}
      onCancel={onClose}
    >
      {fields}
    </AdaptiveModal>
  );
}
