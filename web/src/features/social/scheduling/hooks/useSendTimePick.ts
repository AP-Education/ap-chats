import { useState } from 'react';

import { startOfMonth } from '../calendar';
import {
  atTimeOfDay,
  defaultSendTime,
  isSendTimeAllowed,
  sendTimeOptions,
  timeOfDay,
} from '../send-times';

/** The day and time picked for a message, and the moment they mean while it is still allowed. */
export function useSendTimePick(initial?: Date) {
  const [now] = useState(() => new Date());
  const options = sendTimeOptions(now);
  const start = initial ?? defaultSendTime(now);
  const [day, setDay] = useState(start);
  const [time, setTime] = useState(() => timeOfDay(start));
  const [month, setMonth] = useState(() => startOfMonth(start));

  const picked = atTimeOfDay(day, time);
  const sendAt = picked && isSendTimeAllowed(picked, new Date()) ? picked : null;

  function pick(at: Date) {
    setDay(at);
    setTime(timeOfDay(at));
    setMonth(startOfMonth(at));
  }

  return { now, options, day, setDay, time, setTime, month, setMonth, picked, sendAt, pick };
}
