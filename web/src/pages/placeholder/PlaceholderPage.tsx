import {
  ContentStateDescription,
  ContentStateIcon,
  ContentStateTitle,
  StatePage,
} from '@ap-education/ui';
import { CompassIcon } from '@phosphor-icons/react';

export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <StatePage>
      <ContentStateIcon>
        <CompassIcon />
      </ContentStateIcon>
      <ContentStateTitle>{title}</ContentStateTitle>
      <ContentStateDescription>{description}</ContentStateDescription>
    </StatePage>
  );
}
