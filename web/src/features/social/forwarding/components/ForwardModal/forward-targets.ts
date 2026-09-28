export interface ForwardTarget {
  kind: 'channel' | 'direct' | 'person';
  id: string;
  name: string;
}

export interface ForwardTargetOption extends ForwardTarget {
  detail: string;
  avatarPath?: string | null;
  private?: boolean;
  disabled?: boolean;
}

export interface ForwardTargetGroup {
  label: string;
  items: ForwardTargetOption[];
}
