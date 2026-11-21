import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Switch,
  ScrollView
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';

import api, { clearSession } from '../services/api';
import { colors, radius, spacing, themedStyles, useTheme } from '../constants/theme';
import IconLabel from '../components/IconLabel';

export default function ProfileScreen({ onLogout, navigation }) {
  const { preference, setPreference } = useTheme();
  const [profile, setProfile] = useState(null);
  // Ajustes: peso (para estimar calorías) y celebraciones.
  const [weightInput, setWeightInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  // El peso se muestra como texto con un botón Editar; el campo solo aparece al editar.
  const [editingWeight, setEditingWeight] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [followCounts, setFollowCounts] = useState(null);
  const [weeklyGoal, setWeeklyGoal] = useState(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);

      const [profileResponse, achievementsResponse] =
        await Promise.all([
          api.get('/users/profile'),
          api.get('/users/achievements'),
        ]);

      const user = profileResponse.data;

      setProfile(user);
      setWeightInput(user.weight_kg != null ? String(user.weight_kg) : '');
      setAchievements(achievementsResponse.data ?? []);

      setUsername(user.username ?? '');
      setFullName(user.full_name ?? '');
      setBio(user.bio ?? '');

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(user)
      );

      loadFollowCounts(user.id);
      loadWeeklyGoal();
    } catch (error) {
      console.error('Error cargando perfil:', error);

      // El interceptor de api.js ya cerró la sesión y avisó al usuario.
      if (error.response?.status === 401) {
        return;
      }

      alert('No fue posible cargar tu perfil.');
    } finally {
      setLoading(false);
    }
  };

  // El backend guarda un nombre genérico de icono; lo traducimos a Ionicons.
  const getAchievementIcon = (icon) => {
    switch (icon) {
      case 'trophy':
        return 'trophy-outline';
      case 'dumbbell':
        return 'barbell-outline';
      case 'flame':
      case 'fire':
        return 'flame-outline';
      case 'star':
        return 'star-outline';
      case 'level-up':
        return 'trending-up';
      default:
        return 'ribbon-outline';
    }
  };

  const handleSave = async () => {
    if (username.trim().length < 3) {
      alert('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (!fullName.trim()) {
      alert('El nombre completo es obligatorio.');
      return;
    }

    try {
      setSaving(true);

      const response = await api.put('/users/profile', {
        username: username.trim(),
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        profile_picture: profile?.profile_picture ?? null,
      });

      const updatedUser = response.data.user;

      setProfile(updatedUser);
      setIsEditing(false);

      await AsyncStorage.setItem(
        'user',
        JSON.stringify(updatedUser)
      );

      alert('Perfil actualizado correctamente.');
    } catch (error) {
      console.error('Error actualizando perfil:', error);

      const message =
        error.response?.data?.error ||
        'No fue posible actualizar el perfil.';

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setUsername(profile?.username ?? '');
    setFullName(profile?.full_name ?? '');
    setBio(profile?.bio ?? '');
    setIsEditing(false);
  };

  // Los contadores vienen del perfil público; si fallan, el resto del
  // perfil sigue funcionando.
  const loadFollowCounts = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);

      setFollowCounts({
        followers: response.data.followers_count,
        following: response.data.following_count,
      });
    } catch (error) {
      console.error('Error cargando seguidores:', error);
    }
  };

  const loadWeeklyGoal = async () => {
    try {
      const response = await api.get('/users/streak');
      setWeeklyGoal(response.data.weekly_goal);
    } catch (error) {
      console.error('Error cargando meta semanal:', error);
    }
  };

  const openFollowList = (type) => {
    if (!profile) {
      return;
    }

    navigation.navigate('FollowList', {
      userId: profile.id,
      type,
      username: profile.username,
    });
  };

  // Guarda solo lo indicado (PATCH /users/settings) y actualiza el perfil.
  const saveSettings = async (changes) => {
    try {
      setSavingSettings(true);

      const response = await api.patch('/users/settings', changes);
      setProfile(response.data);
      setWeightInput(
        response.data.weight_kg != null ? String(response.data.weight_kg) : ''
      );

      return true;
    } catch (error) {
      console.error('Error guardando ajustes:', error);
      alert(
        error.response?.data?.error || 'No fue posible guardar tus ajustes.'
      );
      return false;
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveWeight = async () => {
    const weight = Number(weightInput.replace(',', '.'));

    if (!weightInput.trim() || Number.isNaN(weight)) {
      alert('Escribe tu peso en kilogramos, por ejemplo 62.5');
      return;
    }

    if (await saveSettings({ weight_kg: weight })) {
      setEditingWeight(false);
    }
  };

  const handleCancelWeight = () => {
    setWeightInput(profile?.weight_kg != null ? String(profile.weight_kg) : '');
    setEditingWeight(false);
  };

  // Sin cambios no tiene sentido guardar: el botón se desactiva.
  const weightChanged =
    weightInput.trim() !== '' &&
    Number(weightInput.replace(',', '.')) !== (profile?.weight_kg ?? null);

  const handleLogout = async () => {
    try {
      await clearSession();

      onLogout();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const handleShareAchievement = async (achievementID) => {
    try {
      await api.post(
        `/users/achievements/${achievementID}/share`
      );

      alert('Logro compartido en la comunidad.');
    } catch (error) {
      console.error('Error compartiendo logro:', error);

      const message =
        error.response?.data?.error ||
        'No fue posible compartir el logro.';

      alert(message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>

        <Text style={styles.title}>
          {profile?.full_name}
        </Text>

        <Text style={styles.email}>
          {profile?.email}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formHeader}>
          <Text style={styles.sectionTitle}>
            Mi información
          </Text>

          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
              accessibilityLabel="Editar perfil"
            >
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <>
            <Text style={styles.label}>
              Nombre de usuario
            </Text>

            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>
              Nombre completo
            </Text>

            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>
              Biografía
            </Text>

            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              placeholder="Cuéntanos un poco sobre ti..."
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nombre de usuario</Text>
            <Text style={styles.infoValue}>@{profile?.username}</Text>

            <Text style={styles.infoLabel}>Nombre completo</Text>
            <Text style={styles.infoValue}>{profile?.full_name}</Text>

            <Text style={styles.infoLabel}>Biografía</Text>
            <Text
              style={[
                styles.infoValue,
                !profile?.bio && styles.infoValueEmpty,
              ]}
            >
              {profile?.bio || 'Sin biografía todavía.'}
            </Text>
          </View>
        )}

      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Ajustes</Text>

        <View style={styles.weightHeader}>
          <Text style={[styles.settingsLabel, styles.noMargin]}>
            Peso corporal
          </Text>

          {!editingWeight && (
            <TouchableOpacity
              style={[styles.editButton, styles.noMargin]}
              onPress={() => setEditingWeight(true)}
              accessibilityLabel="Editar peso"
            >
              <Text style={styles.editButtonText}>
                {profile?.weight_kg != null ? 'Editar' : 'Agregar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {editingWeight ? (
          <>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="Ej. 62.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                editable={!savingSettings}
                autoFocus
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>

            <View style={styles.weightActions}>
              <TouchableOpacity
                style={styles.weightCancelButton}
                onPress={handleCancelWeight}
                disabled={savingSettings}
              >
                <Text style={styles.weightCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.weightButton,
                  (savingSettings || !weightChanged) &&
                    styles.weightButtonDisabled,
                ]}
                onPress={handleSaveWeight}
                disabled={savingSettings || !weightChanged}
              >
                <Text style={styles.weightButtonText}>
                  {savingSettings ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text
            style={[
              styles.weightValue,
              profile?.weight_kg == null && styles.infoValueEmpty,
            ]}
          >
            {profile?.weight_kg != null ? `${profile.weight_kg} kg` : 'Sin definir'}
          </Text>
        )}

        <Text style={styles.settingsHint}>
          Se usa solo para estimar las calorías de tus entrenamientos. Nadie más lo ve.
        </Text>

        <Text style={[styles.settingsLabel, { marginTop: spacing.lg }]}>Apariencia</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((option) => {
            const active = preference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.themeOption, active && styles.themeOptionActive]}
                onPress={() => setPreference(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={option.icon}
                  size={15}
                  color={active ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.settingsLabel}>Celebraciones</Text>
            <Text style={styles.settingsHint}>
              Confeti al cumplir tu meta semanal o completar un reto.
            </Text>
          </View>
          <Switch
            value={profile?.celebrations_enabled ?? true}
            onValueChange={(value) =>
              saveSettings({ celebrations_enabled: value })
            }
            disabled={savingSettings || !profile}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFFFFF"
            // En web el pulgar activo usa su propio color (por defecto, verde azulado).
            activeThumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.level ?? 1}
          </Text>
          <Text style={styles.statLabel}>
            Nivel
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.xp ?? 0}
          </Text>
          <Text style={styles.statLabel}>
            XP
          </Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.streak ?? 0}
          </Text>
          <Text style={styles.statLabel}>
            Racha (sem.)
          </Text>
        </View>
      </View>

      <View style={styles.followContainer}>
        <TouchableOpacity
          style={styles.stat}
          onPress={() => openFollowList('followers')}
        >
          <Text style={styles.statValue}>
            {followCounts?.followers ?? '–'}
          </Text>
          <Text style={styles.statLabel}>
            Seguidores
          </Text>
        </TouchableOpacity>

        <View style={styles.followDivider} />

        <TouchableOpacity
          style={styles.stat}
          onPress={() => openFollowList('following')}
        >
          <Text style={styles.statValue}>
            {followCounts?.following ?? '–'}
          </Text>
          <Text style={styles.statLabel}>
            Siguiendo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.goalCard}
        onPress={() =>
          navigation.navigate('WeeklyGoal', {
            currentGoal: weeklyGoal ?? undefined,
          })
        }
      >
        <View>
          <Text style={styles.goalLabel}>
            Meta semanal
          </Text>
          <Text style={styles.goalValue}>
            {weeklyGoal
              ? `${weeklyGoal} ${weeklyGoal === 1 ? 'día' : 'días'} por semana`
              : 'Sin definir'}
          </Text>
        </View>

        <Text style={styles.goalAction}>
          Cambiar ›
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.goalCard}
        onPress={() =>
          profile && navigation.navigate('PublicProfile', { userId: profile.id })
        }
      >
        <View>
          <Text style={styles.goalLabel}>
            Tu perfil en la comunidad
          </Text>
          <Text style={styles.goalValue}>
            Entrenamientos públicos y seguidores
          </Text>
        </View>

        <Text style={styles.goalAction}>
          Ver ›
        </Text>
      </TouchableOpacity>

      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitle}>
          Mis logros
        </Text>

        {achievements.length === 0 ? (
          <View style={styles.emptyAchievements}>
            <Text style={styles.emptyAchievementsText}>
              Aún no has desbloqueado logros.
            </Text>
          </View>
        ) : (
          achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={styles.achievementCard}
            >
              <View style={styles.achievementIcon}>
                <Ionicons
                  name={getAchievementIcon(achievement.icon)}
                  size={20}
                  color={colors.accent}
                />
              </View>

              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>
                  {achievement.title}
                </Text>

                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>

                <TouchableOpacity
                  style={styles.shareAchievementButton}
                  onPress={() =>
                    handleShareAchievement(achievement.id)
                  }
                >
                  <Text style={styles.shareAchievementText}>
                    Compartir logro
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.achievementXP}>
                +{achievement.xp_reward} XP
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.logoutSection}>
        {profile?.role === 'admin' && (
          <TouchableOpacity
            style={styles.moderationButton}
            onPress={() => navigation.navigate('Moderation')}
          >
            <IconLabel
              icon="shield-checkmark-outline"
              color={colors.text}
              textStyle={styles.moderationText}
            >
              Moderación
            </IconLabel>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            Cerrar sesión
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const THEME_OPTIONS = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { value: 'midnight', label: 'Medianoche', icon: 'planet-outline' },
  { value: 'forest', label: 'Bosque', icon: 'leaf-outline' },
  { value: 'wine', label: 'Vino', icon: 'wine-outline' },
];

const styles = themedStyles(() => ({
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  themeOption: {
    flexGrow: 1,
    flexBasis: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },
  themeOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  themeOptionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  themeOptionTextActive: {
    color: colors.accent,
  },

  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  avatarText: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '700',
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  email: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  followContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
  },

  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
  },

  goalLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },

  goalValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 2,
  },

  goalAction: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },

  followDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: colors.border,
  },

  statValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  achievementsSection: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  achievementIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  achievementInfo: {
    flex: 1,
  },

  achievementTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  achievementDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  shareAchievementButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  shareAchievementText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  achievementXP: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },

  emptyAchievements: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },

  emptyAchievementsText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  form: {
    width: '100%',
    marginBottom: spacing.lg,
  },

  settingsCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  settingsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  settingsLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  settingsHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },

  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  noMargin: {
    marginBottom: 0,
  },

  weightValue: {
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.xs,
  },

  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  weightUnit: {
    color: colors.textMuted,
    fontSize: 13,
  },

  weightActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  weightCancelButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },

  weightCancelText: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  weightInput: {
    flex: 1,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },

  weightButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weightButtonDisabled: {
    opacity: 0.4,
  },

  weightButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  switchText: {
    flex: 1,
  },

  logoutSection: {
    width: '100%',
    marginTop: spacing.md,
  },

  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  editButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },

  editButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },

  infoValue: {
    color: colors.text,
    fontSize: 13,
    marginBottom: spacing.md,
  },

  infoValueEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  cancelButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  cancelText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },

  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },

  bioInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },

  moderationButton: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  moderationText: {
    fontWeight: '600',
    fontSize: 13,
  },

  logoutButton: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  logoutText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
}));