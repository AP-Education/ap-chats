import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

import {
  type ShellPlatform,
  shellPlatformEnum,
  type UpdateChannel,
  updateChannelEnum,
} from '@/database/drizzle/schema';
import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import { UpdatesRepository } from '../repository';
import type { OfferedAppUpdate } from '../types';
import {
  expoMultipart,
  type ExpoMultipartBody,
  type ExpoResponsePart,
  signPart,
} from './helpers/expo-response';
import { selectUpdate } from './helpers/select-update';

/** What an `expo-updates` client says about itself, read from its request headers. */
export interface ExpoManifestRequest {
  protocolVersion: string | undefined;
  platform: string | undefined;
  runtimeVersion: string | undefined;
  channel: string | undefined;
  installationId: string | undefined;
  expectsSignature: boolean;
}

@Injectable()
export class ExpoManifestService {
  constructor(
    private readonly updates: UpdatesRepository,
    private readonly config: AppConfigService,
    private readonly logger: Logger,
  ) {}

  async respond(request: ExpoManifestRequest): Promise<ExpoMultipartBody> {
    if (request.protocolVersion !== '1')
      throw new BadRequestException('Only Expo Updates protocol 1 is supported');
    if (!shellPlatformEnum.includes(request.platform as ShellPlatform))
      throw new BadRequestException('Unsupported expo-platform');
    if (!request.runtimeVersion) throw new BadRequestException('Missing expo-runtime-version');

    const sign = request.expectsSignature ? this.signer() : undefined;
    // A build on an unknown channel is not an error: it is simply offered nothing.
    const update = updateChannelEnum.includes(request.channel as UpdateChannel)
      ? selectUpdate(
          await this.updates.findOffered({
            platform: request.platform as ShellPlatform,
            channel: request.channel as UpdateChannel,
            runtimeVersion: request.runtimeVersion,
          }),
          request.installationId || null,
        )
      : null;

    return expoMultipart(
      [...this.parts(update), { name: 'extensions', body: { assetRequestHeaders: {} } }],
      sign,
    );
  }

  private parts(update: OfferedAppUpdate | null): ExpoResponsePart[] {
    if (!update) return [{ name: 'directive', body: { type: 'noUpdateAvailable' } }];
    if (update.kind === 'rollback_to_embedded' || !update.manifest)
      return [
        {
          name: 'directive',
          body: {
            type: 'rollBackToEmbedded',
            parameters: { commitTime: update.createdAt.toISOString() },
          },
        },
      ];

    return [
      {
        name: 'manifest',
        body: {
          id: update.id,
          createdAt: update.createdAt.toISOString(),
          runtimeVersion: update.runtimeVersion,
          launchAsset: update.manifest.launchAsset,
          assets: update.manifest.assets,
          metadata: {},
          extra: { mandatory: update.mandatory },
        },
      },
    ];
  }

  private signer(): (body: string) => string {
    const key = this.config.get('EXPO_UPDATES_PRIVATE_KEY');
    if (!key) {
      // Answering unsigned would make every signed build reject the response anyway.
      this.logger.error('A shell expects signed updates but EXPO_UPDATES_PRIVATE_KEY is not set');
      throw new ServiceUnavailableException('Update signing is not configured');
    }
    return (body) => signPart(body, key);
  }
}
