const tasks = new Set<() => Promise<void>>();

/** Lets a feature clean up server-side state while the session's token still works. */
export function onSignOut(task: () => Promise<void>): () => void {
  tasks.add(task);
  return () => tasks.delete(task);
}

export async function runSignOutTasks(): Promise<void> {
  await Promise.allSettled([...tasks].map((task) => task()));
}
