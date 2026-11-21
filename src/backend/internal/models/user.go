package models

import "time"

// User representa a un usuario de Gymify.
type User struct {
	ID             string  `json:"id"`
	Role           string  `json:"role"`
	Username       string  `json:"username"`
	FullName       string  `json:"full_name"`
	Email          string  `json:"email"`
	PasswordHash   string  `json:"-"`
	Bio            *string `json:"bio"`
	ProfilePicture *string `json:"profile_picture"`
	Level          int     `json:"level"`
	XP             int     `json:"xp"`
	Streak         int     `json:"streak"`
	// Opcional; se usa para estimar las calorías del cardio.
	WeightKg            *float64  `json:"weight_kg"`
	CelebrationsEnabled bool      `json:"celebrations_enabled"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
