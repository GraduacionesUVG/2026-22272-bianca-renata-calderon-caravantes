package services

import (
	"context"
	"errors"
	"strings"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

type UserService struct {
	userRepository *repository.UserRepository
	streakService  *StreakService
}

func NewUserService(
	userRepository *repository.UserRepository,
	streakService *StreakService,
) *UserService {
	return &UserService{
		userRepository: userRepository,
		streakService:  streakService,
	}
}

func (s *UserService) GetProfile(userID string) (*models.User, error) {
	if err := s.streakService.Refresh(context.Background(), userID); err != nil {
		return nil, err
	}

	user, err := s.userRepository.FindByID(userID)
	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("usuario no encontrado")
	}

	return user, nil
}

const (
	MinWeightKg = 25
	MaxWeightKg = 300
)

func (s *UserService) UpdateSettings(
	userID string,
	weightKg *float64,
	celebrationsEnabled *bool,
) (*models.User, error) {
	if weightKg != nil && (*weightKg < MinWeightKg || *weightKg > MaxWeightKg) {
		return nil, errors.New("el peso debe estar entre 25 y 300 kg")
	}

	if err := s.userRepository.UpdateSettings(userID, weightKg, celebrationsEnabled); err != nil {
		return nil, err
	}

	return s.GetProfile(userID)
}

func (s *UserService) UpdateProfile(
	userID string,
	username string,
	fullName string,
	bio *string,
	profilePicture *string,
) (*models.User, error) {
	username = strings.TrimSpace(username)
	fullName = strings.TrimSpace(fullName)

	if len(username) < 3 {
		return nil, errors.New("el nombre de usuario debe tener al menos 3 caracteres")
	}

	if fullName == "" {
		return nil, errors.New("el nombre completo es obligatorio")
	}

	return s.userRepository.UpdateProfile(
		userID,
		username,
		fullName,
		bio,
		profilePicture,
	)
}
