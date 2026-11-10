import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import sharp from 'sharp';

import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { seedConversations } from '@/testing/conversations';
import { migratedDatabase, transactionHost } from '@/testing/pglite';
import { socialServices } from '@/testing/social';

import type { Attachment } from '../messages/types/message.types';
import type { DownloadVariant } from './attachment-links';

const aPhoto = () =>
  sharp({ create: { width: 640, height: 400, channels: 3, background: '#0c7d77' } })
    .png()
    .toBuffer();
const aDocument = () => Buffer.from('%PDF-1.7\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');

const namesFile = (link: string) => new URL(link).searchParams.has('saveAs');

test('files in a conversation on PostgreSQL', async (t) => {
  const { pg, db } = await migratedDatabase();
  t.after(() => pg.close());

  const seed = seedConversations(db);
  const services = socialServices(transactionHost(db));

  /** A public channel where Ann sends files and Rob reads them. */
  async function team() {
    const workspaceId = await seed.workspace();
    const ann = await seed.join(workspaceId, await seed.person('Ann'));
    const rob = await seed.join(workspaceId, await seed.person('Rob'));
    const { channelId } = await seed.channel(ann, 'public', [rob]);

    // What the browser does: puts the bytes through the signed part, then the API looks into them.
    async function uploads(name: string, bytes: Buffer): Promise<Attachment> {
      const session = await services.uploads.begin(ann, channelId, name, bytes.length);
      const { url } = await services.uploads.signPart(ann, channelId, session.id, 1);
      services.storage.put(url, bytes);
      return services.completion.complete(ann, channelId, session.id);
    }

    const sends = (file: Attachment) =>
      services.sending.send(ann, channelId, {
        markdown: '',
        clientNonce: randomUUID(),
        attachments: [{ id: file.id }],
      });

    async function filesShownTo(reader: WorkspaceMember, messageId: string) {
      const page = await services.history.window(reader, channelId, {});
      const item = page.items.find(({ id }) => id === messageId);
      if (item?.type !== 'MESSAGE') throw new Error('The message is not in the history');
      return item.message.attachments;
    }

    const opens = (
      reader: WorkspaceMember,
      messageId: string,
      file: Attachment,
      as: DownloadVariant,
    ) => services.downloads.link(reader, { workspaceId, channelId, messageId }, file.id, as);

    return { rob, uploads, sends, filesShownTo, opens };
  }

  await t.test(
    'a photo in the history comes with the links it shows by, none naming it',
    async () => {
      const chat = await team();
      const bytes = await aPhoto();
      const photo = await chat.uploads('Командний план.png', bytes);
      const message = await chat.sends(photo);

      const [shown] = await chat.filesShownTo(chat.rob, message.id);

      const { thumbnail, preview } = shown!.links;
      assert.deepEqual(services.storage.read(preview!), bytes);
      assert.ok(services.storage.read(thumbnail!).length > 0);
      assert.equal([thumbnail!, preview!].some(namesFile), false);
    },
  );

  await t.test(
    'a document comes with no links and is saved under its name when asked',
    async () => {
      const chat = await team();
      const bytes = aDocument();
      const document = await chat.uploads('Бюджет проєкту.pdf', bytes);
      const message = await chat.sends(document);

      const [shown] = await chat.filesShownTo(chat.rob, message.id);
      const { url } = await chat.opens(chat.rob, message.id, document, 'download');

      assert.deepEqual(shown!.links, {});
      assert.deepEqual(services.storage.read(url), bytes);
      assert.equal(new URL(url).searchParams.get('saveAs'), 'Бюджет проєкту.pdf');
    },
  );

  await t.test('a photo whose link lapsed is asked for again', async () => {
    const chat = await team();
    const bytes = await aPhoto();
    const photo = await chat.uploads('Командний план.png', bytes);
    const message = await chat.sends(photo);

    const preview = await chat.opens(chat.rob, message.id, photo, 'preview');
    const thumbnail = await chat.opens(chat.rob, message.id, photo, 'thumbnail');

    assert.deepEqual(services.storage.read(preview.url), bytes);
    assert.ok(services.storage.read(thumbnail.url).length > 0);
    assert.equal([thumbnail.url, preview.url].some(namesFile), false);
  });
});
