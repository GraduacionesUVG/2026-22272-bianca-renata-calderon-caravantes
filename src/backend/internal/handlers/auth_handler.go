package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/biancacalderon/gymify/backend/internal/services"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

type registerRequest struct {
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var request registerRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	user, err := h.authService.Register(
		request.Username,
		request.FullName,
		request.Email,
		request.Password,
	)

	if errors.Is(err, repository.ErrUsernameTaken) ||
		errors.Is(err, repository.ErrEmailTaken) {
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

	utils.JSON(w, http.StatusCreated, map[string]interface{}{
		"message": "usuario registrado correctamente",
		"user":    user,
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var request loginRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	token, user, err := h.authService.Login(
		request.Email,
		request.Password,
	)

	if err != nil {
		utils.JSON(w, http.StatusUnauthorized, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]interface{}{
		"message": "inicio de sesión correcto",
		"token":   token,
		"user":    user,
	})
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

func (h *AuthHandler) ForgotPassword(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request forgotPasswordRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	if err := h.authService.ForgotPassword(request.Email); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{
		"message": "si existe una cuenta asociada a ese correo, te enviamos un código de recuperación",
	})
}

// PasswordResetDisabled responde a los endpoints de recuperación cuando
// PASSWORD_RESET_ENABLED=false.
func PasswordResetDisabled(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusServiceUnavailable, map[string]string{
		"error": "la recuperación de contraseña no está disponible durante el piloto; contacta a la responsable del piloto para restablecerla",
	})
}

type resetPasswordRequest struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) ResetPassword(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request resetPasswordRequest

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": "JSON inválido",
		})
		return
	}

	if err := h.authService.ResetPassword(
		request.Email,
		request.Code,
		request.NewPassword,
	); err != nil {
		utils.JSON(w, http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
		return
	}

	utils.JSON(w, http.StatusOK, map[string]string{
		"message": "contraseña actualizada correctamente",
	})
}
