import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** A centred dialog card that works the same on Android, web and desktop. */
export default function FormModal({ visible, title, onClose, children, footer }: Props) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: spacing.md },
  body: { flexGrow: 0 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
