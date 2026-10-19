import { createContext } from 'react';

import type { Outboxes } from './outboxes';

export const OutboxesContext = createContext<Outboxes | null>(null);
