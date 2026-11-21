package services

import (
	"context"
	"time"

	"errors"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5"
)

type ChallengeService struct {
	challengeRepository *repository.ChallengeRepository
	gamificationService *GamificationService
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (s *ChallengeService) WithTx(tx pgx.Tx) *ChallengeService {
	return &ChallengeService{
		challengeRepository: s.challengeRepository.WithTx(tx),
		gamificationService: s.gamificationService.WithTx(tx),
	}
}

func NewChallengeService(
	challengeRepository *repository.ChallengeRepository,
	gamificationService *GamificationService,
) *ChallengeService {
	return &ChallengeService{
		challengeRepository: challengeRepository,
		gamificationService: gamificationService,
	}
}

func (s *ChallengeService) GetChallenges(
	userID string,
) ([]models.Challenge, error) {
	return s.challengeRepository.FindAllForUser(userID)
}

func (s *ChallengeService) JoinChallenge(
	challengeID string,
	userID string,
) error {
	if challengeID == "" {
		return errors.New("el reto es obligatorio")
	}

	return s.challengeRepository.Join(
		challengeID,
		userID,
	)
}

// UpdateProgressAfterWorkout devuelve los títulos de los retos que el
// entrenamiento completó.
func (s *ChallengeService) UpdateProgressAfterWorkout(
	ctx context.Context,
	userID string,
	workoutDate time.Time,
) ([]string, error) {
	completedChallenges, err :=
		s.challengeRepository.UpdateProgressAfterWorkout(ctx, userID, workoutDate)

	if err != nil {
		return nil, err
	}

	titles := make([]string, 0, len(completedChallenges))

	for _, challenge := range completedChallenges {
		if err := s.gamificationService.AddXP(
			ctx,
			userID,
			challenge.XPReward,
		); err != nil {
			return nil, err
		}

		titles = append(titles, challenge.Title)
	}

	return titles, nil
}
