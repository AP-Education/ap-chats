import { registerSubscription, removeSubscription } from './browser-push-api';
import { applicationServerKey, pushRegistration } from './browser-subscription';

export interface PushAccount {
  identity: string;
  token: string;
}

interface OwnedSubscription {
  account: PushAccount;
  id: string;
  subscription: PushSubscription;
}

export interface BrowserPushRegistrationState {
  subscriptionId: string | null;
  permission: NotificationPermission;
  busy: boolean;
  error: string | null;
}

/** Owns one browser subscription and serializes changes to its authenticated owner. */
export class BrowserPushRegistration {
  private account: PushAccount | null = null;
  private registered: OwnedSubscription | null = null;
  private pending = Promise.resolve();
  private readonly onStateChange: (changes: Partial<BrowserPushRegistrationState>) => void;

  constructor(onStateChange: (changes: Partial<BrowserPushRegistrationState>) => void) {
    this.onStateChange = onStateChange;
  }

  setAccount(account: PushAccount | null): void {
    const ownerChanged = this.account?.identity !== account?.identity;
    this.account = account;
    if (!ownerChanged) return;

    this.onStateChange({ subscriptionId: null, busy: false, error: null });
    void this.serialize(() => this.releasePreviousOwner());
  }

  async synchronize(): Promise<void> {
    const account = this.account;
    if (!account) return;

    const permission = Notification.permission;
    this.onStateChange({ permission });
    if (permission !== 'granted') {
      this.onStateChange({ subscriptionId: null, error: null });
      return;
    }

    try {
      await this.serialize(async () => {
        if (!this.isCurrentAccount(account)) return;

        const registration = await pushRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription || !this.isCurrentAccount(account)) return;

        await this.registerForAccount(account, subscription);
      });
    } catch {
      if (this.isCurrentAccount(account)) {
        this.onStateChange({
          error: 'Не вдалося оновити підписку. Повторимо після відновлення з’єднання.',
        });
      }
    }
  }

  async enable(publicKey: string): Promise<void> {
    const account = this.account;
    if (!account) return;

    this.onStateChange({ busy: true, error: null });
    try {
      // Request permission directly in the click handler, before queued asynchronous work.
      const permission = await Notification.requestPermission();
      this.onStateChange({ permission });
      if (permission === 'denied')
        this.onStateChange({
          error:
            'Браузер не дозволив сповіщення. Перевірте дозвіл для цього сайту та загальні налаштування сповіщень браузера.',
        });
      if (permission !== 'granted') return;

      await this.serialize(async () => {
        if (!this.isCurrentAccount(account)) return;

        const registration = await pushRegistration();
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey(publicKey),
          }));

        if (!this.isCurrentAccount(account)) {
          await subscription.unsubscribe();
          return;
        }

        await this.registerForAccount(account, subscription);
      });
    } catch {
      if (this.isCurrentAccount(account)) {
        this.onStateChange({ error: 'Не вдалося ввімкнути сповіщення. Спробуйте ще раз.' });
      }
    } finally {
      if (this.isCurrentAccount(account)) this.onStateChange({ busy: false });
    }
  }

  async disable(): Promise<void> {
    const account = this.account;
    if (!account) return;

    this.onStateChange({ busy: true, error: null });
    try {
      await this.serialize(async () => {
        if (!this.isCurrentAccount(account)) return;

        const registration = await pushRegistration();
        const subscription = await registration.pushManager.getSubscription();
        const notifications = await registration.getNotifications();
        for (const notification of notifications) notification.close();

        if (subscription && !(await subscription.unsubscribe())) {
          throw new Error('Unsubscribe failed');
        }

        const previous = this.registered;
        this.registered = null;
        if (this.isCurrentAccount(account)) this.onStateChange({ subscriptionId: null });
        if (previous) {
          const token = this.isCurrentAccount(previous.account)
            ? this.account!.token
            : previous.account.token;
          await removeSubscription(token, previous.id);
        }
      });
    } catch {
      if (this.isCurrentAccount(account)) {
        this.onStateChange({ error: 'Не вдалося вимкнути сповіщення. Спробуйте ще раз.' });
      }
    } finally {
      if (this.isCurrentAccount(account)) this.onStateChange({ busy: false });
    }
  }

  private async registerForAccount(
    account: PushAccount,
    subscription: PushSubscription,
  ): Promise<void> {
    const owner = this.account;
    if (!owner || owner.identity !== account.identity) return;

    const result = await registerSubscription(owner.token, subscription);
    this.registered = { account: owner, id: result.id, subscription };

    if (this.isCurrentAccount(account)) {
      this.onStateChange({
        subscriptionId: result.id,
        permission: Notification.permission,
        error: null,
      });
    }
  }

  private async releasePreviousOwner(): Promise<void> {
    const previous = this.registered;
    if (!previous || this.isCurrentAccount(previous.account)) return;

    this.registered = null;
    await Promise.allSettled([
      removeSubscription(previous.account.token, previous.id),
      previous.subscription.unsubscribe(),
    ]);
  }

  private isCurrentAccount(account: PushAccount): boolean {
    return this.account?.identity === account.identity;
  }

  private serialize(operation: () => Promise<void>): Promise<void> {
    const pending = this.pending.then(operation);
    this.pending = pending.catch(() => undefined);
    return pending;
  }
}
