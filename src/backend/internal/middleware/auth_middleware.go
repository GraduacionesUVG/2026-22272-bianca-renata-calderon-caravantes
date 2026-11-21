package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/biancacalderon/gymify/backend/internal/utils"
)

type contextKey string

const UserIDKey contextKey = "userID"

func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")

			if authHeader == "" {
				utils.JSON(w, http.StatusUnauthorized, map[string]string{
					"error": "token requerido",
				})
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)

			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.JSON(w, http.StatusUnauthorized, map[string]string{
					"error": "formato de token inválido",
				})
				return
			}

			claims, err := utils.ValidateToken(parts[1], secret)
			if err != nil {
				utils.JSON(w, http.StatusUnauthorized, map[string]string{
					"error": "token inválido o expirado",
				})
				return
			}

			// Sesión deslizante: si el token tiene más de un día, enviamos uno
			// nuevo para que la sesión no expire mientras se use la app.
			if claims.IssuedAt == nil || time.Since(claims.IssuedAt.Time) > utils.TokenRefreshAfter {
				if refreshed, err := utils.GenerateToken(claims.Subject, secret); err == nil {
					w.Header().Set(utils.RefreshedTokenHeader, refreshed)
				}
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.Subject)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
