import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsUUID } from 'class-validator';

/** The person's own posted message StarMe is to answer in a reply. */
export class AnswerQuestionDto {
  @IsUUID()
  questionId!: string;

  /** Messages the person picked for StarMe to read instead of the latest ones. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  contextMessageIds?: string[];
}
