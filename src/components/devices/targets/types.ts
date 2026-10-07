/** A credential version, never the credential itself, is safe to persist in queue jobs. */
export interface DeviceTarget {
  id: string;
  fingerprint: string;
}

export interface CallTargetReference extends DeviceTarget {
  userId: string;
}
