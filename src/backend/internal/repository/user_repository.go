package repository

import (
	"context"
	"errors"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUsernameTaken = errors.New("ese nombre de usuario ya está en uso; prueba con otro")
	ErrEmailTaken    = errors.New("ya existe un usuario con este correo")
)

// mapUniqueViolation traduce los errores de duplicado de PostgreSQL (23505)
// a mensajes que se pueden mostrar al usuario.
func mapUniqueViolation(err error) error {
	var pgError *pgconn.PgError
	if !errors.As(err, &pgError) || pgError.Code != "23505" {
		return err
	}

	switch pgError.ConstraintName {
	// users_username_lower_key: único sin distinguir mayúsculas (migración 011).
	case "users_username_key", "users_username_lower_key":
		return ErrUsernameTaken
	case "users_email_key":
		return ErrEmailTaken
	default:
		return err
	}
}

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{
		db: db,
	}
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	query := `
		SELECT
			id,
			role,
			username,
			full_name,
			email,
			password_hash,
			bio,
			profile_picture,
			level,
			xp,
			streak,
			weight_kg,
			celebrations_enabled,
			created_at,
			updated_at
		FROM users
		WHERE email = $1
	`

	var user models.User

	err := r.db.QueryRow(
		context.Background(),
		query,
		email,
	).Scan(
		&user.ID,
		&user.Role,
		&user.Username,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Bio,
		&user.ProfilePicture,
		&user.Level,
		&user.XP,
		&user.Streak,
		&user.WeightKg,
		&user.CelebrationsEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) Save(user *models.User) error {
	query := `
		INSERT INTO users (
			role,
			username,
			full_name,
			email,
			password_hash
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			level,
			xp,
			streak,
			weight_kg,
			celebrations_enabled,
			created_at,
			updated_at
	`

	err := r.db.QueryRow(
		context.Background(),
		query,
		user.Role,
		user.Username,
		user.FullName,
		user.Email,
		user.PasswordHash,
	).Scan(
		&user.ID,
		&user.Level,
		&user.XP,
		&user.Streak,
		&user.WeightKg,
		&user.CelebrationsEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	return mapUniqueViolation(err)
}

func (r *UserRepository) FindByID(id string) (*models.User, error) {
	query := `
		SELECT
			id,
			role,
			username,
			full_name,
			email,
			password_hash,
			bio,
			profile_picture,
			level,
			xp,
			streak,
			weight_kg,
			celebrations_enabled,
			created_at,
			updated_at
		FROM users
		WHERE id = $1
	`

	var user models.User

	err := r.db.QueryRow(
		context.Background(),
		query,
		id,
	).Scan(
		&user.ID,
		&user.Role,
		&user.Username,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Bio,
		&user.ProfilePicture,
		&user.Level,
		&user.XP,
		&user.Streak,
		&user.WeightKg,
		&user.CelebrationsEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) UpdateProfile(
	id string,
	username string,
	fullName string,
	bio *string,
	profilePicture *string,
) (*models.User, error) {
	query := `
		UPDATE users
		SET
			username = $2,
			full_name = $3,
			bio = $4,
			profile_picture = $5,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		RETURNING
			id,
			role,
			username,
			full_name,
			email,
			password_hash,
			bio,
			profile_picture,
			level,
			xp,
			streak,
			weight_kg,
			celebrations_enabled,
			created_at,
			updated_at
	`

	var user models.User

	err := r.db.QueryRow(
		context.Background(),
		query,
		id,
		username,
		fullName,
		bio,
		profilePicture,
	).Scan(
		&user.ID,
		&user.Role,
		&user.Username,
		&user.FullName,
		&user.Email,
		&user.PasswordHash,
		&user.Bio,
		&user.ProfilePicture,
		&user.Level,
		&user.XP,
		&user.Streak,
		&user.WeightKg,
		&user.CelebrationsEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		return nil, mapUniqueViolation(err)
	}

	return &user, nil
}

func (r *UserRepository) GetRanking() ([]models.RankingEntry, error) {
	query := `
		SELECT
			id,
			username,
			full_name,
			level,
			xp,
			streak
		FROM users
		ORDER BY xp DESC, streak DESC, created_at ASC
	`

	rows, err := r.db.Query(
		context.Background(),
		query,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ranking := make([]models.RankingEntry, 0)

	position := 1

	for rows.Next() {
		var entry models.RankingEntry

		err := rows.Scan(
			&entry.UserID,
			&entry.Username,
			&entry.FullName,
			&entry.Level,
			&entry.XP,
			&entry.Streak,
		)
		if err != nil {
			return nil, err
		}

		entry.Position = position
		position++

		ranking = append(ranking, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ranking, nil
}

// UpdateSettings cambia el peso y/o la preferencia de celebraciones; un
// valor nil deja el actual.
func (r *UserRepository) UpdateSettings(
	id string,
	weightKg *float64,
	celebrationsEnabled *bool,
) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		UPDATE users
		SET
			weight_kg = COALESCE($2, weight_kg),
			celebrations_enabled = COALESCE($3, celebrations_enabled),
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
		`,
		id,
		weightKg,
		celebrationsEnabled,
	)

	return err
}
