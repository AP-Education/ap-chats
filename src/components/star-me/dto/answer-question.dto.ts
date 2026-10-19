import { IsUUID } from 'class-validator';

/** The person's own posted message StarMe is to answer in a reply. */
export class AnswerQuestionDto {
  @IsUUID()
  questionId!: string;
}
