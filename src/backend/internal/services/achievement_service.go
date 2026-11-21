package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AchievementService struct {
	db                    repository.DBTX
	achievementRepository *repository.AchievementRepository
	postRepository        *repository.PostRepository
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (s *AchievementService) WithTx(tx pgx.Tx) *AchievementService {
	copia := *s
	copia.db = tx
	return &copia
}

func NewAchievementService(
	db *pgxpool.Pool,
	achievementRepository *repository.AchievementRepository,
	postRepository *repository.PostRepository,
) *AchievementService {
	return &AchievementService{
		db:                    db,
		achievementRepository: achievementRepository,
		postRepository:        postRepository,
	}
}

func (s *AchievementService) GetUserAchievements(
	userID string,
) ([]models.UserAchievement, error) {
	return s.achievementRepository.FindByUserID(userID)
}

func (s *AchievementService) CheckAndUnlock(
	ctx context.Context,
	userID string,
) error {

	var xp int
	var level int
	var streak int
	var workoutCount int

	err := s.db.QueryRow(
		ctx,
		`
		SELECT xp, level, streak
		FROM users
		WHERE id = $1
		`,
		userID,
	).Scan(
		&xp,
		&level,
		&streak,
	)

	if err != nil {
		return err
	}

	err = s.db.QueryRow(
		ctx,
		`
		SELECT COUNT(*)
		FROM workouts
		WHERE user_id = $1
		  AND completed = TRUE
		`,
		userID,
	).Scan(&workoutCount)

	if err != nil {
		return err
	}

	type achievementRule struct {
		title     string
		condition bool
	}

	rules := []achievementRule{
		{
			title:     "Primer entrenamiento",
			condition: workoutCount >= 1,
		},
		{
			title:     "En marcha",
			condition: workoutCount >= 5,
		},
		{
			title:     "Constancia",
			condition: streak >= 3,
		},
		{
			title:     "Imparable",
			condition: streak >= 7,
		},
		{
			title:     "500 Club",
			condition: xp >= 500,
		},
		{
			title:     "Nivel 2",
			condition: level >= 2,
		},
	}

	for _, rule := range rules {
		if !rule.condition {
			continue
		}

		err := s.unlockAchievement(
			ctx,
			userID,
			rule.title,
		)

		if err != nil {
			return err
		}
	}

	return nil
}

func (s *AchievementService) unlockAchievement(
	ctx context.Context,
	userID string,
	title string,
) error {
	var achievementID string
	var xpReward int

	err := s.db.QueryRow(
		ctx,
		`
		SELECT id, xp_reward
		FROM achievements
		WHERE title = $1
		`,
		title,
	).Scan(
		&achievementID,
		&xpReward,
	)

	if err != nil {
		return err
	}

	commandTag, err := s.db.Exec(
		ctx,
		`
		INSERT INTO user_achievements (
			user_id,
			achievement_id
		)
		VALUES ($1, $2)
		ON CONFLICT (
			user_id,
			achievement_id
		)
		DO NOTHING
		`,
		userID,
		achievementID,
	)

	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return nil
	}

	_, err = s.db.Exec(
		ctx,
		`
		UPDATE users
		SET
			xp = xp + $1,
			level = ((xp + $1) / 500) + 1,
			updated_at = NOW()
		WHERE id = $2
		`,
		xpReward,
		userID,
	)

	return err
}

func (s *AchievementService) ShareAchievement(
	userID string,
	achievementID string,
) (*models.Post, error) {
	achievement, err :=
		s.achievementRepository.FindUnlockedByUserAndID(
			userID,
			achievementID,
		)

	if err != nil {
		return nil, errors.New(
			"el logro no existe o no ha sido desbloqueado",
		)
	}

	content := fmt.Sprintf(
		"Desbloqueé el logro \"%s\" · +%d XP",
		achievement.Title,
		achievement.XPReward,
	)

	post, err := s.postRepository.CreateAchievementPost(
		userID,
		content,
		achievementID,
	)

	if err != nil {
		var pgError *pgconn.PgError
		if errors.As(err, &pgError) &&
			pgError.Code == "23505" &&
			pgError.ConstraintName == "unique_shared_achievement" {
			return nil, errors.New(
				"ya has compartido este logro anteriormente",
			)
		}

		return nil, err
	}

	return post, nil
}
