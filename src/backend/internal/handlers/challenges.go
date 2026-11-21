package handlers

import (
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
	"github.com/go-chi/chi/v5"
)

type ChallengeHandler struct {
	challengeService *services.ChallengeService
}

func NewChallengeHandler(
	challengeService *services.ChallengeService,
) *ChallengeHandler {
	return &ChallengeHandler{
		challengeService: challengeService,
	}
}

func (h *ChallengeHandler) GetChallenges(
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

	challenges, err := h.challengeService.GetChallenges(userID)
	if err != nil {
		utils.JSON(
			w,
			http.StatusInternalServerError,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(w, http.StatusOK, challenges)
}

func (h *ChallengeHandler) JoinChallenge(
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

	challengeID := chi.URLParam(r, "challengeID")

	if err := h.challengeService.JoinChallenge(
		challengeID,
		userID,
	); err != nil {
		utils.JSON(
			w,
			http.StatusBadRequest,
			map[string]string{"error": err.Error()},
		)
		return
	}

	utils.JSON(
		w,
		http.StatusOK,
		map[string]interface{}{
			"message":      "te uniste al reto correctamente",
			"challenge_id": challengeID,
			"joined":       true,
		},
	)
}
