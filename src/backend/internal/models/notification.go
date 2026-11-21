package models

import "time"

type NotificationType string

const (
	NotificationLike    NotificationType = "like"
	NotificationComment NotificationType = "comment"
	NotificationFollow  NotificationType = "follow"
)

// NotificationActor es quien hizo la acción (dio like, comentó, siguió).
type NotificationActor struct {
	ID             string  `json:"id"`
	Username       string  `json:"username"`
	FullName       string  `json:"full_name"`
	ProfilePicture *string `json:"profile_picture"`
}

type Notification struct {
	ID        string            `json:"id"`
	Type      NotificationType  `json:"type"`
	IsRead    bool              `json:"is_read"`
	CreatedAt time.Time         `json:"created_at"`
	Actor     NotificationActor `json:"actor"`

	// Solo en likes y comentarios: fragmentos para que se entienda de qué
	// publicación y comentario se trata.
	PostID         *string `json:"post_id,omitempty"`
	PostPreview    *string `json:"post_preview,omitempty"`
	CommentPreview *string `json:"comment_preview,omitempty"`
}
