import { Controller, Get, Headers, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ExpoManifestService } from './expo-manifest.service';

/**
 * The `updates.url` native builds are configured with. Unguarded on purpose: a shell checks for
 * updates before anyone signs in, and the bundle it gets is signed rather than secret.
 */
@Controller('updates/expo')
export class ExpoManifestController {
  constructor(private readonly manifests: ExpoManifestService) {}

  @Get('manifest')
  async manifest(
    @Headers() headers: Record<string, string | undefined>,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const { contentType, body } = await this.manifests.respond({
      protocolVersion: headers['expo-protocol-version'],
      platform: headers['expo-platform'],
      runtimeVersion: headers['expo-runtime-version'],
      channel: headers['expo-channel-name'],
      // expo-updates sends a stable per-installation id; a shell may also send its own.
      installationId: headers['eas-client-id'] ?? headers['ap-installation-id'],
      expectsSignature: headers['expo-expect-signature'] !== undefined,
    });

    await reply
      .header('expo-protocol-version', '1')
      .header('expo-sfv-version', '0')
      .header('cache-control', 'private, max-age=0')
      .header('content-type', contentType)
      .send(body);
  }
}
