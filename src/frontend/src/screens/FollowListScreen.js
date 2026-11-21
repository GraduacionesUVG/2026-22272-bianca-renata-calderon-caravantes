import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const TITLES = {
  followers: 'Seguidores',
  following: 'Siguiendo',
};

const EMPTY_MESSAGES = {
  followers: 'Todavía no tiene seguidores.',
  following: 'Todavía no sigue a nadie.',
};

export default function FollowListScreen({ route, navigation }) {
  const { userId, type, username } = route.params;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/users/${userId}/${type}`);
      setUsers(response.data?.users ?? []);
    } catch (err) {
      console.error('Error cargando lista de seguidores:', err);

      setError(
        err.response?.data?.error ||
          'No fue posible cargar la lista.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>{TITLES[type]}</Text>
          {username ? (
            <Text style={styles.subtitle}>@{username}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.mutedText}>{error}</Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadUsers}
          >
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {users.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.mutedText}>{EMPTY_MESSAGES[type]}</Text>
            </View>
          ) : (
            users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.push('PublicProfile', { userId: user.id })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user.full_name || user.username)
                      ?.charAt(0)
                      ?.toUpperCase() ?? '?'}
                  </Text>
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.full_name || user.username}
                  </Text>
                  <Text style={styles.userMeta}>
                    @{user.username} · Nivel {user.level}
                  </Text>
                </View>

                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  backText: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 34,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  retryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
  },

  retryText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  avatarText: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: '700',
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  userMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    marginLeft: spacing.sm,
  },

  mutedText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
}));
