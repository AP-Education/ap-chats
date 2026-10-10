import { IsOptional, Matches } from 'class-validator';

// One fully qualified emoji from the Unicode RGI set, so each reaction has a single spelling.
const REACTION_EMOJI = new RegExp('^\\p{RGI_Emoji}$', 'v');
const MESSAGE = 'emoji must be a single emoji';

export class ReactionDto {
  @Matches(REACTION_EMOJI, { message: MESSAGE })
  emoji!: string;
}

export class ReactorsQueryDto {
  @IsOptional()
  @Matches(REACTION_EMOJI, { message: MESSAGE })
  emoji?: string;
}
