import { apiRequest, jsonInit } from '@/shared/api/http';

import type { Attachment, AttachmentPolicy, UploadScope, UploadSession } from './types';

function uploadsUrl({ workspaceId, channelId }: UploadScope) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/uploads`;
}

export function getUploadPolicy(token: string, scope: UploadScope): Promise<AttachmentPolicy> {
  return apiRequest(`${uploadsUrl(scope)}/policy`, token);
}

export function beginUpload(token: string, scope: UploadScope, file: File): Promise<UploadSession> {
  return apiRequest(
    uploadsUrl(scope),
    token,
    jsonInit('POST', { name: file.name, size: file.size }),
  );
}

export function signUploadPart(
  token: string,
  scope: UploadScope,
  id: string,
  number: number,
): Promise<{ url: string }> {
  return apiRequest(`${uploadsUrl(scope)}/${id}/part`, token, jsonInit('POST', { number }));
}

export function completeUpload(token: string, scope: UploadScope, id: string): Promise<Attachment> {
  return apiRequest(`${uploadsUrl(scope)}/${id}/complete`, token, jsonInit('POST', {}));
}

export function cancelUpload(token: string, scope: UploadScope, id: string): Promise<void> {
  return apiRequest(`${uploadsUrl(scope)}/${id}`, token, { method: 'DELETE' });
}

export function attachmentUrl(
  token: string,
  scope: UploadScope,
  messageId: string,
  id: string,
  variant: 'thumbnail' | 'preview' | 'download',
): Promise<{ url: string }> {
  return apiRequest(
    `${uploadsUrl(scope)}/${id}/messages/${messageId}/url?variant=${variant}`,
    token,
  );
}
