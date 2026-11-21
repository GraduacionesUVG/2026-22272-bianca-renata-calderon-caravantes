package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type FollowHandler struct {
	followService *services.FollowService
}

func NewFollowHandler(followService *services.FollowService) *FollowHandler {
	return &FollowHandler{
		followService: followService,
	}
}

// writeFollowError traduce los errores del servicio a códigos HTTP.
func writeFollowError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrUserNotFound):
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
	case errors.Is(err, services.ErrCannotFollowSelf):
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	default:
		utils.JSON(w, http.StatusInternalServerError, map[string]string{
			"error": "no fue posible completar la operación",
		})
	}
}

func (h *FollowHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	viewerID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || viewerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	profile, err := h.followService.GetPublicProfile(
		chi.URLParam(r, "userID"),
		viewerID,
	)
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, profile)
}

func (h *FollowHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || followerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	profile, err := h.followService.Follow(
		followerID,
		chi.URLParam(r, "userID"),
	)
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "ahora sigues a este usuario",
		"profile": profile,
	})
}

func (h *FollowHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || followerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	profile, err := h.followService.Unfollow(
		followerID,
		chi.URLParam(r, "userID"),
	)
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "dejaste de seguir a este usuario",
		"profile": profile,
	})
}

func (h *FollowHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	viewerID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || viewerID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	users, err := h.followService.SearchUsers(
		r.URL.Query().Get("q"),
		viewerID,
	)
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}

func (h *FollowHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	users, err := h.followService.GetFollowers(chi.URLParam(r, "userID"))
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}

func (h *FollowHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	users, err := h.followService.GetFollowing(chi.URLParam(r, "userID"))
	if err != nil {
		writeFollowError(w, err)
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}
