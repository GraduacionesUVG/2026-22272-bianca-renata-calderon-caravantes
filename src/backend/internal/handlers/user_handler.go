package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	custommiddleware "github.com/biancacalderon/gymify/backend/internal/middleware"
	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

type updateProfileRequest struct {
	Username       string  `json:"username"`
	FullName       string  `json:"full_name"`
	Bio            *string `json:"bio"`
	ProfilePicture *string `json:"profile_picture"`
}

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	user, err := h.userService.GetProfile(userID)
	if err != nil {
		utils.JSON(w, http.StatusNotFound, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, user)
}

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request updateProfileRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	user, err := h.userService.UpdateProfile(
		userID,
		request.Username,
		request.FullName,
		request.Bio,
		request.ProfilePicture,
	)

	if errors.Is(err, repository.ErrUsernameTaken) {
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

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "perfil actualizado correctamente",
		"user":    user,
	})
}

type updateSettingsRequest struct {
	WeightKg            *float64 `json:"weight_kg"`
	CelebrationsEnabled *bool    `json:"celebrations_enabled"`
}

// UpdateSettings: PATCH /users/settings. Solo cambia los campos enviados.
func (h *UserHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(custommiddleware.UserIDKey).(string)
	if !ok || userID == "" {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": "usuario no autenticado",
		})
		return
	}

	var request updateSettingsRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	user, err := h.userService.UpdateSettings(
		userID,
		request.WeightKg,
		request.CelebrationsEnabled,
	)
	if err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, user)
}
