import { Module } from '@nestjs/common';

import { MemberAccessProjections } from './member-access-projections';

/** One registry for the whole app, so every projection hears every change to people's roles. */
@Module({
  providers: [MemberAccessProjections],
  exports: [MemberAccessProjections],
})
export class WorkspaceAccessModule {}
