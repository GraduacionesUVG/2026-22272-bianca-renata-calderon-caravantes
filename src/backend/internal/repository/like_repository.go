package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LikeRepository struct {
	db *pgxpool.Pool
}

func NewLikeRepository(db *pgxpool.Pool) *LikeRepository {
	return &LikeRepository{db: db}
}

func (r *LikeRepository) Add(postID, userID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO likes (post_id, user_id)
		VALUES ($1::uuid, $2::uuid)
		ON CONFLICT DO NOTHING
		`,
		postID,
		userID,
	)

	return err
}

func (r *LikeRepository) Remove(postID, userID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM likes
		WHERE post_id = $1::uuid
		  AND user_id = $2::uuid
		`,
		postID,
		userID,
	)

	return err
}
