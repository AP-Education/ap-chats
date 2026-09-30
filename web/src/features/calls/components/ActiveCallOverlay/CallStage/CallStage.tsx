import { AvatarStage } from './AvatarStage';
import { DominantStage } from './DominantStage';
import { GridStage } from './GridStage';
import type { StageView } from './useCallStageParticipants';
import { WaitingStage } from './WaitingStage';

interface CallStageProps {
  view: StageView;
}

/** Picks the right stage presentation for the current view — the "is there
 * video to protect" decision itself lives in useCallStageParticipants, one
 * level up, so CallScreen's chrome and this layout never disagree about it. */
export function CallStage({ view }: CallStageProps) {
  switch (view.kind) {
    case 'waiting':
      return <WaitingStage callee={view.callee} />;
    case 'avatars':
      return <AvatarStage participants={view.participants} tileSize={view.tileSize} />;
    case 'dominant':
      return <DominantStage {...view} />;
    case 'grid':
      return <GridStage {...view} />;
  }
}
