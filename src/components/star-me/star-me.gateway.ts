import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { ChannelBroadcast } from '@/components/social/realtime';

import { STAR_ME_STATUS_EVENT, StarMeStatusEvent } from './events/star-me-status.event';

/** Tells everyone watching the channel where StarMe is with a question. */
@Injectable()
export class StarMeGateway {
  constructor(private readonly broadcast: ChannelBroadcast) {}

  @OnEvent(STAR_ME_STATUS_EVENT)
  onStatus(event: StarMeStatusEvent): Promise<void> {
    return this.broadcast.changed(STAR_ME_STATUS_EVENT, event);
  }
}
