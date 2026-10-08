export class PushProviderError extends Error {
  constructor(
    message: string,
    readonly invalidToken = false,
  ) {
    super(message);
  }
}
