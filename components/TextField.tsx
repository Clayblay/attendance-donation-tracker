import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { spacing, useTheme } from '@/constants/theme';

type Props = Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoFocus' | 'onSubmitEditing' | 'multiline' | 'onSelectionChange' | 'selection' | 'secureTextEntry'
> & {
  label?: string;
  error?: string;
};

export default function TextField({ label, error, ...input }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <TextInput
        {...input}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBg,
            color: theme.text,
            borderColor: error ? theme.danger : theme.border,
          },
          input.multiline && styles.multiline,
        ]}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  error: { fontSize: 12, marginTop: 4 },
});
