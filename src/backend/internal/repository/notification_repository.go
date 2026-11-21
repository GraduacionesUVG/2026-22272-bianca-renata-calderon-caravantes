package repository

import (
	"context"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{
		db: db,
	}
}

// Las notificaciones de likes y comentarios van al autor de la publicación;
// si es quien actuó, no se crea nada (no te notificas a ti mismo).
// ON CONFLICT DO NOTHING aprovecha los índices únicos de likes y seguimientos.

func (r *NotificationRepository) CreateLike(postID, actorID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO notifications (user_id, type, actor_id, post_id)
		SELECT p.user_id, 'like', $2, p.id
		FROM posts p
		WHERE p.id = $1
		  AND p.user_id <> $2
		ON CONFLICT DO NOTHING
		`,
		postID,
		actorID,
	)

	return err
}

func (r *NotificationRepository) DeleteLike(postID, actorID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM notifications
		WHERE type = 'like'
		  AND post_id = $1
		  AND actor_id = $2
		`,
		postID,
		actorID,
	)

	return err
}

func (r *NotificationRepository) CreateComment(
	postID string,
	commentID string,
	actorID string,
) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
		SELECT p.user_id, 'comment', $3, p.id, $2
		FROM posts p
		WHERE p.id = $1
		  AND p.user_id <> $3
		`,
		postID,
		commentID,
		actorID,
	)

	return err
}

func (r *NotificationRepository) CreateFollow(followedID, followerID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		INSERT INTO notifications (user_id, type, actor_id)
		VALUES ($1, 'follow', $2)
		ON CONFLICT DO NOTHING
		`,
		followedID,
		followerID,
	)

	return err
}

func (r *NotificationRepository) DeleteFollow(followedID, followerID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		DELETE FROM notifications
		WHERE type = 'follow'
		  AND user_id = $1
		  AND actor_id = $2
		`,
		followedID,
		followerID,
	)

	return err
}

// FindByUserID devuelve las notificaciones más recientes del usuario.
func (r *NotificationRepository) FindByUserID(
	userID string,
	limit int,
) ([]models.Notification, error) {
	rows, err := r.db.Query(
		context.Background(),
		`
		SELECT
			n.id,
			n.type,
			n.is_read,
			n.created_at,
			a.id,
			a.username,
			a.full_name,
			a.profile_picture,
			n.post_id::text,
			left(p.content, 80),
			left(c.content, 80)
		FROM notifications n
		JOIN users a ON a.id = n.actor_id
		LEFT JOIN posts p ON p.id = n.post_id
		LEFT JOIN comments c ON c.id = n.comment_id
		WHERE n.user_id = $1
		  AND n.type IS NOT NULL
		ORDER BY n.created_at DESC
		LIMIT $2
		`,
		userID,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := make([]models.Notification, 0)

	for rows.Next() {
		var notification models.Notification

		err := rows.Scan(
			&notification.ID,
			&notification.Type,
			&notification.IsRead,
			&notification.CreatedAt,
			&notification.Actor.ID,
			&notification.Actor.Username,
			&notification.Actor.FullName,
			&notification.Actor.ProfilePicture,
			&notification.PostID,
			&notification.PostPreview,
			&notification.CommentPreview,
		)
		if err != nil {
			return nil, err
		}

		notifications = append(notifications, notification)
	}

	return notifications, rows.Err()
}

func (r *NotificationRepository) CountUnread(userID string) (int, error) {
	var count int

	err := r.db.QueryRow(
		context.Background(),
		`
		SELECT COUNT(*)
		FROM notifications
		WHERE user_id = $1
		  AND NOT is_read
		  AND type IS NOT NULL
		`,
		userID,
	).Scan(&count)

	return count, err
}

func (r *NotificationRepository) MarkAllRead(userID string) error {
	_, err := r.db.Exec(
		context.Background(),
		`
		UPDATE notifications
		SET is_read = TRUE,
			updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $1
		  AND NOT is_read
		`,
		userID,
	)

	return err
}
