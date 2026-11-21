package repository

import (
	"context"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AchievementRepository struct {
	db *pgxpool.Pool
}

func NewAchievementRepository(
	db *pgxpool.Pool,
) *AchievementRepository {
	return &AchievementRepository{
		db: db,
	}
}

func (r *AchievementRepository) FindByUserID(
	userID string,
) ([]models.UserAchievement, error) {
	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			a.id,
			a.title,
			a.description,
			a.xp_reward,
			a.icon,
			ua.unlocked_at
		FROM user_achievements ua
		JOIN achievements a
			ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
		ORDER BY ua.unlocked_at DESC
		`,
		userID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	achievements := []models.UserAchievement{}

	for rows.Next() {
		var achievement models.UserAchievement

		err := rows.Scan(
			&achievement.ID,
			&achievement.Title,
			&achievement.Description,
			&achievement.XPReward,
			&achievement.Icon,
			&achievement.UnlockedAt,
		)

		if err != nil {
			return nil, err
		}

		achievements = append(
			achievements,
			achievement,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return achievements, nil
}

func (r *AchievementRepository) FindUnlockedByUserAndID(
	userID string,
	achievementID string,
) (*models.UserAchievement, error) {
	var achievement models.UserAchievement

	err := r.db.QueryRow(
		context.Background(),
		`
		SELECT
			a.id,
			a.title,
			a.description,
			a.xp_reward,
			a.icon,
			ua.unlocked_at
		FROM user_achievements ua
		JOIN achievements a
			ON a.id = ua.achievement_id
		WHERE ua.user_id = $1
			AND a.id = $2
		`,
		userID,
		achievementID,
	).Scan(
		&achievement.ID,
		&achievement.Title,
		&achievement.Description,
		&achievement.XPReward,
		&achievement.Icon,
		&achievement.UnlockedAt,
	)

	if err != nil {
		return nil, err
	}

	return &achievement, nil
}
