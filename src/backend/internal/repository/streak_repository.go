package repository

import (
	"context"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StreakRepository struct {
	db DBTX
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (r *StreakRepository) WithTx(tx pgx.Tx) *StreakRepository {
	return &StreakRepository{db: tx}
}

func NewStreakRepository(db *pgxpool.Pool) *StreakRepository {
	return &StreakRepository{
		db: db,
	}
}

// CurrentWeekStart devuelve el lunes de la semana actual según la hora de
// PostgreSQL, la misma que usa workout_date.
func (r *StreakRepository) CurrentWeekStart(ctx context.Context) (time.Time, error) {
	var weekStart time.Time

	err := r.db.QueryRow(
		ctx,
		`SELECT date_trunc('week', LOCALTIMESTAMP)::date`,
	).Scan(&weekStart)

	return weekStart, err
}

// userFilter: con userIDs vacío las consultas incluyen a todos los usuarios.
func userFilter(userIDs []string) []string {
	if len(userIDs) == 0 {
		return nil
	}

	return userIDs
}

// GoalHistory devuelve, por usuario, sus cambios de meta ordenados por semana.
func (r *StreakRepository) GoalHistory(
	ctx context.Context,
	userIDs []string,
) (map[string][]models.WeeklyGoalChange, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT user_id::text, week_start, goal
		FROM weekly_goal_history
		WHERE $1::uuid[] IS NULL OR user_id = ANY($1::uuid[])
		ORDER BY user_id, week_start ASC
		`,
		userFilter(userIDs),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	history := make(map[string][]models.WeeklyGoalChange)

	for rows.Next() {
		var userID string
		var change models.WeeklyGoalChange

		if err := rows.Scan(&userID, &change.WeekStart, &change.Goal); err != nil {
			return nil, err
		}

		history[userID] = append(history[userID], change)
	}

	return history, rows.Err()
}

// TrainingDaysPerWeek cuenta, por usuario y semana, los días distintos con al
// menos un entrenamiento completado. Varios entrenamientos el mismo día
// cuentan como uno.
func (r *StreakRepository) TrainingDaysPerWeek(
	ctx context.Context,
	userIDs []string,
) (map[string]map[time.Time]int, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			user_id::text,
			date_trunc('week', workout_date)::date AS week_start,
			COUNT(DISTINCT workout_date::date)
		FROM workouts
		WHERE completed = TRUE
		  AND ($1::uuid[] IS NULL OR user_id = ANY($1::uuid[]))
		GROUP BY user_id, week_start
		`,
		userFilter(userIDs),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	days := make(map[string]map[time.Time]int)

	for rows.Next() {
		var userID string
		var weekStart time.Time
		var count int

		if err := rows.Scan(&userID, &weekStart, &count); err != nil {
			return nil, err
		}

		if days[userID] == nil {
			days[userID] = make(map[time.Time]int)
		}

		days[userID][weekStart] = count
	}

	return days, rows.Err()
}

// AllUserIDs se usa para recalcular la racha de todos (p. ej. el ranking).
func (r *StreakRepository) AllUserIDs(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(
		ctx,
		`SELECT id::text FROM users`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)

	for rows.Next() {
		var id string

		if err := rows.Scan(&id); err != nil {
			return nil, err
		}

		ids = append(ids, id)
	}

	return ids, rows.Err()
}

// SaveStreaks guarda las rachas calculadas en una sola consulta, tocando
// solo las filas que cambiaron.
func (r *StreakRepository) SaveStreaks(ctx context.Context, streaks map[string]int) error {
	if len(streaks) == 0 {
		return nil
	}

	ids := make([]string, 0, len(streaks))
	values := make([]int32, 0, len(streaks))

	for id, value := range streaks {
		ids = append(ids, id)
		values = append(values, int32(value))
	}

	_, err := r.db.Exec(
		ctx,
		`
		UPDATE users u
		SET streak = data.streak
		FROM unnest($1::uuid[], $2::int[]) AS data(id, streak)
		WHERE u.id = data.id
		  AND u.streak <> data.streak
		`,
		ids,
		values,
	)

	return err
}

// SetWeeklyGoal guarda la meta en el usuario y la registra a partir de la
// semana indicada, sin tocar las semanas anteriores.
func (r *StreakRepository) SetWeeklyGoal(
	ctx context.Context,
	userID string,
	goal int,
	weekStart time.Time,
) error {

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`
		UPDATE users
		SET weekly_goal = $2,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		`,
		userID,
		goal,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO weekly_goal_history (user_id, week_start, goal)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, week_start)
		DO UPDATE SET
			goal = EXCLUDED.goal,
			updated_at = CURRENT_TIMESTAMP
		`,
		userID,
		weekStart,
		goal,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
