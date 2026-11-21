package services

import (
	"errors"
	"strings"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

type CommentService struct {
	commentRepository        *repository.CommentRepository
	postRepository           *repository.PostRepository
	notificationService      *NotificationService
	contentModerationService *ContentModerationService
}

func NewCommentService(
	commentRepository *repository.CommentRepository,
	postRepository *repository.PostRepository,
	notificationService *NotificationService,
) *CommentService {
	return &CommentService{
		commentRepository:        commentRepository,
		postRepository:           postRepository,
		notificationService:      notificationService,
		contentModerationService: NewContentModerationService(),
	}
}

func (s *CommentService) CreateComment(
	postID string,
	userID string,
	content string,
) (*models.Comment, error) {
	content = strings.TrimSpace(content)

	if content == "" {
		return nil, errors.New("el comentario no puede estar vacío")
	}

	if len([]rune(content)) > 500 {
		return nil, errors.New("el comentario no puede exceder 500 caracteres")
	}

	// Validar contenido con servicio de moderación
	isValid, errorMsg := s.contentModerationService.ValidateContent(content)
	if !isValid {
		return nil, errors.New(errorMsg)
	}

	if err := ensurePostVisible(s.postRepository, postID, userID); err != nil {
		return nil, err
	}

	comment, err := s.commentRepository.Create(
		postID,
		userID,
		content,
	)
	if err != nil {
		return nil, err
	}

	s.notificationService.NotifyComment(postID, comment.ID, userID)

	return comment, nil
}

func (s *CommentService) GetComments(
	postID string,
	userID string,
) ([]models.Comment, error) {
	if err := ensurePostVisible(s.postRepository, postID, userID); err != nil {
		return nil, err
	}

	return s.commentRepository.FindByPostID(postID)
}

func (s *CommentService) DeleteComment(
	commentID string,
	userID string,
) error {
	deleted, err := s.commentRepository.Delete(
		commentID,
		userID,
	)

	if err != nil {
		return err
	}

	if !deleted {
		return errors.New(
			"el comentario no existe o no pertenece al usuario",
		)
	}

	return nil
}
