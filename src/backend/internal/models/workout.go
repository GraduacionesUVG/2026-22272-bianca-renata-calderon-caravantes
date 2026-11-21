package models

import "time"

type Workout struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	Title           string    `json:"title"`
	WorkoutDate     time.Time `json:"workout_date"`
	DurationMinutes int       `json:"duration_minutes"`
	// Total estimado (cardio + fuerza); StrengthCalories es la parte de fuerza.
	CaloriesBurned   int               `json:"calories_burned"`
	StrengthCalories int               `json:"strength_calories"`
	Completed        bool              `json:"completed"`
	IsPublic         bool              `json:"is_public"`
	Notes            *string           `json:"notes,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
	Exercises        []WorkoutExercise `json:"exercises,omitempty"`

	// Resumen para el historial; solo se llena al listar entrenamientos.
	Summary *WorkoutSummary `json:"summary,omitempty"`
}

// WorkoutCelebration indica qué logros desbloqueó el entrenamiento recién
// registrado, para que la app los celebre.
type WorkoutCelebration struct {
	// StreakWeeks > 0 si el entrenamiento completó una semana de la racha.
	StreakWeeks         int      `json:"streak_weeks,omitempty"`
	CompletedChallenges []string `json:"completed_challenges,omitempty"`
}

type WorkoutSummary struct {
	ExerciseCount int      `json:"exercise_count"`
	TotalSets     int      `json:"total_sets"`
	VolumeKg      float64  `json:"volume_kg"`
	CardioMinutes int      `json:"cardio_minutes"`
	ExerciseNames []string `json:"exercise_names"`
}

// WorkoutStats resume todos los entrenamientos de un usuario para su perfil.
type WorkoutStats struct {
	TotalWorkouts    int     `json:"total_workouts"`
	TotalMinutes     int     `json:"total_minutes"`
	TotalCalories    int     `json:"total_calories"`
	StrengthCalories int     `json:"strength_calories"`
	CardioCalories   int     `json:"cardio_calories"`
	TotalSets        int     `json:"total_sets"`
	VolumeKg         float64 `json:"volume_kg"`
	CardioMinutes    int     `json:"cardio_minutes"`

	MonthWorkouts int `json:"month_workouts"`
	MonthMinutes  int `json:"month_minutes"`
	MonthCalories int `json:"month_calories"`

	FavoriteExercise      *string `json:"favorite_exercise"`
	FavoriteExerciseCount int     `json:"favorite_exercise_count"`

	PersonalRecords []PersonalRecord   `json:"personal_records"`
	MuscleGroups    []MuscleGroupCount `json:"muscle_groups"`
}

// PersonalRecord es el mayor peso levantado en un ejercicio.
type PersonalRecord struct {
	ExerciseName string    `json:"exercise_name"`
	WeightKg     float64   `json:"weight_kg"`
	Reps         int       `json:"reps"`
	WorkoutDate  time.Time `json:"workout_date"`
}

// MuscleGroupCount son las series de fuerza hechas para un grupo muscular.
type MuscleGroupCount struct {
	MuscleGroup string `json:"muscle_group"`
	Sets        int    `json:"sets"`
}
