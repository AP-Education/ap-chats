import type { VoiceScope, VoiceStateMessage } from '../types';

export interface RecordingDriver {
  prepare(): Promise<void>;
  record(): void;
  pause(): void;
  stop(): Promise<{ uri: string; size: number }>;
  dispose(): void;
}

export interface LocalRecording extends VoiceScope {
  id: string;
  uri: string;
  size: number;
  name: string;
  durationMs: number;
}

const MAX_DURATION = 600_000;

/** Owns a single microphone lifetime; async permission/stop replies cannot revive a closed session. */
export class VoiceSession {
  private generation = 0;
  private id?: string;
  private scope?: VoiceScope;
  private driver?: RecordingDriver;
  private phase: VoiceStateMessage['phase'] = 'requesting';
  private elapsed = 0;
  private started = 0;
  private timer?: ReturnType<typeof setInterval>;
  private local?: LocalRecording;

  constructor(
    private readonly ports: {
      createDriver: () => RecordingDriver;
      canRecord: () => boolean;
      emit: (state: VoiceStateMessage) => void;
      retain: (file: LocalRecording) => void;
      remove: (uri: string) => void;
      now: () => number;
      randomId: () => string;
    },
  ) {}

  private duration() {
    return this.elapsed + (this.phase === 'recording' ? this.ports.now() - this.started : 0);
  }
  private publish(error?: string) {
    if (!this.id) return;
    this.ports.emit({
      type: 'voice/state',
      sessionId: this.id,
      phase: this.phase,
      durationMs: this.duration(),
      error,
      recording: this.local && { id: this.local.id, name: this.local.name, size: this.local.size },
    });
  }

  async start(id: string, scope: VoiceScope) {
    if (this.id) return;
    this.id = id;
    this.scope = scope;
    this.elapsed = 0;
    this.phase = 'requesting';
    const generation = ++this.generation;
    this.publish();
    try {
      if (!this.ports.canRecord()) throw new Error('Неможливо записувати під час дзвінка.');
      const driver = this.ports.createDriver();
      this.driver = driver;
      await driver.prepare();
      if (this.generation !== generation || !this.ports.canRecord()) {
        driver.dispose();
        if (this.generation === generation) this.fail('Запис перервано дзвінком.');
        return;
      }
      this.phase = 'recording';
      this.started = this.ports.now();
      driver.record();
      this.timer = setInterval(() => {
        if (this.duration() >= MAX_DURATION) void this.stop(id);
        else this.publish();
      }, 250);
      this.publish();
    } catch (error) {
      if (this.generation === generation)
        this.fail(error instanceof Error ? error.message : 'Не вдалося записати голосове.');
    }
  }

  pause(id: string) {
    if (this.id !== id || this.phase !== 'recording') return;
    this.elapsed = this.duration();
    this.driver?.pause();
    this.phase = 'paused';
    this.publish();
  }

  resume(id: string) {
    if (this.id !== id || this.phase !== 'paused') return;
    if (!this.ports.canRecord()) {
      this.interrupt();
      return;
    }
    this.started = this.ports.now();
    this.driver?.record();
    this.phase = 'recording';
    this.publish();
  }

  async stop(id: string) {
    if (this.id !== id || (this.phase !== 'recording' && this.phase !== 'paused')) return;
    this.elapsed = this.duration();
    this.phase = 'stopping';
    clearInterval(this.timer);
    this.publish();
    const generation = this.generation;
    try {
      const driver = this.driver!;
      const result = await driver.stop();
      driver.dispose();
      if (this.driver === driver) this.driver = undefined;
      if (generation !== this.generation) {
        this.ports.remove(result.uri);
        return;
      }
      if (this.elapsed < 500 || result.size < 1 || result.size > 20 * 1024 * 1024) {
        this.ports.remove(result.uri);
        throw new Error('Запис порожній, надто короткий або перевищує 20 МБ.');
      }
      this.local = {
        ...result,
        ...this.scope!,
        id: this.ports.randomId(),
        name: `Голосове-${this.ports.now()}.m4a`,
        durationMs: this.elapsed,
      };
      this.ports.retain(this.local);
      this.phase = 'ready';
      this.publish();
    } catch (error) {
      if (generation === this.generation)
        this.fail(error instanceof Error ? error.message : 'Запис перервано.');
    }
  }

  getRecording(id: string) {
    return this.id === id ? this.local : undefined;
  }
  getSessionId() {
    return this.id;
  }

  interrupt() {
    if (!this.id) return;
    if (this.phase === 'requesting') {
      const id = this.id;
      this.cancel(id);
      this.ports.emit({
        type: 'voice/state',
        sessionId: id,
        phase: 'error',
        durationMs: 0,
        error: 'Запис перервано. Спробуйте ще раз.',
      });
    } else void this.stop(this.id);
  }

  cancel(id: string, keep = false) {
    if (this.id !== id) return;
    this.generation++;
    clearInterval(this.timer);
    this.driver?.dispose();
    this.driver = undefined;
    if (this.local && !keep) this.ports.remove(this.local.uri);
    this.local = undefined;
    this.id = undefined;
    this.scope = undefined;
  }

  private fail(error: string) {
    clearInterval(this.timer);
    this.driver?.dispose();
    this.driver = undefined;
    this.phase = 'error';
    this.publish(error);
  }
}
