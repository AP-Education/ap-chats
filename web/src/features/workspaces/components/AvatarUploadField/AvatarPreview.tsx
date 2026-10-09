import { CameraIcon } from '@phosphor-icons/react';
import { Skeleton } from 'antd';
import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

const SIZE = 88;

const useStyles = createStyles(({ token, css }) => ({
  empty: css`
    color: ${token.colorTextTertiary};
  `,
}));

interface AvatarPreviewProps {
  uploading: boolean;
  path: string | null;
  alt: string;
}

export function AvatarPreview({ uploading, path, alt }: AvatarPreviewProps) {
  const { styles } = useStyles();

  if (uploading) return <Skeleton.Avatar active size={SIZE} shape="circle" />;

  if (!path) return <CameraIcon size={26} className={styles.empty} />;

  return <Avatar path={path} alt={alt || '?'} size={SIZE} shape="circle" />;
}
