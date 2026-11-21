import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import WorkoutCard from '../components/WorkoutCard';

const formatWorkoutDate = (value) => {
  const date = new Date(value);

  return `${date.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })} · ${date.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');
  const [workouts, setWorkouts] = useState([]);
  const [workoutsError, setWorkoutsError] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/users/${userId}`);
      setProfile(response.data);

      loadWorkouts();
    } catch (err) {
      console.error('Error cargando perfil público:', err);

      setError(
        err.response?.data?.error ||
          'No fue posible cargar este perfil.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Los entrenamientos se cargan aparte: si fallan, el perfil se sigue viendo.
  // El backend solo devuelve los públicos, salvo en el perfil propio.
  const loadWorkouts = async () => {
    try {
      setWorkoutsError('');

      const response = await api.get(`/users/${userId}/workouts`);
      setWorkouts(response.data?.workouts ?? []);
    } catch (err) {
      console.error('Error cargando entrenamientos del perfil:', err);
      setWorkoutsError('No fue posible cargar los entrenamientos.');
    }
  };

  // Recargamos al volver de las listas, por si seguimos/dejamos de seguir ahí.
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleFollow = async () => {
    if (!profile || profile.is_me || followLoading) {
      return;
    }

    try {
      setFollowLoading(true);

      const response = profile.is_following
        ? await api.delete(`/users/${userId}/follow`)
        : await api.post(`/users/${userId}/follow`);

      setProfile(response.data.profile);
    } catch (err) {
      console.error('Error actualizando seguimiento:', err);

      Alert.alert(
        'No fue posible actualizar',
        err.response?.data?.error || 'Intenta nuevamente.'
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowList = (type) => {
    navigation.push('FollowList', {
      userId,
      type,
      username: profile.username,
    });
  };

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error || 'No fue posible cargar este perfil.'}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadProfile}
        >
          <Text style={styles.retryText}>Intentar de nuevo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initial =
    profile.full_name?.charAt(0)?.toUpperCase() ||
    profile.username?.charAt(0)?.toUpperCase() ||
    '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>‹ Volver</Text>
      </TouchableOpacity>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <Text style={styles.fullName}>
          {profile.full_name || profile.username}
        </Text>

        <Text style={styles.username}>@{profile.username}</Text>

        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.level}</Text>
            <Text style={styles.statLabel}>Nivel</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {profile.xp.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.streak}</Text>
            <Text style={styles.statLabel}>Semanas de racha</Text>
          </View>
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialStat}
            onPress={() => openFollowList('followers')}
          >
            <Text style={styles.socialValue}>
              {profile.followers_count}
            </Text>
            <Text style={styles.socialLabel}>Seguidores</Text>
          </TouchableOpacity>

          <View style={styles.socialDivider} />

          <TouchableOpacity
            style={styles.socialStat}
            onPress={() => openFollowList('following')}
          >
            <Text style={styles.socialValue}>
              {profile.following_count}
            </Text>
            <Text style={styles.socialLabel}>Siguiendo</Text>
          </TouchableOpacity>
        </View>

        {profile.is_me ? (
          <View style={styles.ownProfilePill}>
            <Text style={styles.ownProfileText}>Este es tu perfil</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.followButton,
              profile.is_following && styles.followingButton,
            ]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={profile.is_following ? colors.blue : colors.onAccent}
              />
            ) : (
              <Text
                style={[
                  styles.followText,
                  profile.is_following && styles.followingText,
                ]}
              >
                {profile.is_following ? 'Siguiendo' : 'Seguir'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>Entrenamientos</Text>

      {workoutsError ? (
        <Text style={styles.emptyWorkouts}>{workoutsError}</Text>
      ) : workouts.length === 0 ? (
        <Text style={styles.emptyWorkouts}>
          {profile.is_me
            ? 'Aún no registras entrenamientos.'
            : 'Todavía no ha compartido entrenamientos públicos.'}
        </Text>
      ) : (
        workouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            dateLabel={formatWorkoutDate(workout.workout_date)}
            showVisibility={profile.is_me}
            onPress={() =>
              navigation.push('WorkoutDetail', { workoutId: workout.id })
            }
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },

  errorText: {
    color: colors.text,
    textAlign: 'center',
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

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },

  backText: {
    color: colors.blue,
    fontWeight: '700',
    fontSize: 14,
  },

  profileCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  avatarText: {
    color: colors.blue,
    fontSize: 30,
    fontWeight: '700',
  },

  fullName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  username: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 13,
  },

  bio: {
    marginTop: spacing.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  statsRow: {
    width: '100%',
    marginTop: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    color: colors.xp,
    fontSize: 18,
    fontWeight: '700',
  },

  statLabel: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  socialRow: {
    width: '100%',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  socialStat: {
    flex: 1,
    alignItems: 'center',
  },

  socialValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  socialLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },

  socialDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },

  followButton: {
    width: '100%',
    minHeight: 46,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  followingButton: {
    backgroundColor: colors.blueSoft,
    borderWidth: 1,
    borderColor: colors.blue,
  },

  followText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  followingText: {
    color: colors.blue,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  emptyWorkouts: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },

  ownProfilePill: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blueSoft,
  },

  ownProfileText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
  },
}));
