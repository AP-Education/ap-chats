import { Module } from '@nestjs/common';

import { DigitalOceanSpacesProvider } from './digital-ocean-spaces.provider';
import { StorageProvider } from './storage.provider';

@Module({
  providers: [{ provide: StorageProvider, useClass: DigitalOceanSpacesProvider }],
  exports: [StorageProvider],
})
export class StorageModule {}
