import { useState } from 'react';

/** How often a count has grown since it first loaded, to replay an animation on each rise. */
export function useCountRises(count: number | undefined): number {
  const [seen, setSeen] = useState(count);
  const [rises, setRises] = useState(0);

  if (count !== seen) {
    const hasRisen = seen !== undefined && count !== undefined && count > seen;
    if (hasRisen) setRises(rises + 1);
    setSeen(count);
  }

  return rises;
}
