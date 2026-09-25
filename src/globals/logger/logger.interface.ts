// Application-facing contract adapted from backend-LMS.
export abstract class Logger {
  abstract log(message: string): void;
  abstract info(message: string): void;
  abstract info(fields: Record<string, unknown>, message: string): void;
  abstract warn(message: string): void;
  abstract warn(fields: Record<string, unknown>, message: string): void;
  abstract error(message: string): void;
  abstract error(fields: Record<string, unknown>, message: string): void;
  abstract debug(message: string): void;
  abstract debug(fields: Record<string, unknown>, message: string): void;
  abstract assign(bindings: Record<string, unknown>): void;
  abstract child(bindings: Record<string, unknown>): Logger;
}
