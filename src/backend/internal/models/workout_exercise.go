package models

import "time"

type WorkoutExercise struct {
	ID         string `json:"id"`
	WorkoutID  string `json:"workout_id"`
	ExerciseID string `json:"exercise_id"`
	// Solo en el detalle de un entrenamiento.
	ExerciseName    string    `json:"exercise_name,omitempty"`
	MuscleGroup     string    `json:"muscle_group,omitempty"`
	Sets            int       `json:"sets"`
	Reps            int       `json:"reps"`
	Weight          *float64  `json:"weight,omitempty"`
	DurationSeconds *int      `json:"duration_seconds,omitempty"`
	OrderNumber     int       `json:"order_number"`
	CreatedAt       time.Time `json:"created_at,omitzero"`
	UpdatedAt       time.Time `json:"updated_at,omitzero"`
}
