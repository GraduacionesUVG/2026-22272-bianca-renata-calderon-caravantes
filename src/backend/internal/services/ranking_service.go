package services

import (
	"context"
	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

type RankingService struct {
	userRepository *repository.UserRepository
	streakService  *StreakService
}

func NewRankingService(
	userRepository *repository.UserRepository,
	streakService *StreakService,
) *RankingService {
	return &RankingService{
		userRepository: userRepository,
		streakService:  streakService,
	}
}

func (s *RankingService) GetRanking(
	currentUserID string,
) ([]models.RankingEntry, error) {
	// Las rachas de usuarios inactivos pueden haberse roto desde su último
	// entrenamiento; las recalculamos antes de ordenar.
	if err := s.streakService.RefreshAll(context.Background()); err != nil {
		return nil, err
	}

	ranking, err := s.userRepository.GetRanking()
	if err != nil {
		return nil, err
	}

	for i := range ranking {
		ranking[i].IsMe = ranking[i].UserID == currentUserID
	}

	return ranking, nil
}
