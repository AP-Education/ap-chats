import { CameraIcon, PlusIcon } from '@phosphor-icons/react';
import { message, Spin, Upload, type UploadProps } from 'antd';
import { createStyles } from 'antd-style';

import { Avatar } from '@/shared/ui/Avatar';

import { useUploadFile } from '../../hooks/useUploadFile';

const useStyles = createStyles(({ token, css }) => ({
  zone: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${token.marginXS}px;
    margin-bottom: ${token.marginLG}px;
  `,
  circle: css`
    position: relative;
    width: 88px;
    height: 88px;
  `,
  trigger: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px dashed ${token.colorBorder};
    cursor: pointer;
    overflow: hidden;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  cameraIcon: css`
    color: ${token.colorTextTertiary};
  `,
  badge: css`
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${token.colorPrimary};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    border: 3px solid ${token.colorBgElevated};
    pointer-events: none;
  `,
  label: css`
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${token.colorTextTertiary};
  `,
}));

interface AvatarUploadFieldProps {
  value: string | null;
  onChange: (path: string) => void;
  /** Used for the fallback color/initials while there's no image yet. */
  alt: string;
}

// Picks and uploads an image via the generic /uploads endpoint, reporting
// back the resulting storage path — the rest of a form's data (name, etc.)
// is none of this component's business.
export function AvatarUploadField({ value, onChange, alt }: AvatarUploadFieldProps) {
  const { styles } = useStyles();
  const uploadFile = useUploadFile();

  const customRequest: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess, onError } = options;
    uploadFile.mutate(file as File, {
      onSuccess: (result) => {
        onChange(result.path);
        onSuccess?.(result);
      },
      onError: () => {
        message.error('Не вдалося завантажити зображення');
        onError?.(new ProgressEvent('error'));
      },
    });
  };

  return (
    <div className={styles.zone}>
      <Upload
        accept="image/png,image/jpeg,image/webp"
        showUploadList={false}
        customRequest={customRequest}
      >
        <div className={styles.circle}>
          <div className={styles.trigger} aria-label="Завантажити іконку">
            {uploadFile.isPending ? (
              <Spin size="small" />
            ) : value ? (
              <Avatar path={value} alt={alt || '?'} size={88} shape="circle" />
            ) : (
              <CameraIcon size={26} className={styles.cameraIcon} />
            )}
          </div>
          <span className={styles.badge}>
            <PlusIcon size={14} weight="bold" />
          </span>
        </div>
      </Upload>
      <span className={styles.label}>Завантажити</span>
    </div>
  );
}
