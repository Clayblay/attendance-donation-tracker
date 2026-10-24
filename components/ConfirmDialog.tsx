import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from '@/components/Button';
import FormModal from '@/components/FormModal';
import { useTheme } from '@/constants/theme';

type Props = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Our own confirm box (the built-in Alert does not work in web browsers). */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  return (
    <FormModal
      visible
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
          <Button title={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
        </>
      }
    >
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  message: { fontSize: 15, lineHeight: 22 },
});
