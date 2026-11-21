package middleware

import (
	"net/http"

	"github.com/biancacalderon/gymify/backend/internal/repository"
	"github.com/biancacalderon/gymify/backend/internal/utils"
)

// RequireRole verifica en la BD que el usuario autenticado tenga uno de los
// roles permitidos. Debe usarse después de AuthMiddleware.
func RequireRole(
	userRepository *repository.UserRepository,
	allowedRoles ...string,
) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(UserIDKey).(string)
			if !ok || userID == "" {
				utils.JSON(w, http.StatusUnauthorized, map[string]string{
					"error": "usuario no autenticado",
				})
				return
			}

			user, err := userRepository.FindByID(userID)
			if err != nil {
				utils.JSON(w, http.StatusInternalServerError, map[string]string{
					"error": "no fue posible verificar los permisos",
				})
				return
			}

			if user == nil {
				utils.JSON(w, http.StatusUnauthorized, map[string]string{
					"error": "usuario no encontrado",
				})
				return
			}

			for _, role := range allowedRoles {
				if user.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			utils.JSON(w, http.StatusForbidden, map[string]string{
				"error": "no tienes permisos para realizar esta acción",
			})
		})
	}
}
