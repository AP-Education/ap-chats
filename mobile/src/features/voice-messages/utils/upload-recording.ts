import { fetch as expoFetch } from 'expo/fetch';
import { File, FileMode } from 'expo-file-system';

import { i18n } from '../../../shared/i18n/i18n';
import { authorizedFetch } from '../../auth';
import type { VoiceScope, VoiceUploadResult } from '../types';
import type { LocalRecording } from './voice-session';

export interface RecordingUpload {
  recording: LocalRecording;
  session?: NonNullable<VoiceUploadResult['session']>;
  completed: Set<number>;
}

export async function uploadRecording(
  upload: RecordingUpload,
  scope: VoiceScope,
  signal: AbortSignal,
  progress: (bytes: number) => void,
) {
  if (
    scope.workspaceId !== upload.recording.workspaceId ||
    scope.channelId !== upload.recording.channelId
  )
    throw new Error(i18n.t(($) => $.errors.otherConversation, { ns: 'voice' }));
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) throw new Error(i18n.t(($) => $.errors.apiMissing, { ns: 'voice' }));
  const base = `${apiUrl}/api/workspaces/${scope.workspaceId}/channels/${scope.channelId}/uploads`;
  const post = async <T>(url: string, body: unknown): Promise<T> => {
    const response = await authorizedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      if (response.status === 404) {
        upload.session = undefined;
        upload.completed.clear();
      }
      throw new Error(
        i18n.t(($) => $.errors.uploadFailedStatus, { ns: 'voice', status: response.status }),
      );
    }
    return response.json() as Promise<T>;
  };
  const { recording } = upload;
  if (upload.session && Date.parse(upload.session.expiresAt) <= Date.now()) {
    upload.session = undefined;
    upload.completed.clear();
  }
  upload.session ??= await post(base, { name: recording.name, size: recording.size });
  const session = upload.session;
  if (signal.aborted) {
    cancelRecordingUpload(upload);
    throw new Error(i18n.t(($) => $.errors.uploadCancelled, { ns: 'voice' }));
  }
  const file = new File(recording.uri);
  const handle = file.open(FileMode.ReadOnly);
  try {
    for (let number = 1; number <= Math.ceil(recording.size / session.partBytes); number++) {
      if (signal.aborted) throw new Error(i18n.t(($) => $.errors.uploadCancelled, { ns: 'voice' }));
      const start = (number - 1) * session.partBytes;
      const end = Math.min(number * session.partBytes, recording.size);
      if (!upload.completed.has(number)) {
        const { url } = await post<{ url: string }>(`${base}/${session.id}/part`, { number });
        handle.offset = start;
        const bytes = handle.readBytes(end - start);
        if (bytes.length !== end - start)
          throw new Error(i18n.t(($) => $.errors.localIncomplete, { ns: 'voice' }));
        const response = await expoFetch(url, { method: 'PUT', body: bytes, signal });
        if (!response.ok) throw new Error(i18n.t(($) => $.errors.transferFailed, { ns: 'voice' }));
        upload.completed.add(number);
      }
      progress(end);
    }
  } finally {
    handle.close();
  }
  const attachment = await post<Record<string, unknown>>(`${base}/${session.id}/complete`, {
    kind: 'voice',
  });
  return { session, attachment };
}

export function cancelRecordingUpload(upload: RecordingUpload) {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (apiUrl && upload.session)
    void authorizedFetch(
      `${apiUrl}/api/workspaces/${upload.recording.workspaceId}/channels/${upload.recording.channelId}/uploads/${upload.session.id}`,
      { method: 'DELETE' },
    ).catch(() => undefined);
}
