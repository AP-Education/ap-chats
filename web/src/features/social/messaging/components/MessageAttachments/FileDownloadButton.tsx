import { IconButton, LoadingIcon } from '@ap-education/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';

interface FileDownloadButtonProps {
  name: string;
  downloading: boolean;
  disabled: boolean;
  onPress: () => void;
}

// What plays keeps a way to save it beside its name.
export function FileDownloadButton({
  name,
  downloading,
  disabled,
  onPress,
}: FileDownloadButtonProps) {
  return (
    <IconButton
      size={36}
      aria-label={`Завантажити ${name}`}
      disabled={disabled || downloading}
      onClick={onPress}
    >
      {downloading ? <LoadingIcon size={20} /> : <DownloadSimpleIcon size={20} />}
    </IconButton>
  );
}
