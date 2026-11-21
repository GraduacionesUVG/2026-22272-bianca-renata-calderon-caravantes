package repository

import (
	"time"

	"context"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ChallengeRepository struct {
	db DBTX
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (r *ChallengeRepository) WithTx(tx pgx.Tx) *ChallengeRepository {
	return &ChallengeRepository{db: tx}
}

func NewChallengeRepository(db *pgxpool.Pool) *ChallengeRepository {
	return &ChallengeRepository{db: db}
}

func (r *ChallengeRepository) FindAllForUser(
	userID string,
) ([]models.Challenge, error) {
	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			c.id,
			c.title,
			c.description,
			c.goal,
			c.xp_reward,
			CASE
				WHEN NOW() < c.start_date THEN 'upcoming'
				WHEN NOW() > c.end_date THEN 'completed'
				ELSE 'active'
			END AS status,
			c.start_date,
			c.end_date,
			(cp.id IS NOT NULL) AS joined,
			COALESCE(cp.progress, 0) AS progress,
			COALESCE(cp.completed, false) AS completed
		FROM challenges c
		LEFT JOIN challenges_participants cp
			ON cp.challenge_id = c.id
			AND cp.user_id = $1
		ORDER BY
			CASE
				WHEN NOW() BETWEEN c.start_date AND c.end_date THEN 0
				WHEN NOW() < c.start_date THEN 1
				ELSE 2
			END,
			c.start_date ASC
		`,
		userID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	challenges := []models.Challenge{}

	for rows.Next() {
		var challenge models.Challenge

		if err := rows.Scan(
			&challenge.ID,
			&challenge.Title,
			&challenge.Description,
			&challenge.Goal,
			&challenge.XPReward,
			&challenge.Status,
			&challenge.StartDate,
			&challenge.EndDate,
			&challenge.Joined,
			&challenge.Progress,
			&challenge.Completed,
		); err != nil {
			return nil, err
		}

		challenges = append(challenges, challenge)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return challenges, nil
}

func (r *ChallengeRepository) Join(
	challengeID string,
	userID string,
) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO challenges_participants (
			challenge_id,
			user_id
		)
		SELECT c.id, $2
		FROM challenges c
		WHERE c.id = $1
		  AND NOW() BETWEEN c.start_date AND c.end_date
		ON CONFLICT (challenge_id, user_id) DO NOTHING
		`,
		challengeID,
		userID,
	)

	return err
}

// UpdateProgressAfterWorkout suma el entrenamiento a los retos del usuario si
// su fecha cae dentro del reto y no es anterior al día en que se unió (con el
// registro retroactivo, la fecha puede ser de días pasados).
func (r *ChallengeRepository) UpdateProgressAfterWorkout(
	ctx context.Context,
	userID string,
	workoutDate time.Time,
) ([]models.Challenge, error) {
	rows, err := r.db.Query(
		ctx,
		`
		UPDATE challenges_participants cp
		SET
			progress = LEAST(cp.progress + 1, c.goal),
			completed = (cp.progress + 1 >= c.goal)
		FROM challenges c
		WHERE cp.challenge_id = c.id
		  AND cp.user_id = $1
		  AND cp.completed = FALSE
		  AND $2 BETWEEN c.start_date AND c.end_date
		  AND $2::date >= cp.joined_at::date
		RETURNING
			c.id,
			c.title,
			c.description,
			c.goal,
			c.xp_reward,
			c.start_date,
			c.end_date,
			cp.progress,
			cp.completed
		`,
		userID,
		workoutDate,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	completedChallenges := []models.Challenge{}

	for rows.Next() {
		var challenge models.Challenge

		if err := rows.Scan(
			&challenge.ID,
			&challenge.Title,
			&challenge.Description,
			&challenge.Goal,
			&challenge.XPReward,
			&challenge.StartDate,
			&challenge.EndDate,
			&challenge.Progress,
			&challenge.Completed,
		); err != nil {
			return nil, err
		}

		if challenge.Completed {
			completedChallenges = append(
				completedChallenges,
				challenge,
			)
		}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return completedChallenges, nil
}
