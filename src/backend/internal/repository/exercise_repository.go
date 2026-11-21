package repository

import (
	"context"
	"errors"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ExerciseRepository struct {
	db *pgxpool.Pool
}

func NewExerciseRepository(db *pgxpool.Pool) *ExerciseRepository {
	return &ExerciseRepository{db: db}
}

const exerciseColumns = `
	id,
	name,
	description,
	is_active,
	muscle_group,
	equipment,
	difficulty,
	met::float8,
	image_url,
	image_author,
	image_license,
	image_license_url,
	image_source_url,
	created_by IS NOT NULL,
	created_at,
	updated_at
`

func scanExercise(row pgx.Row) (models.Exercise, error) {
	var exercise models.Exercise

	err := row.Scan(
		&exercise.ID,
		&exercise.Name,
		&exercise.Description,
		&exercise.IsActive,
		&exercise.MuscleGroup,
		&exercise.Equipment,
		&exercise.Difficulty,
		&exercise.Met,
		&exercise.ImageURL,
		&exercise.ImageAuthor,
		&exercise.ImageLicense,
		&exercise.ImageLicenseURL,
		&exercise.ImageSourceURL,
		&exercise.IsCustom,
		&exercise.CreatedAt,
		&exercise.UpdatedAt,
	)

	return exercise, err
}

// FindAll devuelve el catálogo activo más los ejercicios propios de userID.
func (r *ExerciseRepository) FindAll(userID string) ([]models.Exercise, error) {
	rows, err := r.db.Query(
		context.Background(),
		`SELECT `+exerciseColumns+`
		FROM exercises
		WHERE is_active = TRUE
		  AND (created_by IS NULL OR created_by = $1)
		ORDER BY name`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	exercises := []models.Exercise{}

	for rows.Next() {
		exercise, err := scanExercise(rows)
		if err != nil {
			return nil, err
		}

		exercises = append(exercises, exercise)
	}

	return exercises, rows.Err()
}

// FindCatalogName devuelve el nombre del ejercicio del catálogo que coincide
// con name sin distinguir mayúsculas, o "" si no hay ninguno.
func (r *ExerciseRepository) FindCatalogName(name string) (string, error) {
	var found string

	err := r.db.QueryRow(
		context.Background(),
		`SELECT name FROM exercises
		WHERE created_by IS NULL AND lower(name) = lower($1)`,
		name,
	).Scan(&found)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}

	return found, err
}

func (r *ExerciseRepository) CountCustom(userID string) (int, error) {
	var count int

	err := r.db.QueryRow(
		context.Background(),
		`SELECT COUNT(*) FROM exercises WHERE created_by = $1 AND is_active`,
		userID,
	).Scan(&count)

	return count, err
}

// CreateCustom guarda un ejercicio propio. Si el usuario ya tenía uno con ese
// nombre y lo había quitado, lo reactiva (conserva su historial). Devuelve
// nil si ya tiene uno activo con ese nombre.
func (r *ExerciseRepository) CreateCustom(
	userID string,
	name string,
	muscleGroup string,
) (*models.Exercise, error) {
	exercise, err := scanExercise(r.db.QueryRow(
		context.Background(),
		`INSERT INTO exercises (name, muscle_group, difficulty, created_by)
		VALUES ($2, $3, 'beginner', $1)
		ON CONFLICT (created_by, lower(name)) WHERE created_by IS NOT NULL
		DO UPDATE SET
			is_active = TRUE,
			name = EXCLUDED.name,
			muscle_group = EXCLUDED.muscle_group,
			updated_at = CURRENT_TIMESTAMP
		WHERE exercises.is_active = FALSE
		RETURNING `+exerciseColumns,
		userID,
		name,
		muscleGroup,
	))

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &exercise, nil
}

// DeactivateCustom quita un ejercicio propio de la lista. No se borra para no
// perder los entrenamientos que ya lo usan. Devuelve false si no existe o no
// es de userID.
func (r *ExerciseRepository) DeactivateCustom(
	exerciseID string,
	userID string,
) (bool, error) {
	result, err := r.db.Exec(
		context.Background(),
		`UPDATE exercises
		SET is_active = FALSE,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		  AND created_by = $2
		  AND is_active`,
		exerciseID,
		userID,
	)

	if isInvalidUUID(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}
