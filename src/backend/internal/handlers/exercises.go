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

type ExerciseHandler struct {
	exerciseService *services.ExerciseService
}

func NewExerciseHandler(
	exerciseService *services.ExerciseService,
) *ExerciseHandler {
	return &ExerciseHandler{
		exerciseService: exerciseService,
	}
}

// GetExercises devuelve el catálogo más los ejercicios propios del usuario.
func (h *ExerciseHandler) GetExercises(
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

	exercises, err := h.exerciseService.GetExercises(userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener los ejercicios",
		})
		return
	}

	utils.JSON(w, http.StatusOK, exercises)
}

type createExerciseRequest struct {
	Name        string `json:"name"`
	MuscleGroup string `json:"muscle_group"`
}

func (h *ExerciseHandler) CreateExercise(
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

	var request createExerciseRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	exercise, err := h.exerciseService.CreateCustomExercise(
		userID,
		request.Name,
		request.MuscleGroup,
	)

	if errors.Is(err, services.ErrExerciseDuplicate) {
		utils.JSON(w, http.StatusConflict, map[string]string{
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

	utils.JSON(w, http.StatusCreated, exercise)
}

// DeleteExercise quita un ejercicio propio de la lista; los entrenamientos
// que ya lo usan lo conservan.
func (h *ExerciseHandler) DeleteExercise(
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

	err := h.exerciseService.DeleteCustomExercise(
		chi.URLParam(r, "exerciseID"),
		userID,
	)

	if errors.Is(err, services.ErrExerciseNotFound) {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible quitar el ejercicio",
		})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
