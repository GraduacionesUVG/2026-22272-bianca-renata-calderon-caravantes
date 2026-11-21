package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type WorkoutHandler struct {
	workoutService *services.WorkoutService
}

func NewWorkoutHandler(
	workoutService *services.WorkoutService,
) *WorkoutHandler {
	return &WorkoutHandler{
		workoutService: workoutService,
	}
}

type createWorkoutExerciseRequest struct {
	ExerciseID      string   `json:"exercise_id"`
	Sets            int      `json:"sets"`
	Reps            int      `json:"reps"`
	Weight          *float64 `json:"weight"`
	DurationSeconds *int     `json:"duration_seconds"`
	OrderNumber     int      `json:"order_number"`
}

type createWorkoutRequest struct {
	Title           string `json:"title"`
	DurationMinutes int    `json:"duration_minutes"`
	// calories_burned ya no se acepta: el servidor lo estima (cardio y fuerza).
	Notes *string `json:"notes"`
	// Si el cliente no lo envía (versiones anteriores de la app), privado.
	IsPublic bool `json:"is_public"`
	// Día en que se entrenó (YYYY-MM-DD); vacío = hoy. Hasta 3 días atrás.
	WorkoutDate *string                        `json:"workout_date"`
	Exercises   []createWorkoutExerciseRequest `json:"exercises"`
}

func (h *WorkoutHandler) CreateWorkout(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request createWorkoutRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	exerciseInputs := make(
		[]services.WorkoutExerciseInput,
		0,
		len(request.Exercises),
	)

	for _, exercise := range request.Exercises {
		exerciseInputs = append(
			exerciseInputs,
			services.WorkoutExerciseInput{
				ExerciseID:      exercise.ExerciseID,
				Sets:            exercise.Sets,
				Reps:            exercise.Reps,
				Weight:          exercise.Weight,
				DurationSeconds: exercise.DurationSeconds,
				OrderNumber:     exercise.OrderNumber,
			},
		)
	}

	workout, celebration, err := h.workoutService.CreateWorkout(
		r.Context(),
		userID,
		request.Title,
		request.DurationMinutes,
		request.Notes,
		request.IsPublic,
		request.WorkoutDate,
		exerciseInputs,
	)

	if err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusCreated, map[string]interface{}{
		"message":     "entrenamiento registrado correctamente",
		"workout":     workout,
		"celebration": celebration,
	})
}

func (h *WorkoutHandler) GetWorkouts(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	workouts, err := h.workoutService.GetUserWorkouts(userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener los entrenamientos",
		})
		return
	}

	utils.JSON(w, http.StatusOK, workouts)
}

// GetProfileWorkouts: entrenamientos visibles en el perfil de {userID}.
func (h *WorkoutHandler) GetProfileWorkouts(
	w http.ResponseWriter,
	r *http.Request,
) {
	viewerID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || viewerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	workouts, err := h.workoutService.GetProfileWorkouts(
		chi.URLParam(r, "userID"),
		viewerID,
	)

	if errors.Is(err, services.ErrUserNotFound) {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener los entrenamientos",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"workouts": workouts,
	})
}

type setVisibilityRequest struct {
	IsPublic *bool `json:"is_public"`
}

func (h *WorkoutHandler) SetVisibility(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request setVisibilityRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil ||
		request.IsPublic == nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "indica si el entrenamiento es público (is_public)",
		})
		return
	}

	err := h.workoutService.SetVisibility(
		chi.URLParam(r, "workoutID"),
		userID,
		*request.IsPublic,
	)

	if errors.Is(err, services.ErrWorkoutNotFound) {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible cambiar la visibilidad",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"is_public": *request.IsPublic,
	})
}

type renameWorkoutRequest struct {
	Title string `json:"title"`
}

// RenameWorkout: PATCH /workouts/{workoutID}. Solo el dueño puede renombrarlo.
func (h *WorkoutHandler) RenameWorkout(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request renameWorkoutRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	title, err := h.workoutService.Rename(
		chi.URLParam(r, "workoutID"),
		userID,
		request.Title,
	)

	if errors.Is(err, services.ErrWorkoutNotFound) {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{
		"title": title,
	})
}

// GetWorkoutDetail: GET /workouts/{workoutID}.
func (h *WorkoutHandler) GetWorkoutDetail(
	w http.ResponseWriter,
	r *http.Request,
) {
	viewerID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || viewerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	workout, isOwner, err := h.workoutService.GetWorkoutDetail(
		chi.URLParam(r, "workoutID"),
		viewerID,
	)

	if errors.Is(err, services.ErrWorkoutNotFound) {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener el entrenamiento",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"workout":  workout,
		"is_owner": isOwner,
	})
}

// GetStats: estadísticas de todos los entrenamientos del usuario autenticado.
func (h *WorkoutHandler) GetStats(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	stats, err := h.workoutService.GetStats(userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener las estadísticas",
		})
		return
	}

	utils.JSON(w, http.StatusOK, stats)
}
