import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const ICONS = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
};

const describe = (notification) => {
  switch (notification.type) {
    case 'like':
      return 'le dio like a tu publicación';
    case 'comment':
      return 'comentó tu publicación';
    case 'follow':
      return 'empezó a seguirte';
    default:
      return '';
  }
};

const timeAgo = (value) => {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} d`;

  return new Date(value).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Mostramos las no leídas resaltadas y después las marcamos como leídas,
  // así el contador de Home queda en cero al volver.
  const loadNotifications = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/notifications');
      const items = response.data?.notifications ?? [];
      setNotifications(items);

      if (items.some((item) => !item.is_read)) {
        api.post('/notifications/read-all').catch((err) =>
          console.error('Error marcando notificaciones como leídas:', err)
        );
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setError('No fue posible cargar tus notificaciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const openActor = (notification) => {
    navigation.navigate('PublicProfile', { userId: notification.actor.id });
  };

  // No hay pantalla de detalle de publicación: likes y comentarios llevan a
  // la comunidad, donde está la publicación.
  const openNotification = (notification) => {
    if (notification.type === 'follow') {
      openActor(notification);
      return;
    }

    navigation.navigate('Main', { screen: 'Social' });
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

        <Text style={styles.title}>Notificaciones</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
            />
          }
        >
          {error ? (
            <Text style={styles.emptyText}>{error}</Text>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="notifications-outline"
                size={30}
                color={colors.textMuted}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Todavía no tienes notificaciones</Text>
              <Text style={styles.emptyText}>
                Aquí verás los likes, comentarios y nuevos seguidores.
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.item,
                  !notification.is_read && styles.itemUnread,
                ]}
                activeOpacity={0.8}
                onPress={() => openNotification(notification)}
              >
                <TouchableOpacity
                  style={styles.avatar}
                  onPress={() => openActor(notification)}
                  accessibilityLabel={`Ver perfil de ${notification.actor.username}`}
                >
                  <Text style={styles.avatarText}>
                    {(notification.actor.full_name || notification.actor.username)
                      ?.charAt(0)
                      ?.toUpperCase() ?? '?'}
                  </Text>
                  {ICONS[notification.type] ? (
                    <View style={styles.typeBadge}>
                      <Ionicons
                        name={ICONS[notification.type]}
                        size={10}
                        color={colors.blue}
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>

                <View style={styles.body}>
                  <Text style={styles.text}>
                    <Text style={styles.actor}>
                      {notification.actor.full_name || notification.actor.username}
                    </Text>{' '}
                    {describe(notification)}
                  </Text>

                  {notification.comment_preview ? (
                    <Text style={styles.preview} numberOfLines={2}>
                      “{notification.comment_preview}”
                    </Text>
                  ) : notification.post_preview ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      {notification.post_preview}
                    </Text>
                  ) : null}

                  <Text style={styles.time}>{timeAgo(notification.created_at)}</Text>
                </View>

                {!notification.is_read && <View style={styles.unreadDot} />}
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

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  itemUnread: {
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  avatarText: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: '700',
  },

  // Pequeño icono del tipo, en la esquina del avatar.
  typeBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.card2,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
  },

  text: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },

  actor: {
    fontWeight: '700',
  },

  preview: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  time: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blue,
    marginTop: 6,
    marginLeft: spacing.sm,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },

  emptyIcon: {
    marginBottom: spacing.sm,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
}));
