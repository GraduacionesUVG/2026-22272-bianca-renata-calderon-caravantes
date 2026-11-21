package services

import (
	"context"
	"errors"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/jackc/pgx/v5"
)

const (
	MinWeeklyGoal = 1
	MaxWeeklyGoal = 7
)

var ErrInvalidWeeklyGoal = errors.New("la meta semanal debe estar entre 1 y 7 días")

// StreakService calcula la racha semanal a partir de los entrenamientos y del
// historial de metas. La racha puede romperse solo con el paso del tiempo
// (una semana termina sin cumplir la meta), así que se recalcula cada vez que
// se consulta en lugar de actualizarse solo al registrar un entrenamiento.
type StreakService struct {
	streakRepository *repository.StreakRepository
}

// WithTx devuelve una copia que opera dentro de la transacción indicada.
func (s *StreakService) WithTx(tx pgx.Tx) *StreakService {
	return &StreakService{streakRepository: s.streakRepository.WithTx(tx)}
}

func NewStreakService(streakRepository *repository.StreakRepository) *StreakService {
	return &StreakService{
		streakRepository: streakRepository,
	}
}

// Refresh recalcula y guarda users.streak para los usuarios indicados.
func (s *StreakService) Refresh(ctx context.Context, userIDs ...string) error {
	_, err := s.compute(ctx, userIDs)
	return err
}

// RefreshAll recalcula la racha de todos los usuarios.
func (s *StreakService) RefreshAll(ctx context.Context) error {
	userIDs, err := s.streakRepository.AllUserIDs(ctx)
	if err != nil {
		return err
	}

	if len(userIDs) == 0 {
		return nil
	}

	return s.Refresh(ctx, userIDs...)
}

func (s *StreakService) GetStatus(ctx context.Context, userID string) (*models.StreakStatus, error) {
	statuses, err := s.compute(ctx, []string{userID})
	if err != nil {
		return nil, err
	}

	return statuses[userID], nil
}

func (s *StreakService) SetWeeklyGoal(
	ctx context.Context,
	userID string,
	goal int,
) (*models.StreakStatus, error) {
	if goal < MinWeeklyGoal || goal > MaxWeeklyGoal {
		return nil, ErrInvalidWeeklyGoal
	}

	weekStart, err := s.streakRepository.CurrentWeekStart(ctx)
	if err != nil {
		return nil, err
	}

	// La nueva meta aplica desde la semana actual; las semanas pasadas
	// conservan la meta que tenían.
	if err := s.streakRepository.SetWeeklyGoal(ctx, userID, goal, weekStart); err != nil {
		return nil, err
	}

	return s.GetStatus(ctx, userID)
}

func (s *StreakService) compute(
	ctx context.Context,
	userIDs []string,
) (map[string]*models.StreakStatus, error) {
	weekStart, err := s.streakRepository.CurrentWeekStart(ctx)
	if err != nil {
		return nil, err
	}

	history, err := s.streakRepository.GoalHistory(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	days, err := s.streakRepository.TrainingDaysPerWeek(ctx, userIDs)
	if err != nil {
		return nil, err
	}

	statuses := make(map[string]*models.StreakStatus, len(userIDs))
	streaks := make(map[string]int, len(userIDs))

	for _, userID := range userIDs {
		status := calculateWeeklyStreak(weekStart, history[userID], days[userID])
		statuses[userID] = &status
		streaks[userID] = status.Weeks
	}

	if err := s.streakRepository.SaveStreaks(ctx, streaks); err != nil {
		return nil, err
	}

	return statuses, nil
}

// goalForWeek devuelve la meta vigente en una semana: la del último cambio
// hecho en esa semana o antes. ok es false si aún no había meta.
func goalForWeek(goals []models.WeeklyGoalChange, weekStart time.Time) (int, bool) {
	goal, ok := 0, false

	for _, change := range goals {
		if change.WeekStart.After(weekStart) {
			break
		}

		goal, ok = change.Goal, true
	}

	return goal, ok
}

// calculateWeeklyStreak aplica las reglas de la racha semanal:
//   - La semana actual suma si ya cumplió su meta; si no, sigue en curso y
//     no rompe la racha.
//   - Cada semana anterior consecutiva que cumplió su meta suma una.
//   - La primera semana terminada sin cumplir la meta, o anterior a la
//     primera meta elegida, corta la cuenta.
//
// goals debe venir ordenado por WeekStart ascendente.
func calculateWeeklyStreak(
	currentWeekStart time.Time,
	goals []models.WeeklyGoalChange,
	trainingDays map[time.Time]int,
) models.StreakStatus {
	status := models.StreakStatus{
		WeekStart:       currentWeekStart,
		CurrentWeekDays: trainingDays[currentWeekStart],
	}

	currentGoal, ok := goalForWeek(goals, currentWeekStart)
	if !ok {
		return status
	}

	status.WeeklyGoal = &currentGoal
	status.CurrentWeekCompleted = status.CurrentWeekDays >= currentGoal
	status.RemainingDays = max(currentGoal-status.CurrentWeekDays, 0)

	if status.CurrentWeekCompleted {
		status.Weeks++
	}

	for week := currentWeekStart.AddDate(0, 0, -7); ; week = week.AddDate(0, 0, -7) {
		goal, ok := goalForWeek(goals, week)
		if !ok || trainingDays[week] < goal {
			break
		}

		status.Weeks++
	}

	return status
}
