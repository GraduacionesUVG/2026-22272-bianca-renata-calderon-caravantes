package services

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/biancacalderon/gymify/backend/internal/models"
	"github.com/biancacalderon/gymify/backend/internal/repository"
)

type WorkoutService struct {
	workoutRepository   *repository.WorkoutRepository
	gamificationService *GamificationService
	achievementService  *AchievementService
	challengeService    *ChallengeService
	streakService       *StreakService
}

type WorkoutExerciseInput struct {
	ExerciseID      string
	Sets            int
	Reps            int
	Weight          *float64
	DurationSeconds *int
	OrderNumber     int
}

func NewWorkoutService(
	workoutRepository *repository.WorkoutRepository,
	gamificationService *GamificationService,
	achievementService *AchievementService,
	challengeService *ChallengeService,
	streakService *StreakService,
) *WorkoutService {
	return &WorkoutService{
		workoutRepository:   workoutRepository,
		gamificationService: gamificationService,
		achievementService:  achievementService,
		challengeService:    challengeService,
		streakService:       streakService,
	}
}

func (s *WorkoutService) CreateWorkout(
	ctx context.Context,
	userID string,
	title string,
	durationMinutes int,
	notes *string,
	isPublic bool,
	workoutDate *string,
	inputs []WorkoutExerciseInput,
) (*models.Workout, *models.WorkoutCelebration, error) {

	title = strings.TrimSpace(title)

	if title == "" {
		return nil, nil, errors.New("el título del entrenamiento es obligatorio")
	}

	if durationMinutes <= 0 {
		return nil, nil, errors.New("la duración debe ser mayor a cero")
	}

	trainedOn, err := s.resolveWorkoutDate(ctx, workoutDate)
	if err != nil {
		return nil, nil, err
	}

	if len(inputs) == 0 {
		return nil, nil, errors.New(
			"el entrenamiento debe contener al menos un ejercicio",
		)
	}

	exercises := make([]models.WorkoutExercise, 0, len(inputs))
	usedOrders := make(map[int]bool)

	for _, input := range inputs {
		if input.ExerciseID == "" {
			return nil, nil, errors.New("el ejercicio es obligatorio")
		}

		if input.Sets <= 0 {
			return nil, nil, errors.New("las series deben ser mayores a cero")
		}

		if input.Reps <= 0 {
			return nil, nil, errors.New(
				"las repeticiones deben ser mayores a cero",
			)
		}

		if input.DurationSeconds != nil && *input.DurationSeconds <= 0 {
			return nil, nil, errors.New("la duración del ejercicio debe ser mayor a cero")
		}

		if input.OrderNumber <= 0 {
			return nil, nil, errors.New(
				"el orden del ejercicio debe ser mayor a cero",
			)
		}

		if usedOrders[input.OrderNumber] {
			return nil, nil, errors.New(
				"no puede haber dos ejercicios con el mismo orden",
			)
		}

		usedOrders[input.OrderNumber] = true

		exercises = append(exercises, models.WorkoutExercise{
			ExerciseID:      input.ExerciseID,
			Sets:            input.Sets,
			Reps:            input.Reps,
			Weight:          input.Weight,
			DurationSeconds: input.DurationSeconds,
			OrderNumber:     input.OrderNumber,
		})
	}

	exerciseIDs := make([]string, 0, len(exercises))
	for _, exercise := range exercises {
		exerciseIDs = append(exerciseIDs, exercise.ExerciseID)
	}

	groups, err := s.workoutRepository.UsableExercises(ctx, userID, exerciseIDs)
	if err != nil {
		return nil, nil, err
	}

	// Los minutos de cardio son parte de la duración total: si la superan,
	// las calorías del cardio contarían tiempo que no está en el entrenamiento.
	cardioSeconds := 0

	for _, exercise := range exercises {
		group, ok := groups[strings.ToLower(exercise.ExerciseID)]
		if !ok {
			return nil, nil, errors.New("alguno de los ejercicios no existe")
		}

		if group == "cardio" && exercise.DurationSeconds != nil {
			cardioSeconds += *exercise.DurationSeconds
		}
	}

	if cardioSeconds > durationMinutes*60 {
		return nil, nil, errors.New(
			"los minutos de cardio no pueden superar la duración total del entrenamiento",
		)
	}

	workout := &models.Workout{
		UserID:          userID,
		Title:           title,
		DurationMinutes: durationMinutes,
		Completed:       true,
		Notes:           notes,
		IsPublic:        isPublic,
	}

	// Racha antes de registrar, para saber después si este entrenamiento
	// completó una semana.
	streakBefore, err := s.streakService.GetStatus(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	// El entrenamiento y todo lo que de él se deriva (XP, nivel, racha, logros
	// y retos) se guardan en una sola transacción: si un paso falla, ninguno
	// queda aplicado y no hay un entrenamiento sin su XP.

	tx, err := s.workoutRepository.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	// Si la petición se cancela, el Rollback debe poder completarse igual.
	defer tx.Rollback(context.WithoutCancel(ctx))

	workoutRepository := s.workoutRepository.WithTx(tx)
	gamificationService := s.gamificationService.WithTx(tx)
	streakService := s.streakService.WithTx(tx)
	achievementService := s.achievementService.WithTx(tx)
	challengeService := s.challengeService.WithTx(tx)

	if err := workoutRepository.Create(ctx, workout, exercises, trainedOn); err != nil {
		return nil, nil, err
	}

	if err := gamificationService.ApplyWorkoutRewards(ctx, userID); err != nil {
		return nil, nil, err
	}

	// Antes de los logros, que dependen de la racha (GetStatus la guarda).
	streakAfter, err := streakService.GetStatus(ctx, userID)
	if err != nil {
		return nil, nil, err
	}

	if err := achievementService.CheckAndUnlock(ctx, userID); err != nil {
		return nil, nil, err
	}

	completedChallenges, err := challengeService.UpdateProgressAfterWorkout(
		ctx,
		userID,
		workout.WorkoutDate,
	)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}

	celebration, err := s.buildCelebration(
		ctx,
		userID,
		streakBefore,
		streakAfter,
		completedChallenges,
	)
	if err != nil {
		// El entrenamiento ya fue confirmado en la base de datos.
		// Una falla al construir la celebración no debe reportarlo como fallido.
		return workout, nil, nil
	}

	return workout, celebration, nil
}

