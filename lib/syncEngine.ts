/**
 * The rules for keeping this device and the online copy in step.
 * Pure logic with no app or network code, so it can be tested on its own.
 *
 * The online copy has a "revision" number. Every successful upload adds 1.
 * A device remembers the revision it last saw. If the online revision moved and this
 * device also has unsent changes, neither side is overwritten: the person decides.
 */

export type Meta = {
  /** Which online account this record belongs to. */
  userId: string;
  /** The online revision this device last synced with (0 = never). */
  revision: number;
  /** True if this device has changes that are not online yet. */
  dirty: boolean;
  lastSyncedAt: string;
};

export type Counts = { people: number; gifts: number; attendance: number; notes: number };

export type RemoteSummary = { revision: number; updatedAt: string; device: string; counts: Counts };

export interface Server {
  head(uid: string): Promise<{ revision: number; updatedAt: string; device: string } | null>;
  fetch(uid: string): Promise<{ revision: number; updatedAt: string; device: string; data: unknown }>;
  insert(uid: string, data: unknown, device: string): Promise<'ok' | 'exists'>;
  /** Returns the new revision, or null if the online copy changed since `expectedRevision`. */
  update(uid: string, data: unknown, expectedRevision: number, device: string): Promise<number | null>;
}

export interface Local {
  getData(): unknown;
  /** True when there are no people, gifts, attendance or notes yet. */
  isEmpty(): boolean;
  replace(data: unknown): void;
  /** Keep a copy of what is about to be replaced. */
  backup(): Promise<void>;
  /** Goes up by one every time the person changes something. */
  changeSeq(): number;
}

export type Env = { uid: string; meta: Meta; server: Server; local: Local; device: string; now: () => string };

export type Outcome = 'uptodate' | 'inserted' | 'pushed' | 'pulled' | 'conflict' | 'retry';
export type Result = { meta: Meta; outcome: Outcome; remote?: RemoteSummary };

const len = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export function countsOf(d: unknown): Counts {
  const o = (d ?? {}) as Record<string, unknown>;
  return { people: len(o.people), gifts: len(o.gifts), attendance: len(o.attendance), notes: len(o.notes) };
}

function startMeta(env: Env): Meta {
  // A different account (or never signed in) starts from "never synced".
  return env.meta.userId === env.uid ? { ...env.meta } : { userId: env.uid, revision: 0, dirty: false, lastSyncedAt: '' };
}

async function conflictResult(env: Env, meta: Meta): Promise<Result> {
  const row = await env.server.fetch(env.uid);
  return {
    meta,
    outcome: 'conflict',
    remote: { revision: row.revision, updatedAt: row.updatedAt, device: row.device, counts: countsOf(row.data) },
  };
}

async function pull(env: Env, meta: Meta): Promise<Result> {
  const seq = env.local.changeSeq();
  const row = await env.server.fetch(env.uid);
  // The person changed something while we were downloading: do not overwrite it.
  if (env.local.changeSeq() !== seq) {
    return {
      meta: { ...meta, dirty: true },
      outcome: 'conflict',
      remote: { revision: row.revision, updatedAt: row.updatedAt, device: row.device, counts: countsOf(row.data) },
    };
  }
  await env.local.backup();
  env.local.replace(row.data);
  return { meta: { ...meta, revision: row.revision, dirty: false, lastSyncedAt: env.now() }, outcome: 'pulled' };
}

async function push(env: Env, meta: Meta): Promise<Result> {
  const seq = env.local.changeSeq();
  const payload = env.local.getData();
  const next = await env.server.update(env.uid, payload, meta.revision, env.device);
  if (next === null) return { meta, outcome: 'retry' };
  return {
    meta: { ...meta, revision: next, dirty: env.local.changeSeq() !== seq, lastSyncedAt: env.now() },
    outcome: 'pushed',
  };
}

/** One round of syncing. */
export async function syncOnce(env: Env): Promise<Result> {
  const meta = startMeta(env);
  const head = await env.server.head(env.uid);

  if (!head) {
    const seq = env.local.changeSeq();
    const res = await env.server.insert(env.uid, env.local.getData(), env.device);
    if (res === 'exists') return { meta, outcome: 'retry' };
    return {
      meta: { ...meta, revision: 1, dirty: env.local.changeSeq() !== seq, lastSyncedAt: env.now() },
      outcome: 'inserted',
    };
  }

  // Data here that has never been sent online counts as unsent changes.
  const hasUnsent = meta.dirty || (meta.revision === 0 && !env.local.isEmpty());

  if (head.revision === meta.revision) {
    return meta.dirty ? push(env, meta) : { meta, outcome: 'uptodate' };
  }
  if (head.revision > meta.revision) {
    return hasUnsent ? conflictResult(env, meta) : pull(env, meta);
  }
  // The online copy is older than what we last saw (for example it was reset).
  return conflictResult(env, meta);
}

/** The person chose to keep this device's data and replace the online copy. */
export async function keepThisDevice(env: Env): Promise<Result> {
  const meta = startMeta(env);
  const head = await env.server.head(env.uid);
  const seq = env.local.changeSeq();
  const payload = env.local.getData();
  if (!head) {
    const res = await env.server.insert(env.uid, payload, env.device);
    if (res === 'exists') return { meta, outcome: 'retry' };
    return { meta: { ...meta, revision: 1, dirty: env.local.changeSeq() !== seq, lastSyncedAt: env.now() }, outcome: 'inserted' };
  }
  const next = await env.server.update(env.uid, payload, head.revision, env.device);
  if (next === null) return { meta, outcome: 'retry' };
  return { meta: { ...meta, revision: next, dirty: env.local.changeSeq() !== seq, lastSyncedAt: env.now() }, outcome: 'pushed' };
}

/** The person chose the online data and replaces this device's data (a backup is kept). */
export async function adoptOnlineData(env: Env): Promise<Result> {
  const meta = startMeta(env);
  const row = await env.server.fetch(env.uid);
  await env.local.backup();
  env.local.replace(row.data);
  return { meta: { ...meta, revision: row.revision, dirty: false, lastSyncedAt: env.now() }, outcome: 'pulled' };
}
