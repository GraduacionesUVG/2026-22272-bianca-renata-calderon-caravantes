package models

import "time"

// Achievement representa un logro disponible dentro de Gymify.
type Achievement struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	XPReward    int       `json:"xp_reward"`
	Icon        *string   `json:"icon,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// UserAchievement representa un logro desbloqueado por un usuario.
type UserAchievement struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	XPReward    int       `json:"xp_reward"`
	Icon        *string   `json:"icon,omitempty"`
	UnlockedAt  time.Time `json:"unlocked_at"`
}
