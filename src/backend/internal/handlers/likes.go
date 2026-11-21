package handlers

import (
	"errors"
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
	"github.com/go-chi/chi/v5"
)

type LikeHandler struct {
	likeService *services.LikeService
}

func NewLikeHandler(likeService *services.LikeService) *LikeHandler {
	return &LikeHandler{
		likeService: likeService,
	}
}

func (h *LikeHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	postID := chi.URLParam(r, "postID")

	if postID == "" {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "publicación inválida",
		})
		return
	}

	if err := h.likeService.LikePost(postID, userID); err != nil {
		if errors.Is(err, services.ErrPostNotFound) {
			utils.JSON(w, http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
			return
		}

		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error":  "no fue posible dar like",
			"detail": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "like agregado",
		"liked":   true,
	})
}

func (h *LikeHandler) UnlikePost(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().
		Value(custommiddleware.UserIDKey).(string)

	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	postID := chi.URLParam(r, "postID")

	if postID == "" {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "publicación inválida",
		})
		return
	}

	if err := h.likeService.UnlikePost(postID, userID); err != nil {
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible quitar el like",
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "like eliminado",
		"liked":   false,
	})
}
