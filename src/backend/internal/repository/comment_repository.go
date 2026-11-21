package repository

import (
	"context"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepository struct {
	db *pgxpool.Pool
}

func NewCommentRepository(db *pgxpool.Pool) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) Create(
	postID string,
	userID string,
	content string,
) (*models.Comment, error) {
	var comment models.Comment

	err := r.db.QueryRow(
		context.Background(),
		`
		INSERT INTO comments (
			post_id,
			user_id,
			content
		)
		VALUES ($1, $2, $3)
		RETURNING
			id,
			post_id,
			user_id,
			content,
			edited,
			created_at
		`,
		postID,
		userID,
		content,
	).Scan(
		&comment.ID,
		&comment.PostID,
		&comment.UserID,
		&comment.Content,
		&comment.Edited,
		&comment.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &comment, nil
}

func (r *CommentRepository) FindByPostID(
	postID string,
) ([]models.Comment, error) {
	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			c.id,
			c.post_id,
			c.user_id,
			u.username,
			u.full_name,
			c.content,
			c.edited,
			c.created_at
		FROM comments c
		JOIN users u
			ON u.id = c.user_id
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC
		`,
		postID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	comments := []models.Comment{}

	for rows.Next() {
		var comment models.Comment

		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.UserID,
			&comment.Username,
			&comment.FullName,
			&comment.Content,
			&comment.Edited,
			&comment.CreatedAt,
		); err != nil {
			return nil, err
		}

		comments = append(comments, comment)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

func (r *CommentRepository) Delete(
	commentID string,
	userID string,
) (bool, error) {
	result, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM comments
		WHERE id = $1
		  AND user_id = $2
		`,
		commentID,
		userID,
	)

	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}
