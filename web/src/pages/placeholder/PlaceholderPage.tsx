import {
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
  StatePage,
} from '@ap-education/ui';
import { CompassIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export default function PlaceholderPage({ placeholder }: { placeholder: 'notFound' }) {
  const { t } = useTranslation('navigation');

  return (
    <StatePage>
      <ContentStateIcon>
        <CompassIcon />
      </ContentStateIcon>
      <ContentStateTitle>{t(($) => $.placeholders[placeholder].title)}</ContentStateTitle>
      <ContentStateDescription>
        {t(($) => $.placeholders[placeholder].description)}
      </ContentStateDescription>
    </StatePage>
  );
}
