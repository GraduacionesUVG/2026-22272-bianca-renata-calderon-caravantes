package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type StreakHandler struct {
	streakService *services.StreakService
}

func NewStreakHandler(streakService *services.StreakService) *StreakHandler {
	return &StreakHandler{
		streakService: streakService,
	}
}

type setWeeklyGoalRequest struct {
	WeeklyGoal int `json:"weekly_goal"`
}

func (h *StreakHandler) GetStreak(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	status, err := h.streakService.GetStatus(r.Context(), userID)
	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible obtener la racha",
		})
		return
	}

	utils.JSON(w, http.StatusOK, status)
}

func (h *StreakHandler) SetWeeklyGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request setWeeklyGoalRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	status, err := h.streakService.SetWeeklyGoal(r.Context(), userID, request.WeeklyGoal)
	if errors.Is(err, services.ErrInvalidWeeklyGoal) {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	if err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible guardar la meta semanal",
		})
		return
	}

	utils.JSON(w, http.StatusOK, status)
}
