import { useEffect, useState } from 'react';

export type NotificationLevel = 'default' | 'all' | 'mentions' | 'none';

interface NotificationPreference {
  level: NotificationLevel;
  mutedUntil: number | null;
}

const defaultPreference: NotificationPreference = { level: 'default', mutedUntil: null };

function isNotificationLevel(value: unknown): value is NotificationLevel {
  return value === 'default' || value === 'all' || value === 'mentions' || value === 'none';
}

function readPreference(key: string): NotificationPreference {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return defaultPreference;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return defaultPreference;
    const value = parsed as Partial<NotificationPreference>;
    if (!isNotificationLevel(value.level)) return defaultPreference;
    return {
      level: value.level,
      mutedUntil:
        typeof value.mutedUntil === 'number' && value.mutedUntil > Date.now()
          ? value.mutedUntil
          : null,
    };
  } catch {
    return defaultPreference;
  }
}

export function useChannelNotificationPreference(workspaceId: string, channelId: string) {
  const key = `ap-connect:channel-notifications:${workspaceId}:${channelId}`;
  const [preference, setPreference] = useState(() => readPreference(key));
  const isMuted = preference.level === 'none' || Boolean(preference.mutedUntil);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(preference));
    } catch {
      // Browser storage may be unavailable; keep the current session's choice.
    }
  }, [key, preference]);

  useEffect(() => {
    if (!preference.mutedUntil) return;
    const remaining = preference.mutedUntil - Date.now();
    const timeout = window.setTimeout(
      () => setPreference((current) => ({ ...current, mutedUntil: null })),
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(timeout);
  }, [preference.mutedUntil]);

  function chooseLevel(level: NotificationLevel) {
    setPreference({ level, mutedUntil: null });
  }

  function chooseMute(milliseconds: number) {
    setPreference((current) => ({
      level: current.level === 'none' ? 'default' : current.level,
      mutedUntil: Date.now() + milliseconds,
    }));
  }

  function unmute() {
    setPreference((current) => ({
      level: current.level === 'none' ? 'default' : current.level,
      mutedUntil: null,
    }));
  }

  return { level: preference.level, isMuted, chooseLevel, chooseMute, unmute };
}
