package services

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

var (
	ErrUserNotFound     = errors.New("usuario no encontrado")
	ErrCannotFollowSelf = errors.New("no puedes seguirte a ti mismo")
)

type FollowService struct {
	followRepository    *repository.FollowRepository
	streakService       *StreakService
	notificationService *NotificationService
}

func NewFollowService(
	followRepository *repository.FollowRepository,
	streakService *StreakService,
	notificationService *NotificationService,
) *FollowService {
	return &FollowService{
		followRepository:    followRepository,
		streakService:       streakService,
		notificationService: notificationService,
	}
}

func (s *FollowService) GetPublicProfile(
	userID string,
	viewerID string,
) (*models.PublicProfile, error) {
	exists, err := s.followRepository.UserExists(userID)
	if err != nil {
		return nil, err
	}

	if !exists {
		return nil, ErrUserNotFound
	}

	if err := s.streakService.Refresh(context.Background(), userID); err != nil {
		return nil, err
	}

	profile, err := s.followRepository.FindPublicProfile(userID, viewerID)
	if err != nil {
		return nil, err
	}

	if profile == nil {
		return nil, ErrUserNotFound
	}

	return profile, nil
}

// Follow devuelve el perfil actualizado para que el cliente no tenga que
// pedir de nuevo los contadores.
func (s *FollowService) Follow(
	followerID string,
	followedID string,
) (*models.PublicProfile, error) {
	if followerID == followedID {
		return nil, ErrCannotFollowSelf
	}

	if err := s.ensureUserExists(followedID); err != nil {
		return nil, err
	}

	if err := s.followRepository.Follow(followerID, followedID); err != nil {
		return nil, err
	}

	s.notificationService.NotifyFollow(followedID, followerID)

	return s.GetPublicProfile(followedID, followerID)
}

func (s *FollowService) Unfollow(
	followerID string,
	followedID string,
) (*models.PublicProfile, error) {
	if err := s.ensureUserExists(followedID); err != nil {
		return nil, err
	}

	if err := s.followRepository.Unfollow(followerID, followedID); err != nil {
		return nil, err
	}

	s.notificationService.RemoveFollow(followedID, followerID)

	return s.GetPublicProfile(followedID, followerID)
}

func (s *FollowService) GetFollowers(userID string) ([]models.FollowUser, error) {
	if err := s.ensureUserExists(userID); err != nil {
		return nil, err
	}

	return s.followRepository.FindFollowers(userID)
}

func (s *FollowService) GetFollowing(userID string) ([]models.FollowUser, error) {
	if err := s.ensureUserExists(userID); err != nil {
		return nil, err
	}

	return s.followRepository.FindFollowing(userID)
}

const searchLimit = 20

// SearchUsers devuelve una lista vacía para términos de menos de 2
// caracteres, para no listar a todos los usuarios con una sola letra.
func (s *FollowService) SearchUsers(
	term string,
	viewerID string,
) ([]models.FollowUser, error) {
	term = strings.TrimSpace(term)

	if utf8.RuneCountInString(term) < 2 {
		return []models.FollowUser{}, nil
	}

	return s.followRepository.SearchUsers(term, viewerID, searchLimit)
}

func (s *FollowService) ensureUserExists(userID string) error {
	exists, err := s.followRepository.UserExists(userID)
	if err != nil {
		return err
	}

	if !exists {
		return ErrUserNotFound
	}

	return nil
}
