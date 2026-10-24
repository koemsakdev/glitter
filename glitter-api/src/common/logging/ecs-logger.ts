import type { LoggerService, LogLevel } from '@nestjs/common';

/**
 * Structured logging in Elastic Common Schema (ECS) — one JSON object per
 * line, ready for Elastic / Loki / Datadog / Render log search.
 *
 *   {"@timestamp":"…","log.level":"warn","message":"ABA generate-qr rejected",
 *    "ecs.version":"8.11.0","service.name":"glitter-api","log.logger":"AbaPaywayService",
 *    "event":{"action":"aba.generate_qr","outcome":"failure","reason":"…"},…}
 *
 * Usage (Nest's Logger works unchanged):
 *   this.logger.warn('Plain message');
 *   this.logger.warn({ message: 'ABA rejected', event: { action: 'aba.x', outcome: 'failure' }, aba: { code: '32' } });
 *   this.logger.error({ message: 'Failed', error }, ...)   // Error objects become error.*
 *
 * Env:
 *   LOG_LEVEL   error | warn | log (default) | debug | verbose
 *   LOG_FORMAT  ecs (default) | pretty  — pretty = short readable lines for local dev
 */

const ECS_VERSION = '8.11.0';
const LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];
const ECS_LEVEL: Record<LogLevel, string> = {
  fatal: 'fatal',
  error: 'error',
  warn: 'warn',
  log: 'info',
  debug: 'debug',
  verbose: 'trace',
};

/** Nest start-up chatter: one line per module / route. Dropped at info level. */
const NOISY_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
]);

type Fields = Record<string, unknown>;

const text = (v: unknown): string =>
  typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v);

/** Error → ECS error.* fields. */
export function ecsError(err: unknown): Fields {
  if (err instanceof Error) {
    return {
      type: err.name,
      message: err.message,
      stack_trace: err.stack,
    };
  }
  return { message: typeof err === 'string' ? err : JSON.stringify(err) };
}

export class EcsLogger implements LoggerService {
  private readonly max: number;
  private readonly pretty: boolean;
  private readonly base: Fields;

  constructor() {
    const lvl = (process.env.LOG_LEVEL ?? 'log') as LogLevel;
    this.max = Math.max(
      0,
      LEVELS.indexOf(lvl) === -1 ? 3 : LEVELS.indexOf(lvl),
    );
    this.pretty = process.env.LOG_FORMAT === 'pretty';
    this.base = {
      'ecs.version': ECS_VERSION,
      'service.name': 'glitter-api',
      'service.environment': process.env.NODE_ENV ?? 'development',
      'process.pid': process.pid,
    };
  }

  log(message: unknown, ...rest: unknown[]) {
    this.write('log', message, rest);
  }
  error(message: unknown, ...rest: unknown[]) {
    this.write('error', message, rest);
  }
  warn(message: unknown, ...rest: unknown[]) {
    this.write('warn', message, rest);
  }
  debug(message: unknown, ...rest: unknown[]) {
    this.write('debug', message, rest);
  }
  verbose(message: unknown, ...rest: unknown[]) {
    this.write('verbose', message, rest);
  }
  fatal(message: unknown, ...rest: unknown[]) {
    this.write('fatal', message, rest);
  }

  private write(level: LogLevel, message: unknown, rest: unknown[]) {
    if (LEVELS.indexOf(level) > this.max) return;

    // Nest passes the context last; error() may pass a stack string before it.
    const args = [...rest];
    const context =
      typeof args[args.length - 1] === 'string'
        ? (args.pop() as string)
        : undefined;
    if (level === 'log' && context && NOISY_CONTEXTS.has(context)) return;

    const doc: Fields = {
      '@timestamp': new Date().toISOString(),
      'log.level': ECS_LEVEL[level],
      ...this.base,
    };
    if (context) doc['log.logger'] = context;

    if (message instanceof Error) {
      doc.message = message.message;
      doc.error = ecsError(message);
    } else if (message && typeof message === 'object') {
      const { error, ...fields } = message as Fields;
      Object.assign(doc, fields);
      if (error !== undefined) doc.error = ecsError(error);
    } else {
      doc.message = String(message);
    }

    // Extra args: an Error, a stack string (from Nest), or field objects.
    for (const a of args) {
      if (a instanceof Error) doc.error = ecsError(a);
      else if (typeof a === 'string' && a.includes('\n    at '))
        doc.error = { ...((doc.error as Fields) ?? {}), stack_trace: a };
      else if (a && typeof a === 'object') Object.assign(doc, a);
    }

    const out =
      level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
    if (this.pretty) {
      const ev = doc.event as Fields | undefined;
      const err = doc.error as Fields | undefined;
      out.write(
        `${String(doc['@timestamp']).slice(11, 19)} ${String(doc['log.level']).toUpperCase().padEnd(5)} ` +
          `[${context ?? 'app'}] ${text(doc.message)}` +
          (ev?.reason ? ` — ${text(ev.reason)}` : '') +
          (err?.message && err.message !== doc.message
            ? ` — ${text(err.message)}`
            : '') +
          '\n',
      );
      return;
    }
    out.write(JSON.stringify(doc) + '\n');
  }
}
