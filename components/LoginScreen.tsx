import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import TextField from '@/components/TextField';
import { spacing, useTheme } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { maskEmail } from '@/lib/supabase';
import { useData } from '@/lib/store';

type Mode = 'signin' | 'forgotPassword' | 'forgotUsername' | 'recovery';

/** Shown instead of the app until you are signed in. */
export default function LoginScreen() {
  const theme = useTheme();
  const { data } = useData();
  const auth = useAuth();

  const [mode, setMode] = useState<Mode>(auth.status === 'recovery' ? 'recovery' : 'signin');
  const [email, setEmail] = useState(auth.lastEmail);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const isRecovery = auth.status === 'recovery' || mode === 'recovery';

  function go(next: Mode) {
    setMode(next);
    setError(undefined);
    setNotice(undefined);
  }

  async function run(task: () => Promise<string | null>, success?: string) {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    const err = await task();
    setBusy(false);
    if (err) setError(err);
    else if (success) setNotice(success);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Ionicons name="lock-closed" size={26} color={theme.onPrimary} />
          </View>
          <Text style={[styles.org, { color: theme.text }]}>{data.orgName || 'Attendance Tracker'}</Text>

          {isRecovery ? (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Choose a new password</Text>
              <Text style={[styles.help, { color: theme.textMuted }]}>
                {auth.email ? `For ${auth.email}. ` : ''}Use at least 8 characters.
              </Text>
              <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoFocus />
              <TextField label="Type it again" value={password2} onChangeText={setPassword2} secureTextEntry autoCapitalize="none" />
              <Button
                title={busy ? 'Saving...' : 'Save new password'}
                disabled={busy}
                onPress={() => {
                  if (password !== password2) return setError('The two passwords do not match.');
                  run(() => auth.setNewPassword(password));
                }}
              />
            </>
          ) : mode === 'signin' ? (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Sign in</Text>
              <TextField label="Email (your username)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={() => run(() => auth.signIn(email, password))}
              />
              <Button title={busy ? 'Signing in...' : 'Sign in'} disabled={busy} onPress={() => run(() => auth.signIn(email, password))} />
              <View style={styles.links}>
                <Pressable onPress={() => go('forgotPassword')}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Forgot password?</Text>
                </Pressable>
                <Pressable onPress={() => go('forgotUsername')}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Forgot username?</Text>
                </Pressable>
              </View>
            </>
          ) : mode === 'forgotPassword' ? (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Reset your password</Text>
              <Text style={[styles.help, { color: theme.textMuted }]}>
                We will email you a link. Open that link in your computer's browser (where this app is running) to choose a new password.
              </Text>
              <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Button
                title={busy ? 'Sending...' : 'Email me a reset link'}
                disabled={busy}
                onPress={() => run(() => auth.sendPasswordReset(email), 'If that email has an account, a reset link is on its way. It can take a few minutes. Check your spam folder too.')}
              />
              <Pressable onPress={() => go('signin')} style={styles.back}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Back to sign in</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: theme.text }]}>Forgot your username?</Text>
              <Text style={[styles.help, { color: theme.textMuted }]}>
                Your username is the email address you signed up with.
              </Text>
              {auth.lastEmail ? (
                <View style={[styles.hint, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Text style={{ color: theme.text }}>
                    On this device you last signed in as <Text style={{ fontWeight: '700' }}>{maskEmail(auth.lastEmail)}</Text>
                  </Text>
                  <Button
                    title="Use that email"
                    variant="secondary"
                    onPress={() => {
                      setEmail(auth.lastEmail);
                      go('signin');
                    }}
                  />
                </View>
              ) : null}
              <Text style={[styles.help, { color: theme.textMuted }]}>
                Not sure? Type an email you might have used and we will send a sign-in link to it. If an account exists, it will arrive.
              </Text>
              <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
              <Button
                title={busy ? 'Sending...' : 'Email me a sign-in link'}
                disabled={busy}
                onPress={() => run(() => auth.sendSignInLink(email), 'If that email has an account, a sign-in link is on its way. Open it in your computer\'s browser.')}
              />
              <Pressable onPress={() => go('signin')} style={styles.back}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Back to sign in</Text>
              </Pressable>
            </>
          )}

          {error ? <Text style={[styles.msg, { color: theme.danger }]}>{error}</Text> : null}
          {notice ? <Text style={[styles.msg, { color: theme.primary }]}>{notice}</Text> : null}

          {!isRecovery ? (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Pressable onPress={auth.skip}>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>Skip for now (use the app on this device only)</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: spacing.lg },
  logo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.sm },
  org: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.sm },
  help: { fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  back: { alignSelf: 'flex-start', marginTop: spacing.md },
  hint: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  msg: { fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.lg, paddingTop: spacing.md, alignItems: 'center' },
});
