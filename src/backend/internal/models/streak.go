package models

import "time"

// WeeklyGoalChange indica que, desde la semana WeekStart (un lunes),
// la meta semanal del usuario es Goal.
type WeeklyGoalChange struct {
	WeekStart time.Time
	Goal      int
}

// StreakStatus es el estado de la racha semanal que ve el usuario.
type StreakStatus struct {
	// WeeklyGoal es nil si el usuario todavía no eligió su meta.
	WeeklyGoal *int `json:"weekly_goal"`

	// Weeks es el número de semanas consecutivas con la meta cumplida,
	// incluida la actual si ya se cumplió.
	Weeks int `json:"weeks"`

	WeekStart            time.Time `json:"week_start"`
	CurrentWeekDays      int       `json:"current_week_days"`
	CurrentWeekCompleted bool      `json:"current_week_completed"`
	RemainingDays        int       `json:"remaining_days"`
}
