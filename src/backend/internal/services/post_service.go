package services

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

// maxContentLength limita el texto según el tipo de publicación: las
// preguntas son el espacio de texto libre; el resto, descripciones cortas.
var maxContentLength = map[models.PostType]int{
	models.PostQuestion: 500,
	models.PostTraining: 280,
	models.PostGeneral:  150,
}

// reportThreshold es la cantidad de usuarios distintos que deben reportar
// una publicación para ocultarla del feed hasta que un moderador la revise.
const reportThreshold = 3

var ErrPostNotFound = errors.New("la publicación no existe")

// ensurePostVisible rechaza las publicaciones que no existen o que userID
// no puede ver por moderación, con el mismo error para no revelar cuáles
// están ocultas.
func ensurePostVisible(
	postRepository *repository.PostRepository,
	postID string,
	userID string,
) error {
	visible, err := postRepository.IsVisibleTo(postID, userID, reportThreshold)
	if err != nil {
		return err
	}

	if !visible {
		return ErrPostNotFound
	}

	return nil
}

type PostService struct {
	postRepository           *repository.PostRepository
	contentModerationService *ContentModerationService
}

func NewPostService(
	postRepository *repository.PostRepository,
) *PostService {
	return &PostService{
		postRepository:           postRepository,
		contentModerationService: NewContentModerationService(),
	}
}

func (s *PostService) CreatePost(
	userID string,
	content string,
	postType models.PostType,
) (*models.Post, error) {

	content = strings.TrimSpace(content)

	if content == "" {
		return nil, errors.New(
			"el contenido de la publicación es obligatorio",
		)
	}

	// Los logros se publican automáticamente desde AchievementService.
	maxLength, ok := maxContentLength[postType]
	if !ok {
		return nil, errors.New(
			"tipo de publicación inválido",
		)
	}

	if utf8.RuneCountInString(content) > maxLength {
		return nil, fmt.Errorf(
			"este tipo de publicación no puede exceder %d caracteres",
			maxLength,
		)
	}

	// Validar contenido con servicio de moderación
	isValid, errorMsg := s.contentModerationService.ValidateContent(content)
	if !isValid {
		return nil, errors.New(errorMsg)
	}

	return s.postRepository.Create(
		userID,
		content,
		postType,
	)
}

// Tamaño de página del feed: por omisión y máximo que se acepta.
const (
	DefaultFeedPageSize = 20
	MaxFeedPageSize     = 50
)

var ErrInvalidFeedCursor = errors.New("el cursor del feed no es válido")

// GetFeed devuelve la primera página del feed.
func (s *PostService) GetFeed(ctx context.Context, userID string) ([]models.Post, error) {
	posts, _, err := s.GetFeedPage(ctx, userID, "", DefaultFeedPageSize)
	return posts, err
}

// GetFeedPage devuelve una página del feed y el cursor de la siguiente
// ("" si no hay más). El cursor es opaco para el cliente: codifica la fecha y
// el id de la última publicación entregada, de modo que las publicaciones
// nuevas no repiten ni saltan otras mientras se avanza.
func (s *PostService) GetFeedPage(
	ctx context.Context,
	userID string,
	cursor string,
	limit int,
) ([]models.Post, string, error) {
	if limit <= 0 {
		limit = DefaultFeedPageSize
	}

	if limit > MaxFeedPageSize {
		limit = MaxFeedPageSize
	}

	var before *time.Time
	beforeID := "00000000-0000-0000-0000-000000000000"

	if cursor != "" {
		createdAt, id, err := decodeFeedCursor(cursor)
		if err != nil {
			return nil, "", err
		}

		before = &createdAt
		beforeID = id
	}

	// Se pide una publicación de más para saber si hay otra página.
	posts, err := s.postRepository.FindPage(
		ctx,
		userID,
		reportThreshold,
		before,
		beforeID,
		limit+1,
	)
	if err != nil {
		return nil, "", err
	}

	if len(posts) <= limit {
		return posts, "", nil
	}

	posts = posts[:limit]
	last := posts[len(posts)-1]

	return posts, encodeFeedCursor(last.CreatedAt, last.ID), nil
}

func encodeFeedCursor(createdAt time.Time, id string) string {
	raw := createdAt.UTC().Format(time.RFC3339Nano) + "|" + id
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeFeedCursor(cursor string) (time.Time, string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, "", ErrInvalidFeedCursor
	}

	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, "", ErrInvalidFeedCursor
	}

	createdAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, "", ErrInvalidFeedCursor
	}

	return createdAt, parts[1], nil
}

func (s *PostService) DeletePost(
	postID string,
	userID string,
) error {
	deleted, err := s.postRepository.Delete(
		postID,
		userID,
	)

	if err != nil {
		return err
	}

	if !deleted {
		return errors.New(
			"la publicación no existe o no pertenece al usuario",
		)
	}

	return nil
}
