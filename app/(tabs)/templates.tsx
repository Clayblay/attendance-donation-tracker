import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import Screen from '@/components/Screen';
import TemplateForm from '@/components/TemplateForm';
import { spacing, useTheme } from '@/constants/theme';
import { useData } from '@/lib/store';
import { LetterTemplate, LetterTemplateInput, TemplateKind } from '@/lib/types';

type Editing = { kind: TemplateKind; item: LetterTemplate | null } | null;

const SECTIONS: { kind: TemplateKind; title: string; help: string }[] = [
  { kind: 'thankyou', title: 'Thank-you letters', help: 'Sent for one gift. Open History and tap the envelope on a gift.' },
  { kind: 'statement', title: 'Yearly giving statements', help: 'Sent for a whole year. Open Settings, then Giving statements.' },
];

export default function TemplatesScreen() {
  const theme = useTheme();
  const { data, addTemplate, updateTemplate, deleteTemplate } = useData();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<LetterTemplate | null>(null);

  function save(input: LetterTemplateInput) {
    if (!editing) return;
    if (editing.item) updateTemplate(editing.item.id, input);
    else addTemplate(input, editing.kind);
    setEditing(null);
  }

  const takenNames = editing
    ? data.templates.filter((t) => t.kind === editing.kind && t.id !== editing.item?.id).map((t) => t.name)
    : [];

  return (
    <Screen
      title="Letter templates"
      subtitle="Wording that fills in names, amounts and dates for you"
      back={{ label: 'Settings', to: '/settings' }}
    >
      {SECTIONS.map((sec) => {
        const items = data.templates.filter((t) => t.kind === sec.kind);
        return (
          <View key={sec.kind} style={{ marginBottom: spacing.lg }}>
            <View style={styles.secHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.secTitle, { color: theme.text }]}>{sec.title}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13 }}>{sec.help}</Text>
              </View>
              <Button title="Add" icon="add" onPress={() => setEditing({ kind: sec.kind, item: null })} />
            </View>
            {items.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.textMuted }}>No templates yet. Tap Add to write one.</Text>
              </View>
            ) : (
              items.map((t) => (
                <View key={t.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.name, { color: theme.text }]}>{t.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>Subject: {t.subject}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: spacing.sm }} numberOfLines={3}>{t.body}</Text>
                  <View style={styles.actions}>
                    <Pressable accessibilityLabel={`Edit ${t.name}`} onPress={() => setEditing({ kind: t.kind, item: t })} style={styles.iconBtn}>
                      <Ionicons name="create-outline" size={22} color={theme.primary} />
                    </Pressable>
                    <Pressable accessibilityLabel={`Delete ${t.name}`} onPress={() => setDeleting(t)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={22} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      })}

      {editing ? (
        <TemplateForm kind={editing.kind} item={editing.item} takenNames={takenNames} onSave={save} onClose={() => setEditing(null)} />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this template?"
          message={`"${deleting.name}" will be removed. Letters and statements you already sent are not affected.`}
          confirmLabel="Delete"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteTemplate(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  secTitle: { fontSize: 18, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md },
  name: { fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  iconBtn: { padding: 6 },
  empty: { borderWidth: 1, borderRadius: 16, padding: spacing.md },
});
