import { useState } from 'react';

/** Last location visited inside each application, so the rail returns to where you were. */
export function useRememberedLocations(activeId: string | undefined, location: string) {
  const [locations, setLocations] = useState<Record<string, string>>({});

  if (activeId && locations[activeId] !== location) {
    setLocations({ ...locations, [activeId]: location });
  }

  return locations;
}