// buildCelebration devuelve nil si no hay nada que celebrar o si el usuario
// desactivó las celebraciones en su perfil.
func (s *WorkoutService) buildCelebration(
	ctx context.Context,
	userID string,
	streakBefore *models.StreakStatus,
	streakAfter *models.StreakStatus,
	completedChallenges []string,
) (*models.WorkoutCelebration, error) {
	celebration := &models.WorkoutCelebration{
		CompletedChallenges: completedChallenges,
	}

	// Comparamos semanas y no "semana actual cumplida": así también se
	// celebra un registro retroactivo que completa la semana anterior.
	if streakAfter.Weeks > streakBefore.Weeks {
		celebration.StreakWeeks = streakAfter.Weeks
	}

	if celebration.StreakWeeks == 0 && len(celebration.CompletedChallenges) == 0 {
		return nil, nil
	}

	enabled, err := s.workoutRepository.CelebrationsEnabled(ctx, userID)
	if err != nil {
		return nil, err
	}

	if !enabled {
		return nil, nil
	}

	return celebration, nil
}

var ErrWorkoutNotFound = errors.New("entrenamiento no encontrado")

// MaxBackdateDays limita cuánto se puede registrar hacia atrás: cubre olvidos
// recientes sin permitir rehacer semanas pasadas para salvar la racha. El
// momento real del registro queda en created_at, para poder analizarlo.
const MaxBackdateDays = 3

