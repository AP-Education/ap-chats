/** Serializes the device-wide audio mode and prevents an old recorder from resetting a newer one. */
export class VoiceAudioMode {
  private owner?: symbol;
  private pending: Promise<void> = Promise.resolve();

  constructor(
    private readonly configure: (recording: boolean) => Promise<void>,
    private readonly blocked: () => boolean,
  ) {}

  acquire() {
    const owner = Symbol('voice-recorder');
    this.owner = owner;
    return {
      enable: () => this.enqueue(true, () => this.owner === owner),
      release: () => {
        if (this.owner !== owner) return Promise.resolve();
        this.owner = undefined;
        return this.enqueue(false, () => this.owner === undefined);
      },
    };
  }

  private enqueue(recording: boolean, ownsMode: () => boolean) {
    const next = this.pending
      .catch(() => undefined)
      .then(async () => {
        if (ownsMode() && !this.blocked()) await this.configure(recording);
      });
    this.pending = next;
    return next;
  }
}
