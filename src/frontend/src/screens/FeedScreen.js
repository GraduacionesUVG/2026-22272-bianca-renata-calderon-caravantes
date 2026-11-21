import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import reportService from '../services/reportService';
import { validatePostContent } from '../services/contentValidation';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

// Mismos límites que el backend: las preguntas son el espacio de texto
// libre; el resto son descripciones cortas.
// Publicaciones que se piden por página; el servidor acepta hasta 50.
const FEED_PAGE_SIZE = 20;

const POST_TYPES = [
  { value: 'general', label: 'General', maxLength: 150 },
  { value: 'training', label: 'Entrenamiento', maxLength: 280 },
  { value: 'question', label: 'Pregunta', maxLength: 500 },
];

// Solo el autor recibe sus publicaciones ocultas; el resto no las ve.
const MODERATION_NOTICES = {
  under_review: 'En revisión: oculta para los demás por reportes.',
  removed: 'Retirada por un moderador: solo tú puedes verla.',
};

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('general');
  const maxContentLength =
    POST_TYPES.find((type) => type.value === postType).maxLength;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Estados para el modal de reportes
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [reportType, setReportType] = useState('inappropriate_content');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  // Estados para comentarios
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);

  // Confirmación dentro de la app (los diálogos nativos no son fiables en web).
  const [confirmingPostId, setConfirmingPostId] = useState(null);
  const [confirmingCommentId, setConfirmingCommentId] = useState(null);
  const [commentContent, setCommentContent] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    loadFeed();
    loadCurrentUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFeed(false);
    }, [])
  );

  const loadFeed = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await api.get('/posts', {
        params: { limit: FEED_PAGE_SIZE },
      });
      setPosts(response.data ?? []);
      setNextCursor(response.headers?.['x-next-cursor'] ?? null);
    } catch (error) {
      console.error('Error cargando feed:', error);
      alert('No fue posible cargar el feed.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // Pide la página siguiente del feed y la agrega al final, sin repetir
  // publicaciones que ya se muestran.
  const loadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);

      const response = await api.get('/posts', {
        params: { limit: FEED_PAGE_SIZE, cursor: nextCursor },
      });

      setPosts((currentPosts) => {
        const shown = new Set(currentPosts.map((post) => post.id));
        const fresh = (response.data ?? []).filter(
          (post) => !shown.has(post.id)
        );
        return [...currentPosts, ...fresh];
      });
      setNextCursor(response.headers?.['x-next-cursor'] ?? null);
    } catch (error) {
      console.error('Error cargando más publicaciones:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceToEnd =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);

    if (distanceToEnd < 400) {
      loadMore();
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/users/profile');
      setCurrentUserId(response.data.id);
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadFeed(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleLike = async (post) => {
    const wasLiked = post.liked_by_me;
    const previousCount = post.like_count ?? 0;

    // Actualización inmediata en pantalla
    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        currentPost.id === post.id
          ? {
              ...currentPost,
              liked_by_me: !wasLiked,
              like_count: wasLiked
                ? Math.max(0, previousCount - 1)
                : previousCount + 1,
            }
          : currentPost
      )
    );

    try {
      if (wasLiked) {
        await api.delete(`/posts/${post.id}/likes`);
      } else {
        await api.post(`/posts/${post.id}/likes`);
      }
      await loadFeed(false);
    } catch (error) {
      console.error('Error actualizando like:', error);

      // Si falla el backend, regresamos al estado anterior.
      setPosts((currentPosts) =>
        currentPosts.map((currentPost) =>
          currentPost.id === post.id
            ? {
                ...currentPost,
                liked_by_me: wasLiked,
                like_count: previousCount,
              }
            : currentPost
        )
      );

      Alert.alert(
        'Error',
        'No fue posible actualizar el like.'
      );
    }
  };

  const handlePublish = async () => {
    const cleanContent = content.trim();

    if (!cleanContent) {
      alert('Escribe algo antes de publicar.');
      return;
    }

    if (cleanContent.length > maxContentLength) {
      alert(
        `Este tipo de publicación no puede exceder ${maxContentLength} caracteres.`
      );
      return;
    }

    // Validar contenido localmente
    const validation = validatePostContent(cleanContent);
    if (!validation.isValid) {
      alert(validation.message);
      return;
    }

    try {
      setPublishing(true);

      await api.post('/posts', {
        content: cleanContent,
        post_type: postType,
      });

      setContent('');
      setPostType('general');

      await loadFeed(false);
    } catch (error) {
      console.error('Error creando publicación:', error);

      const message =
        error.response?.data?.error ||
        'No fue posible crear la publicación.';

      alert(message);
    } finally {
      setPublishing(false);
    }
  };

  const handleOpenReportModal = (post) => {
    setSelectedPost(post);
    setReportType('inappropriate_content');
    setReportDescription('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    const cleanDescription = reportDescription.trim();

    if (!cleanDescription) {
      alert('Por favor, describe el motivo del reporte.');
      return;
    }

    if (cleanDescription.length > 500) {
      alert('La descripción no puede exceder 500 caracteres.');
      return;
    }

    try {
      setSubmittingReport(true);

      await reportService.createReport(
        selectedPost.id,
        reportType,
        cleanDescription
      );

      alert('Gracias por reportar. Nuestro equipo revisará tu reporte.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (error) {
      console.error('Error creando reporte:', error);

      const message =
        error.response?.data?.error ||
        'No fue posible enviar el reporte.';

      alert(message);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleOpenComments = async (post) => {
  try {
    setCommentsPost(post);
    setComments([]);
    setCommentContent('');
    setShowCommentsModal(true);
    setLoadingComments(true);

    const response = await api.get(`/posts/${post.id}/comments`);

    setComments(response.data ?? []);
  } catch (error) {
    console.error('Error cargando comentarios:', error);
    Alert.alert('Error', 'No fue posible cargar los comentarios.');
  } finally {
    setLoadingComments(false);
  }
};

const handleCloseComments = () => {
  if (sendingComment) return;

  setShowCommentsModal(false);
  setCommentsPost(null);
  setComments([]);
  setConfirmingCommentId(null);
  setCommentContent('');
};

// El perfil se abre en el Stack, detrás del modal; lo cerramos primero.
const handleOpenCommentAuthor = (userId) => {
  if (sendingComment) return;

  handleCloseComments();
  navigation.navigate('PublicProfile', { userId });
};

const handleSendComment = async () => {
  const cleanContent = commentContent.trim();

  if (!cleanContent) {
    Alert.alert('Comentario vacío', 'Escribe algo antes de comentar.');
    return;
  }

  if (cleanContent.length > 500) {
    Alert.alert(
      'Comentario demasiado largo',
      'El comentario no puede exceder 500 caracteres.'
    );
    return;
  }

  const validation = validatePostContent(cleanContent);
  if (!validation.isValid) {
    Alert.alert('Comentario no permitido', validation.message);
    return;
  }

  if (!commentsPost) return;

  try {
    setSendingComment(true);

    await api.post(
      `/posts/${commentsPost.id}/comments`,
      {
        content: cleanContent,
      }
    );

    setCommentContent('');

    // Volvemos a pedir los comentarios para obtener también
    // username y full_name del comentario recién creado.
    const response = await api.get(
      `/posts/${commentsPost.id}/comments`
    );

    setComments(response.data ?? []);

    // Actualizamos el contador inmediatamente en el feed.
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === commentsPost.id
          ? {
              ...post,
              comment_count: (post.comment_count ?? 0) + 1,
            }
          : post
      )
    );
  } catch (error) {
    console.error('Error creando comentario:', error);

    const message =
      error.response?.data?.error ||
      'No fue posible publicar el comentario.';

    Alert.alert('Error', message);
  } finally {
    setSendingComment(false);
  }
};

  const handleDeleteComment = async (comment) => {
    try {
      await api.delete(
        `/posts/${comment.post_id}/comments/${comment.id}`
      );

      setComments((currentComments) =>
        currentComments.filter(
          (currentComment) => currentComment.id !== comment.id
        )
      );

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === comment.post_id
            ? {
                ...post,
                comment_count: Math.max(
                  0,
                  (post.comment_count ?? 0) - 1
                ),
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error eliminando comentario:', error);

      alert(
        error.response?.data?.error ||
          'No fue posible eliminar el comentario.'
      );
    } finally {
      setConfirmingCommentId(null);
    }
  };

  const handleDeletePost = async (post) => {
    try {
      await api.delete(`/posts/${post.id}`);

      setPosts((currentPosts) =>
        currentPosts.filter(
          (currentPost) => currentPost.id !== post.id
        )
      );
    } catch (error) {
      console.error('Error eliminando publicación:', error);

      alert(
        error.response?.data?.error ||
          'No fue posible eliminar la publicación.'
      );
    } finally {
      setConfirmingPostId(null);
    }
  };

  const getPostTypeLabel = (type) => {
    switch (type) {
      case 'training':
        return 'Entrenamiento';
      case 'question':
        return 'Pregunta';
      case 'achievement':
        return 'Logro';
      default:
        return 'General';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />

        <Text style={styles.loadingText}>
          Cargando comunidad...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      onScroll={handleScroll}
      scrollEventThrottle={200}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          Comunidad
        </Text>

        <Text style={styles.subtitle}>
          Comparte tu progreso y conecta con otros usuarios.
        </Text>

        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('UserSearch')}
        >
          <Ionicons
            name="search"
            size={16}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Buscar usuarios por nombre o @usuario
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.createCard}>
        <Text style={styles.createTitle}>
          Crear publicación
        </Text>

        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          multiline
          placeholder="¿Qué quieres compartir?"
          placeholderTextColor={colors.textMuted}
          maxLength={maxContentLength}
        />
        <Text style={styles.charCount}>
          {content.length}/{maxContentLength}
        </Text>

        <View style={styles.typeContainer}>
          {POST_TYPES.map((type) => {
            const selected = postType === type.value;

            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  selected && styles.typeButtonSelected,
                ]}
                onPress={() => setPostType(type.value)}
              >
                <Text
                  style={[
                    styles.typeText,
                    selected && styles.typeTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.publishButton,
            publishing && styles.disabledButton,
          ]}
          onPress={handlePublish}
          disabled={publishing}
        >
          <Text style={styles.publishText}>
            {publishing ? 'Publicando...' : 'Publicar'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        Publicaciones recientes
      </Text>

      {posts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Todavía no hay publicaciones.
          </Text>
        </View>
      ) : (
        posts.map((post) => (
          <View
            key={post.id}
            style={styles.postCard}
          >
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={styles.authorButton}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('PublicProfile', {
                    userId: post.user_id,
                  })
                }
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {post.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>

                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>
                    {post.full_name || post.username}
                  </Text>

                  <Text style={styles.username}>
                    @{post.username}
                  </Text>
                </View>
              </TouchableOpacity>

              {post.user_id === currentUserId ? (
                confirmingPostId === post.id ? (
                  <View style={styles.confirmRow}>
                    <TouchableOpacity
                      style={styles.confirmCancelButton}
                      onPress={() => setConfirmingPostId(null)}
                    >
                      <Text style={styles.confirmCancelText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmDeleteButton}
                      onPress={() => handleDeletePost(post)}
                      accessibilityLabel="Confirmar eliminar publicación"
                    >
                      <Text style={styles.confirmDeleteText}>Sí, eliminar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deletePostButton}
                    onPress={() => setConfirmingPostId(post.id)}
                    accessibilityLabel="Eliminar publicación"
                  >
                    <Text style={styles.deletePostText}>Eliminar</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => handleOpenReportModal(post)}
                  accessibilityLabel="Reportar publicación"
                >
                  <Ionicons
                    name="flag-outline"
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              )}

              <Text style={styles.postType}>
                {getPostTypeLabel(post.post_type)}
              </Text>
            </View>

            {MODERATION_NOTICES[post.moderation_status] && (
              <View style={styles.underReviewNotice}>
                <Ionicons
                  name="eye-off-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.underReviewText}>
                  {MODERATION_NOTICES[post.moderation_status]}
                </Text>
              </View>
            )}

            <Text style={styles.postContent}>
              {post.content}
            </Text>

            <View style={styles.postFooter}>
              <Text style={styles.postDate}>
                {formatDate(post.created_at)}
              </Text>

              <View style={styles.interactions}>
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={() => handleToggleLike(post)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={post.liked_by_me ? 'heart' : 'heart-outline'}
                    size={19}
                    color={post.liked_by_me ? colors.red : colors.textMuted}
                    style={styles.likeIcon}
                  />

                  <Text
                    style={[
                      styles.likeCount,
                      post.liked_by_me && styles.likeCountActive,
                    ]}
                  >
                    {post.like_count ?? 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => handleOpenComments(post)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={17}
                    color={colors.textMuted}
                    style={styles.commentIcon}
                  />

                  <Text style={styles.commentCount}>
                    {post.comment_count ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      {loadingMore && <ActivityIndicator style={{ marginVertical: 16 }} />}

      {/* Modal de Reporte */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Publicación</Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                disabled={submittingReport}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Tipo de Reporte</Text>
              {reportService.REPORT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.reportTypeOption,
                    reportType === type.value && styles.reportTypeOptionSelected,
                  ]}
                  onPress={() => setReportType(type.value)}
                  disabled={submittingReport}
                >
                  <Text
                    style={[
                      styles.reportTypeText,
                      reportType === type.value && styles.reportTypeTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.modalLabel, { marginTop: spacing.lg }]}>
                Descripción
              </Text>
              <TextInput
                style={styles.reportDescriptionInput}
                placeholder="Explica brevemente por qué reportas esta publicación..."
                placeholderTextColor={colors.textMuted}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                maxLength={500}
                editable={!submittingReport}
              />
              <Text style={styles.charCount}>
                {reportDescription.length}/500
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReportModal(false)}
                disabled={submittingReport}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submittingReport && styles.disabledButton,
                ]}
                onPress={handleSubmitReport}
                disabled={submittingReport}
              >
                <Text style={styles.submitButtonText}>
                  {submittingReport ? 'Enviando...' : 'Enviar Reporte'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Comentarios */}
      <Modal
        visible={showCommentsModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseComments}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentsModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Comentarios
                </Text>

                {commentsPost && (
                  <Text style={styles.commentsSubtitle}>
                    @{commentsPost.username}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleCloseComments}
                disabled={sendingComment}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
            >
              {loadingComments ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator />

                  <Text style={styles.commentsLoadingText}>
                    Cargando comentarios...
                  </Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsTitle}>
                    Todavía no hay comentarios
                  </Text>

                  <Text style={styles.noCommentsText}>
                    Sé la primera persona en comentar.
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={styles.commentItem}
                  >
                    <TouchableOpacity
                      style={styles.commentAvatar}
                      onPress={() => handleOpenCommentAuthor(comment.user_id)}
                      accessibilityLabel={`Ver perfil de ${comment.username}`}
                    >
                      <Text style={styles.commentAvatarText}>
                        {comment.full_name?.charAt(0)?.toUpperCase() ??
                          comment.username?.charAt(0)?.toUpperCase() ??
                          '?'}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.commentInfo}>
                      <TouchableOpacity
                        style={styles.commentAuthorRow}
                        onPress={() => handleOpenCommentAuthor(comment.user_id)}
                      >
                        <Text style={styles.commentAuthor}>
                          {comment.full_name || comment.username}
                        </Text>

                        <Text style={styles.commentUsername}>
                          @{comment.username}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.commentText}>
                        {comment.content}
                      </Text>

                      <Text style={styles.commentDate}>
                        {formatDate(comment.created_at)}
                      </Text>

                      {comment.user_id === currentUserId &&
                        (confirmingCommentId === comment.id ? (
                          <View style={[styles.confirmRow, styles.commentConfirmRow]}>
                            <TouchableOpacity
                              style={styles.confirmCancelButton}
                              onPress={() => setConfirmingCommentId(null)}
                            >
                              <Text style={styles.confirmCancelText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.confirmDeleteButton}
                              onPress={() => handleDeleteComment(comment)}
                              accessibilityLabel="Confirmar eliminar comentario"
                            >
                              <Text style={styles.confirmDeleteText}>Sí, eliminar</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => setConfirmingCommentId(comment.id)}
                            style={styles.deleteCommentButton}
                          >
                            <Text style={styles.deleteCommentText}>
                              Eliminar
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                value={commentContent}
                onChangeText={setCommentContent}
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
                editable={!sendingComment}
              />

              <TouchableOpacity
                style={[
                  styles.sendCommentButton,
                  (!commentContent.trim() || sendingComment) &&
                    styles.disabledButton,
                ]}
                onPress={handleSendComment}
                disabled={!commentContent.trim() || sendingComment}
              >
                <Text style={styles.sendCommentText}>
                  {sendingComment ? '...' : 'Enviar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
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
    marginBottom: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  searchIcon: {
    marginRight: spacing.sm,
  },

  searchPlaceholder: {
    color: colors.textMuted,
    fontSize: 13,
  },

  createCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  createTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: spacing.md,
  },

  contentInput: {
    minHeight: 100,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },

  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },

  typeButton: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },

  typeButtonSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  typeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  typeTextSelected: {
    color: colors.accent,
  },

  publishButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  publishText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: 'center',
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  postCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  authorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  avatarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },

  authorInfo: {
    flex: 1,
  },

  authorName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  username: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  postType: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  postContent: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  postDate: {
    color: colors.textMuted,
    fontSize: 11,
  },

  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  likeIcon: {
    marginRight: 5,
  },

  likeCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  likeCountActive: {
    color: colors.red,
  },

  reportButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },

  deletePostButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.red,
    borderRadius: radius.sm,
  },

  deletePostText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },

  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },

  commentConfirmRow: {
    marginTop: spacing.xs,
    marginRight: 0,
  },

  confirmCancelButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },

  confirmCancelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  confirmDeleteButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.red,
  },

  confirmDeleteText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },

  // Estilos para el modal de reportes
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingTop: spacing.lg,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  modalLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  reportTypeOption: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  reportTypeOptionSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  reportTypeText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  reportTypeTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },

  reportDescriptionInput: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },

  underReviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },

  underReviewText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  charCount: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginBottom: spacing.md,
  },

  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: spacing.md,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  submitButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  submitButtonText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '700',
  },

  // Estilos para likes + comentarios
  interactions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.xs,
  },

  commentIcon: {
    marginRight: 5,
  },

  commentCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  // Estilos para el modal de comentarios
  commentsModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    height: '75%',
    paddingTop: spacing.lg,
  },

  commentsSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  commentsList: {
    flex: 1,
  },

  commentsListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },

  commentsLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },

  commentsLoadingText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.md,
  },

  noComments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },

  noCommentsTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  noCommentsText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  commentItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },

  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  commentAvatarText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  commentInfo: {
    flex: 1,
  },

  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginRight: spacing.xs,
  },

  commentUsername: {
    color: colors.textMuted,
    fontSize: 12,
  },

  commentText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  commentDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  deleteCommentButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 3,
  },

  deleteCommentText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },

  commentComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },

  commentInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },

  sendCommentButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
  },

  sendCommentText: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '700',
  },
}));
