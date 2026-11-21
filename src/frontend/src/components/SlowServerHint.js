import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { colors, spacing, themedStyles } from '../constants/theme';

const SHOW_AFTER_MS = 4000;

// En el hosting gratuito el servidor se duerme tras unos minutos sin uso y
// tarda hasta un minuto en despertar. Si una petición tarda, lo explicamos
// para que nadie piense que la app se colgó.
export default function SlowServerHint({ visible }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSlow(false);
      return undefined;
    }

    const timeout = setTimeout(() => setSlow(true), SHOW_AFTER_MS);

    return () => clearTimeout(timeout);
  }, [visible]);

  if (!slow) {
    return null;
  }

  return (
    <Text style={styles.hint}>
      El servidor se está despertando. La primera vez puede tardar hasta un
      minuto; no cierres la app.
    </Text>
  );
}

const styles = themedStyles(() => ({
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.md,
  },
}));
