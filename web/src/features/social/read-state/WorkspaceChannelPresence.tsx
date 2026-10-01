import { useEffect } from 'react';

import { useWorkspaceChannelRegistration } from './workspace-channel-context';

export function WorkspaceChannelPresence({ channelId }: { channelId: string }) {
  const { register } = useWorkspaceChannelRegistration();
  useEffect(() => register(channelId), [register, channelId]);
  return null;
}
