import { createContext, useContext } from 'react';

interface WorkspaceChannelRegistration {
  register(channelId: string): () => void;
}

export const WorkspaceChannelContext = createContext<WorkspaceChannelRegistration | null>(null);

export function useWorkspaceChannelRegistration(): WorkspaceChannelRegistration {
  const registration = useContext(WorkspaceChannelContext);
  if (!registration) throw new Error('WorkspaceChannelContext.Provider is missing');
  return registration;
}
