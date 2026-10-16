import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import { DrizzleChannelAccessRepository } from '@/components/communities/channel-access/channel-access/repository/drizzle-channel-access.repository';
import { DrizzleChatUploadsRepository } from '@/components/social/attachments/repository/drizzle-chat-uploads.repository';
import { UploadPolicy } from '@/components/social/attachments/upload-policy';
import { UploadsService } from '@/components/social/attachments/uploads.service';
import { MessageMarkdownService } from '@/components/social/content';
import { EntriesFacade } from '@/components/social/entries';
import { DrizzleEntriesRepository } from '@/components/social/entries/repository/drizzle-entries.repository';
import { ForwardingService } from '@/components/social/forwarding/forwarding.service';
import { HistoryService } from '@/components/social/history/history.service';
import { DrizzleHistoryRepository } from '@/components/social/history/repository/drizzle-history.repository';
import { MentionsService } from '@/components/social/mentions';
import { DrizzleMentionsRepository } from '@/components/social/mentions/repository/drizzle-mentions.repository';
import { MessagesService } from '@/components/social/messages';
import { DrizzleMessagesRepository } from '@/components/social/messages/repository/drizzle-messages.repository';
import { PinsService } from '@/components/social/pins';
import { DrizzlePinsRepository } from '@/components/social/pins/repository/drizzle-pins.repository';
import { MessageComposer, SendMessageService } from '@/components/social/posting';
import { DeleteMessagesService } from '@/components/social/posting/delete-messages.service';
import { EditMessageService } from '@/components/social/posting/edit-message.service';
import { ReactionsService } from '@/components/social/reactions/reactions.service';
import { DrizzleReactionsRepository } from '@/components/social/reactions/repository/drizzle-reactions.repository';
import { ReadStateService } from '@/components/social/read-state';
import { DrizzleReadStateRepository } from '@/components/social/read-state/repository/drizzle-read-state.repository';
import {
  ScheduledMessagesService,
  ScheduleMessageService,
  SendScheduledMessageService,
} from '@/components/social/scheduling';
import { DrizzleScheduledMessagesRepository } from '@/components/social/scheduling/repository';
import { DrizzleWorkspaceMembersRepository } from '@/components/workspaces/members/repository';
import { DrizzleRolesRepository } from '@/components/workspaces/roles/repository';
import { RolesFacade } from '@/components/workspaces/roles/roles.facade';
import { AppConfigService } from '@/globals/config';
import { validateConfig } from '@/globals/config/config.schema';
import { DrizzleEventOutboxRepository } from '@/globals/publisher/repository/drizzle-event-outbox.repository';
import { TransactionalEventPublisher } from '@/globals/publisher/transactional-event-publisher';

import { directMessageServices } from './direct-messages';
import type { transactionHost } from './pglite';

export interface Published {
  name: string;
  event: unknown;
}

/**
 * Social's services over one embedded database, composed as the app composes them, with what
 * they publish collected in order. Specs run without decorator metadata, so Nest cannot do this.
 */
export function socialServices(
  host: ReturnType<typeof transactionHost>,
  overrides: { access?: object } = {},
) {
  const txHost = host as never;
  const emitter = new EventEmitter2();
  const published: Published[] = [];
  emitter.onAny((name, event) => published.push({ name: String(name), event }));

  const events = new TransactionalEventPublisher(
    emitter,
    new DrizzleEventOutboxRepository(txHost),
    txHost,
  );
  const access = (overrides.access ??
    new ChannelAccessPolicy(new DrizzleChannelAccessRepository(txHost))) as ChannelAccessPolicy;
  const markdown = new MessageMarkdownService();
  const mentions = new MentionsService(
    new DrizzleMentionsRepository(txHost),
    access,
    new RolesFacade(new DrizzleRolesRepository(txHost)),
  );
  const messages = new MessagesService(
    new DrizzleMessagesRepository(txHost),
    new EntriesFacade(new DrizzleEntriesRepository(txHost)),
    mentions,
  );
  const config = new AppConfigService(new ConfigService(validateConfig(process.env)));
  const uploads = new UploadsService(
    access,
    new DrizzleChatUploadsRepository(txHost),
    {} as never,
    new UploadPolicy(config),
  );
  const pins = new PinsService(access, messages, new DrizzlePinsRepository(txHost), events);
  const composer = new MessageComposer(markdown, messages, uploads);
  const sending = new SendMessageService(access, composer, messages, events);
  const scheduled = new DrizzleScheduledMessagesRepository(txHost);
  const readState = new ReadStateService(access, new DrizzleReadStateRepository(txHost), events);

  return {
    published,
    events,
    messages,
    pins,
    readState,
    history: new HistoryService(access, new DrizzleHistoryRepository(txHost), readState),
    sending,
    editing: new EditMessageService(access, markdown, messages, events),
    deleting: new DeleteMessagesService(access, messages, pins, events),
    reactions: new ReactionsService(
      access,
      messages,
      new DrizzleReactionsRepository(txHost),
      events,
    ),
    forwarding: new ForwardingService(
      access,
      directMessageServices(host, access).conversations,
      messages,
      events,
    ),
    scheduledMessages: scheduled,
    scheduling: new ScheduleMessageService(access, composer, scheduled, events),
    schedule: new ScheduledMessagesService(access, markdown, scheduled, events),
    scheduledSending: new SendScheduledMessageService(
      scheduled,
      new DrizzleWorkspaceMembersRepository(txHost),
      sending,
      events,
    ),
  };
}
