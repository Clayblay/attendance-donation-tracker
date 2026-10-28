import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

/** "abc.supabase.co", "https://abc.supabase.co/rest/v1/" -> "https://abc.supabase.co" (or null if it is not a web address). */
export function normalizeUrl(input: string): string | null {
  let t = input.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    if (!u.hostname.includes('.')) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/** The "service_role" key is a master key. It must never be put in an app. */
export function isServiceRoleKey(key: string): boolean {
  try {
    const part = key.split('.')[1];
    if (!part) return false;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).role === 'service_role';
  } catch {
    return false;
  }
}

/** "jane@example.com" -> "j***@example.com" */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name[0]}${'*'.repeat(Math.max(2, Math.min(name.length - 1, 6)))}@${domain}`;
}

export function isEmail(s: string): boolean {
  return /^\S+@\S+\.\S+$/.test(s.trim());
}

/** Friendly wording for the errors Supabase returns. */
export function describeAuthError(err: unknown): string {
  const raw = String((err as { message?: string })?.message ?? err ?? '');
  const m = raw.toLowerCase();
  if (m.includes('email logins are disabled') || m.includes('email_provider_disabled') || m.includes('provider is disabled')) return 'Email sign-in is switched off in your Supabase project. In Supabase open Authentication, then Sign In / Providers, then Email, and turn on "Enable Email provider". Keep "Allow new users to sign up" off.';
  if (m.includes('invalid login') || m.includes('invalid credentials')) return "That email or password isn't right.";
  if (m.includes('email not confirmed')) return 'This account has not been confirmed yet. In Supabase, open Authentication, then Users, and confirm it.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many email requests. Please wait a few minutes and try again.';
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('timeout')) return 'Could not reach the internet. Check your connection and try again.';
  if (m.includes('signups not allowed') || m.includes('user not found')) return 'No account was found for that email address.';
  if (m.includes('same password') || m.includes('different from the old')) return 'Please choose a password different from your old one.';
  if (m.includes('password should be') || m.includes('weak')) return 'That password is too short or too easy to guess. Use at least 8 characters.';
  return raw || 'Something went wrong. Please try again.';
}

export function createSupabase(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // On the web, the link in a password-reset or sign-in email brings the person back to the app.
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
}
