package services

import (
	"context"

	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	XPPerWorkout = 100
	XPPerLevel   = 500
)

type GamificationService struct {
	db repository.DBTX
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (s *GamificationService) WithTx(tx pgx.Tx) *GamificationService {
	return &GamificationService{db: tx}
}

func NewGamificationService(db *pgxpool.Pool) *GamificationService {
	return &GamificationService{
		db: db,
	}
}

// ApplyWorkoutRewards suma la XP del entrenamiento y recalcula el nivel.
// La racha semanal la calcula StreakService.
func (s *GamificationService) ApplyWorkoutRewards(
	ctx context.Context,
	userID string,
) error {
	return s.AddXP(ctx, userID, XPPerWorkout)
}

func (s *GamificationService) AddXP(
	ctx context.Context,
	userID string,
	xpAmount int,
) error {

	_, err := s.db.Exec(
		ctx,
		`
		UPDATE users
		SET
			xp = xp + $1,
			level = ((xp + $1) / $2) + 1,
			updated_at = NOW()
		WHERE id = $3
		`,
		xpAmount,
		XPPerLevel,
		userID,
	)

	return err
}
