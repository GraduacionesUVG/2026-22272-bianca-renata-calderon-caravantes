package services

import (
	"testing"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
)

// monday devuelve el lunes de la semana n relativa a la semana actual
// (0 = esta semana, -1 = la anterior...). Las fechas vienen en UTC, igual
// que los DATE que devuelve pgx.
func monday(n int) time.Time {
	return time.Date(2026, time.October, 5, 0, 0, 0, 0, time.UTC).AddDate(0, 0, 7*n)
}

func goals(changes ...models.WeeklyGoalChange) []models.WeeklyGoalChange {
	return changes
}

func goalFrom(week int, goal int) models.WeeklyGoalChange {
	return models.WeeklyGoalChange{WeekStart: monday(week), Goal: goal}
}

func TestCalculateWeeklyStreak(t *testing.T) {
	tests := []struct {
		name          string
		goals         []models.WeeklyGoalChange
		days          map[time.Time]int
		wantWeeks     int
		wantGoal      *int
		wantCompleted bool
		wantRemaining int
	}{
		{
			name:      "sin meta elegida no hay racha",
			goals:     nil,
			days:      map[time.Time]int{monday(0): 5, monday(-1): 5},
			wantWeeks: 0,
			wantGoal:  nil,
		},
		{
			name:          "semana actual en curso no rompe la racha",
			goals:         goals(goalFrom(-3, 3)),
			days:          map[time.Time]int{monday(0): 2, monday(-1): 3, monday(-2): 4, monday(-3): 3},
			wantWeeks:     3,
			wantGoal:      intPtr(3),
			wantRemaining: 1,
		},
		{
			name:          "semana actual cumplida suma una sola vez",
			goals:         goals(goalFrom(-1, 3)),
			days:          map[time.Time]int{monday(0): 6, monday(-1): 3},
			wantWeeks:     2,
			wantGoal:      intPtr(3),
			wantCompleted: true,
		},
		{
			name:          "semana pasada incumplida corta la racha",
			goals:         goals(goalFrom(-4, 3)),
			days:          map[time.Time]int{monday(0): 3, monday(-1): 3, monday(-2): 2, monday(-3): 3, monday(-4): 3},
			wantWeeks:     2,
			wantGoal:      intPtr(3),
			wantCompleted: true,
		},
		{
			name:          "semana sin entrenar corta la racha",
			goals:         goals(goalFrom(-3, 2)),
			days:          map[time.Time]int{monday(0): 1, monday(-2): 2, monday(-3): 2},
			wantWeeks:     0,
			wantGoal:      intPtr(2),
			wantRemaining: 1,
		},
		{
			name:          "semanas anteriores a la primera meta no cuentan",
			goals:         goals(goalFrom(-1, 2)),
			days:          map[time.Time]int{monday(0): 2, monday(-1): 2, monday(-2): 7, monday(-3): 7},
			wantWeeks:     2,
			wantGoal:      intPtr(2),
			wantCompleted: true,
		},
		{
			name: "subir la meta no invalida semanas pasadas",
			// 3 días bastaban entonces; ahora la meta es 5.
			goals:         goals(goalFrom(-2, 3), goalFrom(0, 5)),
			days:          map[time.Time]int{monday(0): 3, monday(-1): 3, monday(-2): 3},
			wantWeeks:     2,
			wantGoal:      intPtr(5),
			wantRemaining: 2,
		},
		{
			name: "bajar la meta no rescata semanas pasadas incumplidas",
			// La semana -1 tenía meta 4 y solo hubo 2 días.
			goals:         goals(goalFrom(-2, 4), goalFrom(0, 2)),
			days:          map[time.Time]int{monday(0): 2, monday(-1): 2, monday(-2): 4},
			wantWeeks:     1,
			wantGoal:      intPtr(2),
			wantCompleted: true,
		},
		{
			name:          "superar la meta no deja remaining negativo",
			goals:         goals(goalFrom(0, 1)),
			days:          map[time.Time]int{monday(0): 4},
			wantWeeks:     1,
			wantGoal:      intPtr(1),
			wantCompleted: true,
			wantRemaining: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := calculateWeeklyStreak(monday(0), tt.goals, tt.days)

			if got.Weeks != tt.wantWeeks {
				t.Errorf("Weeks = %d, want %d", got.Weeks, tt.wantWeeks)
			}

			if (got.WeeklyGoal == nil) != (tt.wantGoal == nil) ||
				(got.WeeklyGoal != nil && *got.WeeklyGoal != *tt.wantGoal) {
				t.Errorf("WeeklyGoal = %v, want %v", deref(got.WeeklyGoal), deref(tt.wantGoal))
			}

			if got.CurrentWeekCompleted != tt.wantCompleted {
				t.Errorf("CurrentWeekCompleted = %v, want %v", got.CurrentWeekCompleted, tt.wantCompleted)
			}

			if got.RemainingDays != tt.wantRemaining {
				t.Errorf("RemainingDays = %d, want %d", got.RemainingDays, tt.wantRemaining)
			}
		})
	}
}

func intPtr(v int) *int {
	return &v
}

func deref(v *int) any {
	if v == nil {
		return nil
	}

	return *v
}