// resolveWorkoutDate valida la fecha elegida (YYYY-MM-DD). Devuelve nil si es
// hoy o no se indicó, para registrar el entrenamiento en este momento.
func (s *WorkoutService) resolveWorkoutDate(ctx context.Context, value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}

	date, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, errors.New("la fecha del entrenamiento no es válida")
	}

	today, err := s.workoutRepository.Today(ctx)
	if err != nil {
		return nil, err
	}

	// Ambas son medianoche UTC (DATE de PostgreSQL y time.Parse), así que la
	// diferencia en horas es exacta.
	daysAgo := int(today.Sub(date).Hours() / 24)

	if daysAgo < 0 {
		return nil, errors.New("no puedes registrar entrenamientos en fechas futuras")
	}

	if daysAgo > MaxBackdateDays {
		return nil, errors.New("solo puedes registrar entrenamientos de hasta 3 días atrás")
	}

	if daysAgo == 0 {
		return nil, nil
	}

	return &date, nil
}

func (s *WorkoutService) GetUserWorkouts(
	userID string,
) ([]models.Workout, error) {
	return s.workoutRepository.FindByUserID(userID, false)
}

// GetProfileWorkouts devuelve los entrenamientos que viewerID puede ver en el
// perfil de ownerID: todos si es su propio perfil, solo los públicos si no.
// A otros usuarios no les mostramos las notas, que son personales.
func (s *WorkoutService) GetProfileWorkouts(
	ownerID string,
	viewerID string,
) ([]models.Workout, error) {
	exists, err := s.workoutRepository.UserExists(ownerID)
	if err != nil {
		return nil, err
	}

	if !exists {
		return nil, ErrUserNotFound
	}

	isOwner := ownerID == viewerID

	workouts, err := s.workoutRepository.FindByUserID(ownerID, !isOwner)
	if err != nil {
		return nil, err
	}

	if !isOwner {
		for i := range workouts {
			workouts[i].Notes = nil
		}
	}

	return workouts, nil
}

// MaxTitleLength coincide con workouts.title VARCHAR(100).
const MaxTitleLength = 100

func (s *WorkoutService) Rename(
	workoutID string,
	userID string,
	title string,
) (string, error) {
	title = strings.TrimSpace(title)

	if title == "" {
		return "", errors.New("el nombre del entrenamiento no puede quedar vacío")
	}

	if utf8.RuneCountInString(title) > MaxTitleLength {
		return "", errors.New("el nombre no puede superar los 100 caracteres")
	}

	updated, err := s.workoutRepository.UpdateTitle(workoutID, userID, title)
	if err != nil {
		return "", err
	}

	if !updated {
		return "", ErrWorkoutNotFound
	}

	return title, nil
}

// GetWorkoutDetail devuelve un entrenamiento con sus ejercicios. El dueño lo
// ve completo; otros usuarios solo si es público, y sin las notas. Si no
// puede verlo, responde como si no existiera.
func (s *WorkoutService) GetWorkoutDetail(
	workoutID string,
	viewerID string,
) (*models.Workout, bool, error) {
	workout, err := s.workoutRepository.FindDetail(workoutID)
	if err != nil {
		return nil, false, err
	}

	if workout == nil {
		return nil, false, ErrWorkoutNotFound
	}

	isOwner := workout.UserID == viewerID

	if !isOwner {
		if !workout.IsPublic {
			return nil, false, ErrWorkoutNotFound
		}

		workout.Notes = nil
	}

	return workout, isOwner, nil
}

func (s *WorkoutService) SetVisibility(
	workoutID string,
	userID string,
	isPublic bool,
) error {
	updated, err := s.workoutRepository.UpdateVisibility(workoutID, userID, isPublic)
	if err != nil {
		return err
	}

	if !updated {
		return ErrWorkoutNotFound
	}

	return nil
}

func (s *WorkoutService) GetStats(userID string) (*models.WorkoutStats, error) {
	return s.workoutRepository.Stats(userID)
}
