import {
  EnvelopeSimpleIcon,
  GlobeIcon,
  type Icon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MessengerLogoIcon,
  TelegramLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react';

import type { ClientChannel } from '../data';

const icons: Record<ClientChannel, Icon> = {
  WhatsApp: WhatsappLogoIcon,
  Telegram: TelegramLogoIcon,
  Instagram: InstagramLogoIcon,
  Email: EnvelopeSimpleIcon,
  Messenger: MessengerLogoIcon,
  TikTok: TiktokLogoIcon,
  Website: GlobeIcon,
  LinkedIn: LinkedinLogoIcon,
};

/** The channel the client writes from, as its logo. */
export function ClientChannelIcon({
  channel,
  size = 14,
}: {
  channel: ClientChannel;
  size?: number;
}) {
  const ChannelIcon = icons[channel];
  return <ChannelIcon size={size} weight="fill" aria-label={channel} />;
}
