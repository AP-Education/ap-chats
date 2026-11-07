import type { UploadSession, UploadTransport } from '@ap-education/timeline/composer';

import { apiRequest, jsonInit } from '@/shared/api/http';

import type { Attachment, AttachmentPolicy, UploadScope } from './types';

function uploadsUrl({ workspaceId, channelId }: UploadScope) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/uploads`;
}

export function getUploadPolicy(token: string, scope: UploadScope): Promise<AttachmentPolicy> {
  return apiRequest(`${uploadsUrl(scope)}/policy`, token);
}

/**
 * A conversation's files through the Chats API, as the composer's queue sends them. Each call is
 * async, so a missing token rejects it like any failed request instead of throwing at the caller.
 */
export function uploadTransport(
  scope: UploadScope,
  token: () => string,
): UploadTransport<Attachment> {
  const url = uploadsUrl(scope);

  return {
    begin: async (file) =>
      apiRequest<UploadSession>(
        url,
        token(),
        jsonInit('POST', { name: file.name, size: file.size }),
      ),
    signPart: async (id, number) => {
      const part = await apiRequest<{ url: string }>(
        `${url}/${id}/part`,
        token(),
        jsonInit('POST', { number }),
      );
      return part.url;
    },
    complete: async (id) =>
      apiRequest<Attachment>(`${url}/${id}/complete`, token(), jsonInit('POST', {})),
    cancel: async (id) => apiRequest<void>(`${url}/${id}`, token(), { method: 'DELETE' }),
  };
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
