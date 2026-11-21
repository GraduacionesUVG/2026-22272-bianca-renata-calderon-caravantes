import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from './PressableScale';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

export default function RankingView() {
  // RankingView vive dentro de ChallengesScreen, así que tomamos la
  // navegación del contexto en vez de recibirla por props.
  const navigation = useNavigation();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRanking = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/rankings');

      setRanking(response.data ?? []);
    } catch (err) {
      console.error('Error cargando ranking:', err);

      setError(
        err.response?.data?.error ||
          'No fue posible cargar el ranking.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRanking();
    }, [])
  );

  const myRanking = useMemo(
    () => ranking.find((entry) => entry.is_me),
    [ranking]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.purple}
        />

        <Text style={styles.loadingText}>
          Cargando ranking...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadRanking}
        >
          <Text style={styles.retryButtonText}>
            Intentar de nuevo
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {myRanking ? (
        <View style={styles.myPosition}>
          <View>
            <Text style={styles.myPositionLabel}>
              Tu posición
            </Text>

            <Text style={styles.myPositionDetails}>
              {myRanking.xp.toLocaleString()} XP · Nivel{' '}
              {myRanking.level} · Racha de {myRanking.streak} sem.
            </Text>
          </View>

          <Text style={styles.myPositionNumber}>
            #{myRanking.position}
          </Text>
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>
        Clasificación por XP
      </Text>

      {ranking.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Todavía no hay usuarios en el ranking.
          </Text>
        </View>
      ) : (
        ranking.map((entry) => (
          <TouchableOpacity
            key={entry.user_id}
            style={[
              styles.rankingCard,
              entry.is_me && styles.myCard,
            ]}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('PublicProfile', {
                userId: entry.user_id,
              })
            }
          >
            <View style={styles.positionContainer}>
              <Text
                style={[
                  styles.position,
                  entry.position <= 3 &&
                    styles.podiumPosition,
                ]}
              >
                {entry.position}
              </Text>
            </View>

            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text
                  style={styles.userName}
                  numberOfLines={1}
                >
                  {entry.full_name || entry.username}
                </Text>

                {entry.is_me ? (
                  <Text style={styles.youText}>
                    (tú)
                  </Text>
                ) : null}
              </View>

              <Text style={styles.userMeta}>
                @{entry.username} · Nivel {entry.level} · Racha{' '}
                {entry.streak} sem.
              </Text>
            </View>

            <View style={styles.xpContainer}>
              <Text style={styles.xpValue}>
                {entry.xp.toLocaleString()}
              </Text>

              <Text style={styles.xpLabel}>
                XP
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  centered: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },

  errorCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorText: {
    color: colors.text,
    marginBottom: spacing.md,
  },

  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.purple,
  },

  retryButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  myPosition: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  myPositionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  myPositionNumber: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },

  myPositionDetails: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },

  sectionLabel: {
    marginBottom: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  rankingCard: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  myCard: {
    borderColor: colors.purple,
  },

  positionContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  position: {
    color: colors.textMuted,
    fontSize: 17,
    fontWeight: '700',
  },

  podiumPosition: {
    color: colors.purple,
  },

  userInfo: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  youText: {
    marginLeft: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },

  userMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
  },

  xpContainer: {
    minWidth: 62,
    alignItems: 'flex-end',
  },

  xpValue: {
    color: colors.xp,
    fontSize: 16,
    fontWeight: '700',
  },

  xpLabel: {
    marginTop: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
}));