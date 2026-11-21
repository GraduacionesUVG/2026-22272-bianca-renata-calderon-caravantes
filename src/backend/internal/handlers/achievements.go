package handlers

import (
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
	"github.com/go-chi/chi/v5"
)

type AchievementHandler struct {
	achievementService *services.AchievementService
}

func NewAchievementHandler(
	achievementService *services.AchievementService,
) *AchievementHandler {
	return &AchievementHandler{
		achievementService: achievementService,
	}
}

func (h *AchievementHandler) GetUserAchievements(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuario no autenticado",
			},
		)
		return
	}

	achievements, err :=
		h.achievementService.GetUserAchievements(
			userID,
		)

	if err != nil {
		utils.JSON(
			w,
			http.StatusInternalServerError,
			map[string]string{
				"error": "no fue posible obtener los logros",
			},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusOK,
		achievements,
	)
}

func (h *AchievementHandler) ShareAchievement(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{
				"error": "usuario no autenticado",
			},
		)
		return
	}

	achievementID := chi.URLParam(r, "achievementID")

	if achievementID == "" {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": "achievement inválido",
			},
		)
		return
	}

	post, err :=
		h.achievementService.ShareAchievement(
			userID,
			achievementID,
		)

	if err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{
				"error": err.Error(),
			},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusCreated,
		map[string]interface{}{
			"message": "logro compartido correctamente",
			"post":    post,
		},
	)
}
