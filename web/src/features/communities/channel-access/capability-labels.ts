import type { ChannelCapability } from './types';

/** How each of a channel's three rights reads, wherever the access editor names it. */
export const capabilityLabels: Record<ChannelCapability, { label: string; hint: string }> = {
  view: { label: 'Бачить', hint: 'Читає історію, реагує й отримує сповіщення.' },
  post: { label: 'Пише', hint: 'Пише повідомлення, відповідає в тредах і починає дзвінки.' },
  manage: {
    label: 'Керує',
    hint: 'Змінює канал і доступ до нього, прибирає чужі повідомлення.',
  },
};
