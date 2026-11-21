package services

import (
	"strings"
	"testing"
)

// Estas validaciones ocurren antes de tocar la base de datos, así que el
// repositorio puede ser nil.
func TestCreateCustomExerciseRejectsInvalidInput(t *testing.T) {
	service := NewExerciseService(nil)

	cases := []struct {
		name        string
		muscleGroup string
		wantError   string
	}{
		{"", "legs", "muy corto"},
		{"   a   ", "legs", "muy corto"},
		{strings.Repeat("a", 61), "legs", "no puede superar"},
		{"Hip\x00Thrust", "legs", "no es válido"},
		{"Hip Thrust", "glutes", "grupo muscular"},
		{"Hip Thrust", "", "grupo muscular"},
	}

	for _, tc := range cases {
		_, err := service.CreateCustomExercise("user", tc.name, tc.muscleGroup)
		if err == nil || !strings.Contains(err.Error(), tc.wantError) {
			t.Errorf("CreateCustomExercise(%q, %q) = %v, se esperaba %q",
				tc.name, tc.muscleGroup, err, tc.wantError)
		}
	}
}
