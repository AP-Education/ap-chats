import { ObjectStorage } from '@ap-education/storage';
import { Injectable } from '@nestjs/common';

import type { Attachment } from '../messages/types/message.types';
import { attachmentObjectKey, imageLinkOf, type Link } from './attachment-links';
import type { AttachmentLinks, ShownAttachment } from './types';

/** A message's files as its reader gets them: every image with the links it shows by at once. */
@Injectable()
export class AttachmentLinksService {
  constructor(private readonly storage: ObjectStorage) {}

  // Signing is the storage's own arithmetic, so a whole page of photos costs no requests.
  shown(workspaceId: string, attachments: Attachment[]): Promise<ShownAttachment[]> {
    const shown = attachments.map(async (file) => {
      const links = await this.linksOf(workspaceId, file);
      return { ...file, links };
    });
    return Promise.all(shown);
  }

  private async linksOf(workspaceId: string, file: Attachment): Promise<AttachmentLinks> {
    const isImage = file.preview === 'image';
    if (!isImage) return {};

    const key = attachmentObjectKey(workspaceId, file.id);
    const [thumbnail, preview] = await Promise.all([
      this.signed(imageLinkOf(key, file.mediaType, 'thumbnail')),
      this.signed(imageLinkOf(key, file.mediaType, 'preview')),
    ]);
    return { thumbnail, preview };
  }

  private signed({ key, options }: Link): Promise<string> {
    return this.storage.signLink(key, options);
  }
}
