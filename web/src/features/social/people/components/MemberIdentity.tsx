import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar/Avatar';

const useStyles = createStyles(({ token, css }) => ({
  avatar: css`
    display: flex;
    justify-content: center;
    margin-bottom: 11px;
  `,
  name: css`
    overflow-wrap: anywhere;
    margin: 0 0 3px;
    color: ${token.colorText};
    font-size: 18px;
    font-weight: 650;
    line-height: 1.3;
  `,
  detail: css`
    margin: 0;
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
}));

interface MemberIdentityProps {
  name: string;
  avatarPath: string | null;
  detail: string;
  headingLevel?: 'h2' | 'h3';
}

export function MemberIdentity({
  name,
  avatarPath,
  detail,
  headingLevel: Heading = 'h3',
}: MemberIdentityProps) {
  const { styles } = useStyles();

  return (
    <>
      <div className={styles.avatar}>
        <Avatar path={avatarPath} alt={name} size={72} shape="circle" />
      </div>
      <Heading className={styles.name}>{name}</Heading>
      <p className={styles.detail}>{detail}</p>
    </>
  );
}
