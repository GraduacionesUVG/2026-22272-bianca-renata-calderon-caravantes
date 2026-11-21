package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FollowRepository struct {
	db *pgxpool.Pool
}

func NewFollowRepository(db *pgxpool.Pool) *FollowRepository {
	return &FollowRepository{
		db: db,
	}
}

// isInvalidUUID indica si PostgreSQL rechazó un id que no es UUID.
// Lo tratamos como un usuario inexistente.
func isInvalidUUID(err error) bool {
	var pgError *pgconn.PgError
	return errors.As(err, &pgError) && pgError.Code == "22P02"
}

func (r *FollowRepository) FindPublicProfile(
	userID string,
	viewerID string,
) (*models.PublicProfile, error) {
	query := `
		SELECT
			u.id,
			u.username,
			u.full_name,
			u.bio,
			u.profile_picture,
			u.level,
			u.xp,
			u.streak,
			(SELECT COUNT(*) FROM follows WHERE followed_id = u.id),
			(SELECT COUNT(*) FROM follows WHERE follower_id = u.id),
			EXISTS (
				SELECT 1
				FROM follows
				WHERE follower_id = $2
				  AND followed_id = u.id
			)
		FROM users u
		WHERE u.id = $1
	`

	var profile models.PublicProfile

	err := r.db.QueryRow(
		context.Background(),
		query,
		userID,
		viewerID,
	).Scan(
		&profile.ID,
		&profile.Username,
		&profile.FullName,
		&profile.Bio,
		&profile.ProfilePicture,
		&profile.Level,
		&profile.XP,
		&profile.Streak,
		&profile.FollowersCount,
		&profile.FollowingCount,
		&profile.IsFollowing,
	)

	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	profile.IsMe = profile.ID == viewerID

	return &profile, nil
}

func (r *FollowRepository) UserExists(userID string) (bool, error) {
	var exists bool

	err := r.db.QueryRow(
		context.Background(),
		`SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`,
		userID,
	).Scan(&exists)

	if isInvalidUUID(err) {
		return false, nil
	}

	if err != nil {
		return false, err
	}

	return exists, nil
}

// Follow es idempotente: seguir a alguien que ya sigues no hace nada.
func (r *FollowRepository) Follow(followerID string, followedID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO follows (follower_id, followed_id)
		VALUES ($1, $2)
		ON CONFLICT (follower_id, followed_id) DO NOTHING
		`,
		followerID,
		followedID,
	)

	return err
}

// Unfollow es idempotente: dejar de seguir a alguien que no sigues no hace nada.
func (r *FollowRepository) Unfollow(followerID string, followedID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM follows
		WHERE follower_id = $1
		  AND followed_id = $2
		`,
		followerID,
		followedID,
	)

	return err
}

func (r *FollowRepository) FindFollowers(userID string) ([]models.FollowUser, error) {
	return r.findFollowUsers(
		`
		SELECT u.id, u.username, u.full_name, u.profile_picture, u.level
		FROM follows f
		JOIN users u ON u.id = f.follower_id
		WHERE f.followed_id = $1
		ORDER BY f.created_at DESC
		`,
		userID,
	)
}

func (r *FollowRepository) FindFollowing(userID string) ([]models.FollowUser, error) {
	return r.findFollowUsers(
		`
		SELECT u.id, u.username, u.full_name, u.profile_picture, u.level
		FROM follows f
		JOIN users u ON u.id = f.followed_id
		WHERE f.follower_id = $1
		ORDER BY f.created_at DESC
		`,
		userID,
	)
}

// SearchUsers busca por username o nombre completo, sin distinguir
// mayúsculas. Los que empiezan por el término aparecen primero.
func (r *FollowRepository) SearchUsers(
	term string,
	viewerID string,
	limit int,
) ([]models.FollowUser, error) {
	// Escapamos los comodines de LIKE para que "%" o "_" se busquen literalmente.
	escaped := strings.NewReplacer(
		`\`, `\\`,
		`%`, `\%`,
		`_`, `\_`,
	).Replace(term)

	return r.findFollowUsers(
		`
		SELECT u.id, u.username, u.full_name, u.profile_picture, u.level
		FROM users u
		WHERE u.id <> $1
		  AND (
			u.username ILIKE $2 ESCAPE '\'
			OR u.full_name ILIKE $2 ESCAPE '\'
		  )
		ORDER BY
			(u.username ILIKE $3 ESCAPE '\'
				OR u.full_name ILIKE $3 ESCAPE '\') DESC,
			u.username ASC
		LIMIT $4
		`,
		viewerID,
		"%"+escaped+"%",
		escaped+"%",
		limit,
	)
}

func (r *FollowRepository) findFollowUsers(
	query string,
	args ...any,
) ([]models.FollowUser, error) {
	rows, err := r.db.Query(
		context.Background(),
		query,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.FollowUser, 0)

	for rows.Next() {
		var user models.FollowUser

		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.FullName,
			&user.ProfilePicture,
			&user.Level,
		)
		if err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
