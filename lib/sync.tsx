import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/store';
import { adoptOnlineData, countsOf, Counts, Env, keepThisDevice, Meta, RemoteSummary, Result, Server, syncOnce } from '@/lib/syncEngine';
import { AppData } from '@/lib/types';

const META_KEY = 'attendance-tracker:sync';
const BACKUP_KEY = 'attendance-tracker:backup';
const TABLE = 'app_data';
const DEVICE = Platform.OS;

export type SyncState = 'off' | 'idle' | 'syncing' | 'pending' | 'offline' | 'error' | 'notready' | 'conflict';

export type SyncInfo = {
  state: SyncState;
  message: string;
  lastSyncedAt: string;
  remote: RemoteSummary | null;
  localCounts: Counts | null;
};

type SyncContextValue = {
  info: SyncInfo;
  conflictOpen: boolean;
  /** When the backup of this device's data (made before it was replaced) was saved, or '' if none. */
  backupAt: string;
  syncNow: () => void;
  keepThisDevice: () => Promise<void>;
  useOnlineCopy: () => Promise<void>;
  postponeConflict: () => void;
  reopenConflict: () => void;
  restoreBackup: () => Promise<boolean>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

/** Everything except colours and layout, which stay on each device. */
function payloadOf(data: AppData): unknown {
  const { settings: _settings, ...rest } = data;
  return rest;
}

function makeServer(client: SupabaseClient): Server {
  return {
    async head(uid) {
      const { data, error } = await client.from(TABLE).select('revision,updated_at,device').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      return data ? { revision: Number(data.revision), updatedAt: String(data.updated_at), device: String(data.device ?? '') } : null;
    },
    async fetch(uid) {
      const { data, error } = await client.from(TABLE).select('revision,updated_at,device,data').eq('user_id', uid).single();
      if (error) throw error;
      return { revision: Number(data.revision), updatedAt: String(data.updated_at), device: String(data.device ?? ''), data: data.data };
    },
    async insert(uid, data, device) {
      const { error } = await client.from(TABLE).insert({ user_id: uid, data, revision: 1, device });
      if (error) {
        if (error.code === '23505') return 'exists';
        throw error;
      }
      return 'ok';
    },
    async update(uid, data, expected, device) {
      const { data: rows, error } = await client
        .from(TABLE)
        .update({ data, revision: expected + 1, updated_at: new Date().toISOString(), device })
        .eq('user_id', uid)
        .eq('revision', expected)
        .select('revision');
      if (error) throw error;
      return rows && rows.length > 0 ? Number(rows[0].revision) : null;
    },
  };
}

function classify(e: unknown): Pick<SyncInfo, 'state' | 'message'> {
  const err = e as { code?: string; message?: string };
  const msg = String(err?.message ?? e ?? '');
  if (err?.code === '42P01' || err?.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(msg)) {
    return { state: 'notready', message: 'The online storage is not set up yet. Run the setup SQL once (Settings, then Online account).' };
  }
  if (/failed to fetch|network|timeout|offline|load failed/i.test(msg)) {
    return { state: 'offline', message: 'You appear to be offline. Changes will be sent when you are back online.' };
  }
  if (/jwt|permission|row-level|401|403/i.test(msg)) {
    return { state: 'error', message: 'Not allowed. Try signing out and signing in again.' };
  }
  return { state: 'error', message: msg || 'Something went wrong while syncing.' };
}

const EMPTY: SyncInfo = { state: 'off', message: '', lastSyncedAt: '', remote: null, localCounts: null };

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const store = useData();

  const [info, setInfo] = useState<SyncInfo>(EMPTY);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [backupAt, setBackupAt] = useState('');
  const [metaReady, setMetaReady] = useState(false);

  const metaRef = useRef<Meta>({ userId: '', revision: 0, dirty: false, lastSyncedAt: '' });
  const running = useRef(false);
  const again = useRef(false);
  const paused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeRef = useRef(store);
  const authRef = useRef(auth);
  const changeRef = useRef(store.changeCount);
  const runRef = useRef<() => Promise<void>>(async () => {});
  storeRef.current = store;
  authRef.current = auth;
  changeRef.current = store.changeCount;

  const saveMeta = useCallback((m: Meta) => {
    metaRef.current = m;
    AsyncStorage.setItem(META_KEY, JSON.stringify(m)).catch(() => {});
  }, []);

  // Load what this device remembers about syncing.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(META_KEY);
        if (raw) metaRef.current = { ...metaRef.current, ...(JSON.parse(raw) as Meta) };
        const b = await AsyncStorage.getItem(BACKUP_KEY);
        if (b) setBackupAt((JSON.parse(b) as { savedAt: string }).savedAt ?? '');
      } catch {
        /* start fresh */
      }
      setMetaReady(true);
    })();
  }, []);

  const makeEnv = useCallback(
    (client: SupabaseClient, uid: string): Env => ({
      uid,
      meta: metaRef.current,
      server: makeServer(client),
      device: DEVICE,
      now: () => new Date().toISOString(),
      local: {
        getData: () => payloadOf(storeRef.current.getData()),
        isEmpty: () => {
          const d = storeRef.current.getData();
          return d.people.length === 0 && d.gifts.length === 0 && d.attendance.length === 0 && d.notes.length === 0;
        },
        replace: (data) => storeRef.current.replaceData(data as Partial<AppData>),
        backup: async () => {
          const savedAt = new Date().toISOString();
          await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt, data: storeRef.current.getData() }));
          setBackupAt(savedAt);
        },
        changeSeq: () => changeRef.current,
      },
    }),
    []
  );

  const applyResult = useCallback(
    (res: Result) => {
      saveMeta(res.meta);
      const local = countsOf(storeRef.current.getData());
      if (res.outcome === 'conflict') {
        paused.current = true;
        setInfo({
          state: 'conflict',
          message: 'This device and the online copy have different changes.',
          lastSyncedAt: res.meta.lastSyncedAt,
          remote: res.remote ?? null,
          localCounts: local,
        });
        setConflictOpen(true);
        return;
      }
      if (res.outcome === 'retry') {
        again.current = true;
        return;
      }
      if (res.meta.dirty) again.current = true; // something changed while sending
      setInfo({
        state: 'idle',
        message: res.outcome === 'pulled' ? 'Updated from your online copy.' : 'Everything is saved online.',
        lastSyncedAt: res.meta.lastSyncedAt,
        remote: null,
        localCounts: null,
      });
    },
    [saveMeta]
  );

  const guardedRun = useCallback(
    async (task: (client: SupabaseClient, uid: string) => Promise<Result>) => {
      const a = authRef.current;
      if (!a.client || a.status !== 'signedIn') return;
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      setInfo((i) => ({ ...i, state: 'syncing', message: 'Syncing...' }));
      try {
        const { data } = await a.client.auth.getSession();
        const uid = data.session?.user.id;
        if (!uid) throw new Error('Not signed in');
        applyResult(await task(a.client, uid));
      } catch (e) {
        const c = classify(e);
        setInfo((i) => ({ ...i, ...c }));
      } finally {
        running.current = false;
        if (again.current) {
          again.current = false;
          setTimeout(() => runRef.current(), 400);
        }
      }
    },
    [applyResult]
  );

  const run = useCallback(async () => {
    if (paused.current || !metaReady) return;
    await guardedRun((client, uid) => syncOnce(makeEnv(client, uid)));
  }, [guardedRun, makeEnv, metaReady]);
  runRef.current = run;

  const schedule = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runRef.current(), ms);
  }, []);

  // Remember that this device has changes that are not online yet, and send them soon.
  const prevChange = useRef(store.changeCount);
  useEffect(() => {
    if (store.changeCount === prevChange.current) return;
    prevChange.current = store.changeCount;
    saveMeta({ ...metaRef.current, dirty: true });
    if (auth.status === 'signedIn' && !paused.current) {
      setInfo((i) => (i.state === 'conflict' ? i : { ...i, state: 'pending', message: 'Changes will be sent in a moment.' }));
      schedule(2500);
    }
  }, [store.changeCount, auth.status, saveMeta, schedule]);

  // Start syncing when signed in; stop showing status when not.
  useEffect(() => {
    if (auth.status === 'signedIn' && metaReady) {
      paused.current = false;
      run();
    } else if (auth.status !== 'loading') {
      setInfo(EMPTY);
    }
  }, [auth.status, metaReady, run]);

  // Check again when you come back to the app, and every couple of minutes.
  useEffect(() => {
    if (auth.status !== 'signedIn') return;
    const onShow = () => runRef.current();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && onShow());
    let removeWeb: (() => void) | undefined;
    if (Platform.OS === 'web') {
      const doc = (globalThis as { document?: { addEventListener: (n: string, f: () => void) => void; removeEventListener: (n: string, f: () => void) => void; visibilityState?: string } }).document;
      const fn = () => doc?.visibilityState === 'visible' && onShow();
      doc?.addEventListener('visibilitychange', fn);
      removeWeb = () => doc?.removeEventListener('visibilitychange', fn);
    }
    const iv = setInterval(onShow, 120000);
    return () => {
      sub.remove();
      removeWeb?.();
      clearInterval(iv);
    };
  }, [auth.status]);

  const resolve = useCallback(
    async (fn: typeof keepThisDevice) => {
      paused.current = false;
      setConflictOpen(false);
      await guardedRun((client, uid) => fn(makeEnv(client, uid)));
    },
    [guardedRun, makeEnv]
  );

  const restoreBackup = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(BACKUP_KEY);
      if (!raw) return false;
      const { data } = JSON.parse(raw) as { data: Partial<AppData> };
      storeRef.current.replaceData(data);
      saveMeta({ ...metaRef.current, dirty: true });
      schedule(500);
      return true;
    } catch {
      return false;
    }
  }, [saveMeta, schedule]);

  const value = useMemo<SyncContextValue>(
    () => ({
      info,
      conflictOpen,
      backupAt,
      syncNow: () => {
        paused.current = false;
        runRef.current();
      },
      keepThisDevice: () => resolve(keepThisDevice),
      useOnlineCopy: () => resolve(adoptOnlineData),
      postponeConflict: () => setConflictOpen(false),
      reopenConflict: () => setConflictOpen(true),
      restoreBackup,
    }),
    [info, conflictOpen, backupAt, resolve, restoreBackup]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}

/** A short word for the Settings list. */
export function syncLabel(state: SyncState): string {
  switch (state) {
    case 'idle':
      return 'synced';
    case 'syncing':
      return 'syncing...';
    case 'pending':
      return 'waiting to send';
    case 'offline':
      return 'offline';
    case 'conflict':
      return 'needs attention';
    case 'notready':
      return 'setup needed';
    case 'error':
      return 'problem';
    default:
      return '';
  }
}
