import React from 'react';
import { Text } from 'react-native';
import Button from '@/components/Button';
import ErrorCatcher from '@/components/ErrorCatcher';
import FormModal from '@/components/FormModal';
import ReportsPanel from '@/components/ReportsPanel';
import { useTheme } from '@/constants/theme';

function Problem({ error }: { error: Error }) {
  const theme = useTheme();
  return (
    <>
      <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 8 }}>The reports page ran into a problem:</Text>
      <Text selectable style={{ color: theme.danger }}>{String(error?.message ?? error)}</Text>
    </>
  );
}

/** Reports as a pop-up window, so it never depends on page navigation. */
export default function ReportsModal({ onClose }: { onClose: () => void }) {
  return (
    <FormModal
      visible
      wide
      title="Reports"
      onClose={onClose}
      footer={<Button title="Close" variant="secondary" onPress={onClose} />}
    >
      <ErrorCatcher fallback={(e) => <Problem error={e} />}>
        <ReportsPanel />
      </ErrorCatcher>
    </FormModal>
  );
}
