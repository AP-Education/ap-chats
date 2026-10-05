export type PushTargetKind = 'expo' | 'web';

/** A credential version, never the credential itself, is safe to persist in queue jobs. */
export interface PushTargetReference {
  kind: PushTargetKind;
  id: string;
  fingerprint: string;
}

export interface CallTargetReference {
  id: string;
  userId: string;
  fingerprint: string;
}
