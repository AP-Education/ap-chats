let pending: Promise<void> = Promise.resolve();

export function queueDeviceRegistration(operation: () => Promise<void>): Promise<void> {
  const result = pending.then(operation);
  pending = result.catch(() => {});
  return result;
}
