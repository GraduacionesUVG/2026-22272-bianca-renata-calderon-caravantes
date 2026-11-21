package models

import "time"

// PostType representa el tipo de publicación en el feed social.
type PostType string

const (
	PostTraining    PostType = "training"
	PostQuestion    PostType = "question"
	PostAchievement PostType = "achievement"
	PostGeneral     PostType = "general"
)

// ModerationStatus es el estado de una publicación según sus reportes.
type ModerationStatus string

const (
	// ModerationVisible: sin reportes suficientes o aprobada por un moderador.
	ModerationVisible ModerationStatus = "visible"
	// ModerationUnderReview: alcanzó el umbral de reportes y espera revisión.
	ModerationUnderReview ModerationStatus = "under_review"
	// ModerationRemoved: un moderador la retiró.
	ModerationRemoved ModerationStatus = "removed"
)

// Post representa una publicación del feed social.
type Post struct {
	ID            string   `json:"id"`
	UserID        string   `json:"user_id"`
	AchievementID *string  `json:"achievement_id,omitempty"`
	Username      string   `json:"username"`
	FullName      string   `json:"full_name"`
	Content       string   `json:"content"`
	PostType      PostType `json:"post_type"`
	Edited        bool     `json:"edited"`
	LikeCount     int      `json:"like_count"`
	LikedByMe     bool     `json:"liked_by_me"`
	CommentCount  int      `json:"comment_count"`
	// Solo el autor ve sus publicaciones que no están en ModerationVisible.
	ModerationStatus ModerationStatus `json:"moderation_status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
