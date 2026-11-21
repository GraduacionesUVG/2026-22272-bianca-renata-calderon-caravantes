package services

import (
	"log"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

const notificationsLimit = 50

// NotificationService crea las notificaciones de likes, comentarios y
// seguidores. Los métodos Notify*/Remove* nunca devuelven error: si falla la
// notificación, el like o el comentario ya se guardó y no debe fallar por eso;
// solo lo registramos en el log.
type NotificationService struct {
	notificationRepository *repository.NotificationRepository
}

func NewNotificationService(
	notificationRepository *repository.NotificationRepository,
) *NotificationService {
	return &NotificationService{
		notificationRepository: notificationRepository,
	}
}

func logNotificationError(action string, err error) {
	if err != nil {
		log.Printf("error en notificación (%s): %v", action, err)
	}
}

func (s *NotificationService) NotifyLike(postID, actorID string) {
	logNotificationError("like", s.notificationRepository.CreateLike(postID, actorID))
}

func (s *NotificationService) RemoveLike(postID, actorID string) {
	logNotificationError("quitar like", s.notificationRepository.DeleteLike(postID, actorID))
}

func (s *NotificationService) NotifyComment(postID, commentID, actorID string) {
	logNotificationError(
		"comentario",
		s.notificationRepository.CreateComment(postID, commentID, actorID),
	)
}

func (s *NotificationService) NotifyFollow(followedID, followerID string) {
	logNotificationError("seguir", s.notificationRepository.CreateFollow(followedID, followerID))
}

func (s *NotificationService) RemoveFollow(followedID, followerID string) {
	logNotificationError(
		"dejar de seguir",
		s.notificationRepository.DeleteFollow(followedID, followerID),
	)
}

func (s *NotificationService) GetNotifications(userID string) ([]models.Notification, error) {
	return s.notificationRepository.FindByUserID(userID, notificationsLimit)
}

func (s *NotificationService) CountUnread(userID string) (int, error) {
	return s.notificationRepository.CountUnread(userID)
}

func (s *NotificationService) MarkAllRead(userID string) error {
	return s.notificationRepository.MarkAllRead(userID)
}
