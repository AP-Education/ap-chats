export class PushProviderError extends Error {
  constructor(
    message: string,
    readonly invalidToken = false,
    readonly reason = 'unknown',
  ) {
    super(message);
  }
}
