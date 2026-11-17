import type {
  AppUpdateKind,
  AppUpdateStatus,
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

/** One cold start of a shell, as it reports it. */
export interface LaunchReport {
  platform: ShellPlatform;
  runtimeVersion: string;
  updateId: string | null;
  isEmergencyLaunch: boolean;
  ok: boolean;
}

export interface NewAppUpdate extends UpdateTarget {
  kind: AppUpdateKind;
  manifest: StoredUpdateManifest | null;
  rolloutPercent: number;
  mandatory: boolean;
  sourceUpdateId: string | null;
  gitCommit: string | null;
  notes: string | null;
  createdBy: string | null;
}

/** An update with what its launches looked like so far, for deciding whether to widen it. */
export interface AppUpdateSummary {
  id: string;
  kind: AppUpdateKind;
  platform: ShellPlatform;
  channel: UpdateChannel;
  runtimeVersion: string;
  buildNumber: number;
  rolloutPercent: number;
  status: AppUpdateStatus;
  mandatory: boolean;
  sourceUpdateId: string | null;
  gitCommit: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  launches: number;
  successes: number;
  emergencyLaunches: number;
}

export interface UpdateListFilter {
  channel: UpdateChannel;
  platform?: ShellPlatform;
  limit: number;
}

/** An update as admin actions see it before changing it. */
export interface StoredAppUpdate extends UpdateTarget {
  id: string;
  kind: AppUpdateKind;
  status: AppUpdateStatus;
  manifest: StoredUpdateManifest | null;
  createdAt: Date;
}

/** What a rollback published in place of the update it revoked. */
export interface RollbackResult {
  id: string;
  kind: AppUpdateKind;
  sourceUpdateId: string | null;
}
