import { IsIn } from 'class-validator';

import { type Locale, localeEnum } from '@/database/drizzle/schema';

export class ChooseLocaleDto {
  @IsIn(localeEnum)
  locale!: Locale;
}
