import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export default function UserSearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Evita que una respuesta lenta de una búsqueda anterior pise la actual.
  const latestRequest = useRef(0);

  const cleanQuery = query.trim();
  const tooShort = cleanQuery.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (tooShort) {
      setUsers([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await api.get('/users/search', {
          params: { q: cleanQuery },
        });

        if (latestRequest.current === requestId) {
          setUsers(response.data?.users ?? []);
          setError('');
        }
      } catch (err) {
        console.error('Error buscando usuarios:', err);

        if (latestRequest.current === requestId) {
          setError(
            err.response?.data?.error ||
              'No fue posible buscar usuarios.'
          );
        }
      } finally {
        if (latestRequest.current === requestId) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [cleanQuery, tooShort]);

  const renderResults = () => {
    if (tooShort) {
      return (
        <Text style={styles.hint}>
          Escribe al menos {MIN_QUERY_LENGTH} letras para buscar por
          usuario o nombre.
        </Text>
      );
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.blue} />
        </View>
      );
    }

    if (error) {
      return <Text style={styles.hint}>{error}</Text>;
    }

    if (users.length === 0) {
      return (
        <Text style={styles.hint}>
          No encontramos usuarios para “{cleanQuery}”.
        </Text>
      );
    }

    return users.map((user) => (
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
    ));
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por usuario o nombre..."
          placeholderTextColor={colors.textMuted}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {renderResults()}
      </ScrollView>
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

  searchInput: {
    flex: 1,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
  },

  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  centered: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  hint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
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
}));
