import type { Attachment, ChatUpload, ChatUploadPatch, NewChatUpload } from '../types';

export abstract class ChatUploadsRepository {
  /** Serializes concurrent begin() calls for one owner against the reservation check below. */
  abstract lockOwner(memberId: string): Promise<void>;

  abstract reservations(memberId: string): Promise<{ count: number; bytes: number }>;

  abstract insert(data: NewChatUpload): Promise<ChatUpload>;

  abstract lock(id: string): Promise<ChatUpload | null>;

  abstract find(id: string): Promise<ChatUpload | null>;

  abstract update(id: string, patch: ChatUploadPatch): Promise<void>;

  abstract lockMany(ids: string[]): Promise<ChatUpload[]>;

  abstract attach(ids: string[]): Promise<void>;

  abstract message(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<{ attachments: Attachment[] } | null>;

  /** Next batch of rows past their expiresAt, oldest first. */
  abstract expired(): Promise<ChatUpload[]>;

  abstract remove(id: string): Promise<void>;

  /** Whether any non-deleted message still carries this attachment id. */
  abstract hasLiveReferences(id: string): Promise<boolean>;
}
