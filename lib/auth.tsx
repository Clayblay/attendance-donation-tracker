import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { createSupabase, describeAuthError, isEmail, isServiceRoleKey, normalizeUrl } from '@/lib/supabase';

const CONFIG_KEY = 'attendance-tracker:supabase';
const LAST_EMAIL_KEY = 'attendance-tracker:lastEmail';

export type AuthStatus = 'loading' | 'local' | 'signedOut' | 'signedIn' | 'recovery';

type Config = { url: string; anonKey: string };

type AuthContextValue = {
  status: AuthStatus;
  email: string;
  /** The email last used to sign in on this device (helps if you forget your username). */
  lastEmail: string;
  configured: boolean;
  /** True when the person chose "Skip for now" on the sign-in screen. */
  skipped: boolean;
  client: SupabaseClient | null;
  /** Each of these returns an error message to show, or null when it worked. */
  connect: (url: string, anonKey: string) => Promise<string | null>;
  disconnect: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  sendSignInLink: (email: string) => Promise<string | null>;
  setNewPassword: (password: string) => Promise<string | null>;
  skip: () => void;
  resume: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function webOrigin(): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  const loc = (globalThis as { location?: { origin?: string } }).location;
  return loc?.origin;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState('');
  const [lastEmail, setLastEmail] = useState('');
  const [skipped, setSkipped] = useState(false);
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const unsubscribe = useRef<(() => void) | null>(null);

  const attach = useCallback(async (cfg: Config) => {
    unsubscribe.current?.();
    const c = createSupabase(cfg.url, cfg.anonKey);
    setClient(c);

    const { data: sub } = c.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setEmail(session?.user.email ?? '');
        setStatus('recovery');
      } else if (event === 'SIGNED_OUT') {
        setEmail('');
        setStatus('signedOut');
      } else if (session) {
        setEmail(session.user.email ?? '');
        setStatus((cur) => (cur === 'recovery' ? cur : 'signedIn'));
        if (session.user.email) {
          setLastEmail(session.user.email);
          AsyncStorage.setItem(LAST_EMAIL_KEY, session.user.email).catch(() => {});
        }
      }
    });
    unsubscribe.current = () => sub.subscription.unsubscribe();

    try {
      const { data } = await c.auth.getSession();
      if (data.session) {
        setEmail(data.session.user.email ?? '');
        setStatus((cur) => (cur === 'recovery' ? cur : 'signedIn'));
      } else {
        setStatus((cur) => (cur === 'recovery' ? cur : 'signedOut'));
      }
    } catch {
      setStatus((cur) => (cur === 'recovery' ? cur : 'signedOut'));
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLastEmail((await AsyncStorage.getItem(LAST_EMAIL_KEY)) ?? '');
        const raw = await AsyncStorage.getItem(CONFIG_KEY);
        const cfg = raw ? (JSON.parse(raw) as Config) : null;
        if (cfg?.url && cfg?.anonKey) await attach(cfg);
        else setStatus('local');
      } catch {
        setStatus('local');
      }
    })();
    return () => unsubscribe.current?.();
  }, [attach]);

  const connect = useCallback(
    async (urlInput: string, keyInput: string) => {
      const url = normalizeUrl(urlInput);
      const anonKey = keyInput.trim();
      if (!url) return 'That does not look like a web address. It should look like https://abcdefgh.supabase.co';
      if (!anonKey) return 'Please paste the public (anon) key.';
      if (isServiceRoleKey(anonKey)) {
        return 'That is the secret "service_role" key. Never put it in an app. Use the public "anon" key instead.';
      }
      try {
        const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
        if (!res.ok) return 'Supabase did not accept that address and key. Check both and try again.';
      } catch {
        return 'Could not reach that address. Check it, and your internet connection.';
      }
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }));
      setSkipped(false);
      setStatus('loading');
      await attach({ url, anonKey });
      return null;
    },
    [attach]
  );

  const disconnect = useCallback(async () => {
    try {
      await client?.auth.signOut();
    } catch {
      /* ignore */
    }
    unsubscribe.current?.();
    unsubscribe.current = null;
    await AsyncStorage.removeItem(CONFIG_KEY);
    setClient(null);
    setEmail('');
    setSkipped(false);
    setStatus('local');
  }, [client]);

  const signIn = useCallback(
    async (emailInput: string, password: string) => {
      if (!client) return 'Not connected.';
      if (!isEmail(emailInput)) return 'Please enter your email address.';
      if (!password) return 'Please enter your password.';
      try {
        const { error } = await client.auth.signInWithPassword({ email: emailInput.trim(), password });
        return error ? describeAuthError(error) : null;
      } catch (e) {
        return describeAuthError(e);
      }
    },
    [client]
  );

  const signOut = useCallback(async () => {
    try {
      await client?.auth.signOut();
    } catch {
      /* ignore */
    }
    setSkipped(false);
    setEmail('');
    setStatus('signedOut');
  }, [client]);

  const sendPasswordReset = useCallback(
    async (emailInput: string) => {
      if (!client) return 'Not connected.';
      if (!isEmail(emailInput)) return 'Please enter your email address.';
      try {
        const { error } = await client.auth.resetPasswordForEmail(emailInput.trim(), { redirectTo: webOrigin() });
        return error ? describeAuthError(error) : null;
      } catch (e) {
        return describeAuthError(e);
      }
    },
    [client]
  );

  const sendSignInLink = useCallback(
    async (emailInput: string) => {
      if (!client) return 'Not connected.';
      if (!isEmail(emailInput)) return 'Please enter your email address.';
      try {
        const { error } = await client.auth.signInWithOtp({
          email: emailInput.trim(),
          options: { shouldCreateUser: false, emailRedirectTo: webOrigin() },
        });
        return error ? describeAuthError(error) : null;
      } catch (e) {
        return describeAuthError(e);
      }
    },
    [client]
  );

  const setNewPassword = useCallback(
    async (password: string) => {
      if (!client) return 'Not connected.';
      if (password.length < 8) return 'Please use at least 8 characters.';
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) return describeAuthError(error);
        setStatus('signedIn');
        return null;
      } catch (e) {
        return describeAuthError(e);
      }
    },
    [client]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      email,
      lastEmail,
      configured: client !== null,
      skipped,
      client,
      connect,
      disconnect,
      signIn,
      signOut,
      sendPasswordReset,
      sendSignInLink,
      setNewPassword,
      skip: () => setSkipped(true),
      resume: () => setSkipped(false),
    }),
    [status, email, lastEmail, skipped, client, connect, disconnect, signIn, signOut, sendPasswordReset, sendSignInLink, setNewPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
