package handlers

import (
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type RankingHandler struct {
	rankingService *services.RankingService
}

func NewRankingHandler(
	rankingService *services.RankingService,
) *RankingHandler {
	return &RankingHandler{
		rankingService: rankingService,
	}
}

func (h *RankingHandler) GetRanking(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(
			w,
			http.StatusUnauthorized,
			map[string]string{"error": "usuario no autenticado"},
		)
		return
	}

	ranking, err := h.rankingService.GetRanking(userID)
	if err != nil {
		utils.JSON(
			w,
			http.StatusInternalServerError,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(w, http.StatusOK, ranking)
}
