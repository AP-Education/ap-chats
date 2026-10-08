import { useCurrentUser } from '@ap-education/shell-sdk';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { uploadFile } from '../api/workspaces-api';
import type { UploadedFile } from '../types';

export function useUploadFile(): UseMutationResult<UploadedFile, Error, File> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;

  return useMutation({
    mutationFn: (file: File) => {
      if (!token) throw new Error('Not signed in');
      return uploadFile(token, file);
    },
  });
}
