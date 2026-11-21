package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenTTL es cuánto dura una sesión sin usar la app. Mientras se use, el
// middleware de auth renueva el token (ver TokenRefreshAfter).
const TokenTTL = 30 * 24 * time.Hour

// TokenRefreshAfter es la antigüedad a partir de la cual el middleware
// devuelve un token nuevo en la cabecera RefreshedTokenHeader.
const TokenRefreshAfter = 24 * time.Hour

const RefreshedTokenHeader = "X-Refreshed-Token"

func GenerateToken(subject string, secret string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   subject,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenTTL)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenString string, secret string) (*jwt.RegisteredClaims, error) {
	claims := &jwt.RegisteredClaims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		},
	)

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}
