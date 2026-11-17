import type {
  AppUpdateKind,
  ShellPlatform,
  StoredUpdateManifest,
  UpdateChannel,
} from '@/database/drizzle/schema';

/** An active update as the manifest endpoint offers it. */
export interface OfferedAppUpdate {
  id: string;
  kind: AppUpdateKind;
  runtimeVersion: string;
  manifest: StoredUpdateManifest | null;
  rolloutPercent: number;
  mandatory: boolean;
  createdAt: Date;
}

export interface UpdateTarget {
  platform: ShellPlatform;
  channel: UpdateChannel;
  runtimeVersion: string;
}
