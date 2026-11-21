package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StrengthMET es el gasto de un entrenamiento de fuerza (MET 3.5, Compendium
// of Physical Activities 2011, código 02054: varios ejercicios de 8-15 reps).
// Debe coincidir con la migración 014 y con la app.
const StrengthMET = 3.5

type WorkoutRepository struct {
	db DBTX
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
// Begin abre la transacción en la que WorkoutService registra un entrenamiento.
func (r *WorkoutRepository) Begin(ctx context.Context) (pgx.Tx, error) {
	return r.db.Begin(ctx)
}

func (r *WorkoutRepository) WithTx(tx pgx.Tx) *WorkoutRepository {
	return &WorkoutRepository{db: tx}
}

func NewWorkoutRepository(db *pgxpool.Pool) *WorkoutRepository {
	return &WorkoutRepository{
		db: db,
	}
}

// Create guarda el entrenamiento. Con trainedOn (un día pasado) se registra
// ese día a la hora actual; sin él, ahora mismo.
func (r *WorkoutRepository) Create(
	ctx context.Context,
	workout *models.Workout,
	exercises []models.WorkoutExercise,
	trainedOn *time.Time,
) error {

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("error iniciando transacción: %w", err)
	}

	defer tx.Rollback(ctx)

	workoutQuery := `
		INSERT INTO workouts (
			user_id,
			title,
			duration_minutes,
			calories_burned,
			completed,
			notes,
			is_public,
			workout_date
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			-- date + LOCALTIME es hora local de la sesión (APP_TIMEZONE).
			COALESCE($8::date + LOCALTIME, CURRENT_TIMESTAMP)
		)
		RETURNING
			id,
			workout_date,
			created_at,
			updated_at
	`

	err = tx.QueryRow(
		ctx,
		workoutQuery,
		workout.UserID,
		workout.Title,
		workout.DurationMinutes,
		workout.CaloriesBurned,
		workout.Completed,
		workout.Notes,
		workout.IsPublic,
		trainedOn,
	).Scan(
		&workout.ID,
		&workout.WorkoutDate,
		&workout.CreatedAt,
		&workout.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("error creando entrenamiento: %w", err)
	}

	exerciseQuery := `
		INSERT INTO workout_exercises (
			workout_id,
			exercise_id,
			sets,
			reps,
			weight,
			duration_seconds,
			order_number
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING
			id,
			created_at,
			updated_at
	`

	for i := range exercises {
		exercises[i].WorkoutID = workout.ID

		err = tx.QueryRow(
			ctx,
			exerciseQuery,
			exercises[i].WorkoutID,
			exercises[i].ExerciseID,
			exercises[i].Sets,
			exercises[i].Reps,
			exercises[i].Weight,
			exercises[i].DurationSeconds,
			exercises[i].OrderNumber,
		).Scan(
			&exercises[i].ID,
			&exercises[i].CreatedAt,
			&exercises[i].UpdatedAt,
		)

		if err != nil {
			return fmt.Errorf(
				"error agregando ejercicio al entrenamiento: %w",
				err,
			)
		}
	}

	// Calorías estimadas: MET × peso × horas. El cardio usa el MET de cada
	// ejercicio y su duración; la fuerza, strengthMET y el resto de la
	// duración total (descansos incluidos). Sin peso del usuario queda en 0.
	// Se calcula aquí y no en la app para que nadie envíe un valor inventado.
	err = tx.QueryRow(
		ctx,
		`
		UPDATE workouts w
		SET calories_burned = p.cardio_kcal + p.strength_kcal,
			strength_calories = p.strength_kcal
		FROM (
			SELECT
				COALESCE(ROUND(
					SUM(e.met * u.weight_kg * we.duration_seconds / 3600.0)
						FILTER (WHERE e.met IS NOT NULL AND we.duration_seconds IS NOT NULL)
				), 0)::int AS cardio_kcal,
				CASE
					WHEN BOOL_OR(e.muscle_group <> 'cardio') AND MAX(u.weight_kg) IS NOT NULL
					THEN ROUND(
						$2::float8 * MAX(u.weight_kg)::float8 * GREATEST(
							MAX(wk.duration_minutes) * 60
								- COALESCE(SUM(we.duration_seconds) FILTER (WHERE e.muscle_group = 'cardio'), 0),
							0
						) / 3600.0
					)::int
					ELSE 0
				END AS strength_kcal
			FROM workouts wk
			JOIN users u ON u.id = wk.user_id
			JOIN workout_exercises we ON we.workout_id = wk.id
			JOIN exercises e ON e.id = we.exercise_id
			WHERE wk.id = $1
		) p
		WHERE w.id = $1
		RETURNING w.calories_burned, w.strength_calories
		`,
		workout.ID,
		StrengthMET,
	).Scan(&workout.CaloriesBurned, &workout.StrengthCalories)

	if err != nil {
		return fmt.Errorf("error calculando calorías: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("error confirmando entrenamiento: %w", err)
	}

	workout.Exercises = exercises

	return nil
}

// workoutWithSummary selecciona un entrenamiento con su resumen (series,
// volumen, minutos de cardio, ejercicios). Lo usan el listado y el detalle.
const workoutWithSummary = `
	SELECT
		w.id,
		w.user_id,
		w.title,
		w.workout_date,
		w.duration_minutes,
		w.calories_burned,
		w.strength_calories,
		w.completed,
		w.is_public,
		w.notes,
		w.created_at,
		w.updated_at,
		COALESCE(summary.exercise_count, 0),
		COALESCE(summary.total_sets, 0),
		COALESCE(summary.volume_kg, 0),
		COALESCE(summary.cardio_minutes, 0),
		COALESCE(summary.exercise_names, '{}')
	FROM workouts w
	LEFT JOIN LATERAL (
		SELECT
			COUNT(*) AS exercise_count,
			-- El cardio se registra por minutos (1 serie × 1 rep de
			-- relleno), así que no cuenta como series.
			SUM(we.sets) FILTER (WHERE e.muscle_group <> 'cardio') AS total_sets,
			(SUM(we.duration_seconds) FILTER (WHERE e.muscle_group = 'cardio') / 60)::int AS cardio_minutes,
			-- Volumen = series × repeticiones × peso (sin peso cuenta 0).
			SUM(we.sets * we.reps * COALESCE(we.weight, 0))::float8 AS volume_kg,
			array_agg(e.name ORDER BY we.order_number) AS exercise_names
		FROM workout_exercises we
		JOIN exercises e ON e.id = we.exercise_id
		WHERE we.workout_id = w.id
	) summary ON TRUE
`

func scanWorkoutWithSummary(row pgx.Row) (models.Workout, error) {
	var workout models.Workout
	var summary models.WorkoutSummary

	err := row.Scan(
		&workout.ID,
		&workout.UserID,
		&workout.Title,
		&workout.WorkoutDate,
		&workout.DurationMinutes,
		&workout.CaloriesBurned,
		&workout.StrengthCalories,
		&workout.Completed,
		&workout.IsPublic,
		&workout.Notes,
		&workout.CreatedAt,
		&workout.UpdatedAt,
		&summary.ExerciseCount,
		&summary.TotalSets,
		&summary.VolumeKg,
		&summary.CardioMinutes,
		&summary.ExerciseNames,
	)

	workout.Summary = &summary

	return workout, err
}

// FindByUserID lista los entrenamientos de un usuario, del más reciente al
// más antiguo. Con publicOnly solo devuelve los públicos.
func (r *WorkoutRepository) FindByUserID(
	userID string,
	publicOnly bool,
) ([]models.Workout, error) {
	rows, err := r.db.Query(
		context.Background(),
		workoutWithSummary+`
		WHERE w.user_id = $1
		  AND (w.is_public OR NOT $2)
		ORDER BY w.workout_date DESC
		`,
		userID,
		publicOnly,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	workouts := []models.Workout{}

	for rows.Next() {
		workout, err := scanWorkoutWithSummary(rows)
		if err != nil {
			return nil, err
		}

		workouts = append(workouts, workout)
	}

	return workouts, rows.Err()
}

// FindDetail devuelve un entrenamiento con su resumen y sus ejercicios, o nil
// si no existe.
func (r *WorkoutRepository) FindDetail(workoutID string) (*models.Workout, error) {
	ctx := context.Background()

	workout, err := scanWorkoutWithSummary(r.db.QueryRow(
		ctx,
		workoutWithSummary+`WHERE w.id = $1`,
		workoutID,
	))

	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			we.id,
			we.exercise_id,
			e.name,
			e.muscle_group,
			we.sets,
			we.reps,
			we.weight::float8,
			we.duration_seconds,
			we.order_number
		FROM workout_exercises we
		JOIN exercises e ON e.id = we.exercise_id
		WHERE we.workout_id = $1
		ORDER BY we.order_number
		`,
		workoutID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	workout.Exercises = []models.WorkoutExercise{}

	for rows.Next() {
		exercise := models.WorkoutExercise{WorkoutID: workoutID}

		if err := rows.Scan(
			&exercise.ID,
			&exercise.ExerciseID,
			&exercise.ExerciseName,
			&exercise.MuscleGroup,
			&exercise.Sets,
			&exercise.Reps,
			&exercise.Weight,
			&exercise.DurationSeconds,
			&exercise.OrderNumber,
		); err != nil {
			return nil, err
		}

		workout.Exercises = append(workout.Exercises, exercise)
	}

	return &workout, rows.Err()
}

// UpdateVisibility cambia la visibilidad de un entrenamiento de userID.
// Devuelve false si no existe o no le pertenece.
func (r *WorkoutRepository) UpdateVisibility(
	workoutID string,
	userID string,
	isPublic bool,
) (bool, error) {
	result, err := r.db.Exec(
		context.Background(),
		`
		UPDATE workouts
		SET is_public = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		  AND user_id = $2
		`,
		workoutID,
		userID,
		isPublic,
	)

	if isInvalidUUID(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}

func (r *WorkoutRepository) UserExists(userID string) (bool, error) {
	var exists bool

	err := r.db.QueryRow(
		context.Background(),
		`SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`,
		userID,
	).Scan(&exists)

	if isInvalidUUID(err) {
		return false, nil
	}

	return exists, err
}

// Today devuelve la fecha de hoy en la zona horaria de la app.
func (r *WorkoutRepository) Today(ctx context.Context) (time.Time, error) {
	var today time.Time

	err := r.db.QueryRow(
		ctx,
		`SELECT CURRENT_DATE`,
	).Scan(&today)

	return today, err
}

func (r *WorkoutRepository) CelebrationsEnabled(ctx context.Context, userID string) (bool, error) {
	var enabled bool

	err := r.db.QueryRow(
		ctx,
		`SELECT celebrations_enabled FROM users WHERE id = $1`,
		userID,
	).Scan(&enabled)

	return enabled, err
}

// UpdateTitle renombra un entrenamiento de userID. Devuelve false si no existe
// o no le pertenece.
func (r *WorkoutRepository) UpdateTitle(
	workoutID string,
	userID string,
	title string,
) (bool, error) {
	result, err := r.db.Exec(
		context.Background(),
		`
		UPDATE workouts
		SET title = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		  AND user_id = $2
		`,
		workoutID,
		userID,
		title,
	)

	if isInvalidUUID(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}

// UsableExercises devuelve el grupo muscular de cada ejercicio de exerciseIDs
// que userID puede usar: activos y del catálogo o propios (nadie puede usar
// los ejercicios propios de otro). Los que falten no existen o no son suyos.
func (r *WorkoutRepository) UsableExercises(
	ctx context.Context,
	userID string,
	exerciseIDs []string,
) (map[string]string, error) {
	groups := make(map[string]string, len(exerciseIDs))

	rows, err := r.db.Query(
		ctx,
		`
		SELECT id::text, muscle_group
		FROM exercises
		WHERE id = ANY($2::uuid[])
		  AND is_active
		  AND (created_by IS NULL OR created_by = $1)
		`,
		userID,
		exerciseIDs,
	)

	if isInvalidUUID(err) {
		return groups, nil
	}

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id, group string

		if err := rows.Scan(&id, &group); err != nil {
			if isInvalidUUID(err) {
				return groups, nil
			}
			return nil, err
		}

		groups[id] = group
	}

	if err := rows.Err(); err != nil {
		if isInvalidUUID(err) {
			return groups, nil
		}
		return nil, err
	}

	return groups, nil
}

// Stats resume todos los entrenamientos de userID. "Este mes" usa la zona
// horaria de la sesión (APP_TIMEZONE).
func (r *WorkoutRepository) Stats(userID string) (*models.WorkoutStats, error) {
	ctx := context.Background()
	stats := &models.WorkoutStats{
		PersonalRecords: []models.PersonalRecord{},
		MuscleGroups:    []models.MuscleGroupCount{},
	}

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			COUNT(*),
			COALESCE(SUM(duration_minutes), 0),
			COALESCE(SUM(calories_burned), 0),
			COALESCE(SUM(strength_calories), 0),
			COUNT(*) FILTER (WHERE this_month),
			COALESCE(SUM(duration_minutes) FILTER (WHERE this_month), 0),
			COALESCE(SUM(calories_burned) FILTER (WHERE this_month), 0)
		FROM (
			SELECT
				*,
				date_trunc('month', workout_date) = date_trunc('month', CURRENT_TIMESTAMP) AS this_month
			FROM workouts
			WHERE user_id = $1
		) w
		`,
		userID,
	).Scan(
		&stats.TotalWorkouts,
		&stats.TotalMinutes,
		&stats.TotalCalories,
		&stats.StrengthCalories,
		&stats.MonthWorkouts,
		&stats.MonthMinutes,
		&stats.MonthCalories,
	)
	if err != nil {
		return nil, err
	}

	stats.CardioCalories = stats.TotalCalories - stats.StrengthCalories

	err = r.db.QueryRow(
		ctx,
		`
		SELECT
			COALESCE(SUM(we.sets) FILTER (WHERE e.muscle_group <> 'cardio'), 0),
			COALESCE(SUM(we.sets * we.reps * COALESCE(we.weight, 0))
				FILTER (WHERE e.muscle_group <> 'cardio'), 0)::float8,
			(COALESCE(SUM(we.duration_seconds) FILTER (WHERE e.muscle_group = 'cardio'), 0) / 60)::int
		FROM workout_exercises we
		JOIN workouts w ON w.id = we.workout_id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = $1
		`,
		userID,
	).Scan(&stats.TotalSets, &stats.VolumeKg, &stats.CardioMinutes)
	if err != nil {
		return nil, err
	}

	// Ejercicio favorito: el que aparece en más entrenamientos.
	err = r.db.QueryRow(
		ctx,
		`
		SELECT e.name, COUNT(DISTINCT w.id)::int AS times
		FROM workout_exercises we
		JOIN workouts w ON w.id = we.workout_id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = $1
		GROUP BY e.id, e.name
		ORDER BY times DESC, e.name
		LIMIT 1
		`,
		userID,
	).Scan(&stats.FavoriteExercise, &stats.FavoriteExerciseCount)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	// Récords: mayor peso por ejercicio (y más reps a ese peso), los 5 más
	// pesados.
	rows, err := r.db.Query(
		ctx,
		`
		SELECT name, weight, reps, workout_date
		FROM (
			SELECT DISTINCT ON (e.id)
				e.name,
				we.weight::float8 AS weight,
				we.reps,
				w.workout_date
			FROM workout_exercises we
			JOIN workouts w ON w.id = we.workout_id
			JOIN exercises e ON e.id = we.exercise_id
			WHERE w.user_id = $1
			  AND e.muscle_group <> 'cardio'
			  AND we.weight > 0
			ORDER BY e.id, we.weight DESC, we.reps DESC, w.workout_date
		) best
		ORDER BY weight DESC, name
		LIMIT 5
		`,
		userID,
	)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		var record models.PersonalRecord

		if err := rows.Scan(
			&record.ExerciseName,
			&record.WeightKg,
			&record.Reps,
			&record.WorkoutDate,
		); err != nil {
			rows.Close()
			return nil, err
		}

		stats.PersonalRecords = append(stats.PersonalRecords, record)
	}
	rows.Close()

	if err := rows.Err(); err != nil {
		return nil, err
	}

	rows, err = r.db.Query(
		ctx,
		`
		SELECT e.muscle_group, SUM(we.sets)::int AS sets
		FROM workout_exercises we
		JOIN workouts w ON w.id = we.workout_id
		JOIN exercises e ON e.id = we.exercise_id
		WHERE w.user_id = $1
		  AND e.muscle_group <> 'cardio'
		GROUP BY e.muscle_group
		ORDER BY sets DESC, e.muscle_group
		`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var group models.MuscleGroupCount

		if err := rows.Scan(&group.MuscleGroup, &group.Sets); err != nil {
			return nil, err
		}

		stats.MuscleGroups = append(stats.MuscleGroups, group)
	}

	return stats, rows.Err()
}
